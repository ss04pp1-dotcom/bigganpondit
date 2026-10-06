// R2-compatible file storage.
// Production: Cloudflare R2 binding (BUCKET).
// Local dev: filesystem under .storage/r2/ with identical API.
// Only R2 object keys are stored in D1 — never binary data.

import path from "node:path";
import fs from "node:fs";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";

export interface StoredObject {
  key: string;
  data: Uint8Array;
  size: number;
}

export interface StorageBucket {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

// Minimal structural type matching the parts of R2Bucket we use.
interface R2BucketLike {
  put(key: string, value: ArrayBuffer | ReadableStream | Uint8Array, options?: unknown): Promise<unknown>;
  get(key: string): Promise<{
    key: string;
    size: number;
    body: ReadableStream<Uint8Array>;
    arrayBuffer(): Promise<ArrayBuffer>;
  } | null>;
  delete(key: string): Promise<void>;
}

const g = globalThis as unknown as {
  __academyBucket?: StorageBucket;
  __academyMemoryStore?: Map<string, Uint8Array>;
};

if (!g.__academyMemoryStore) {
  g.__academyMemoryStore = new Map<string, Uint8Array>();
}

// ---------------- local filesystem helper ----------------
const LOCAL_ROOT = path.resolve(process.cwd(), ".storage", "r2");

function localSafePath(key: string): string {
  const p = path.resolve(LOCAL_ROOT, key);
  const rootWithSep = LOCAL_ROOT.endsWith(path.sep) ? LOCAL_ROOT : LOCAL_ROOT + path.sep;
  if (p !== LOCAL_ROOT && !p.startsWith(rootWithSep)) throw new Error("Invalid storage key");
  return p;
}

async function saveToD1(key: string, data: Uint8Array): Promise<void> {
  try {
    const db = await getDb();
    await db.exec("CREATE TABLE IF NOT EXISTS storage_files (key TEXT PRIMARY KEY, data TEXT, updated_at TEXT);");
    const base64 = Buffer.from(data).toString("base64");
    await db
      .prepare("INSERT OR REPLACE INTO storage_files (key, data, updated_at) VALUES (?, ?, datetime('now'))")
      .bind(key, base64)
      .run();
  } catch (err) {
    console.warn("Storage fallback save to D1 notice:", err);
  }
}

async function getFromD1(key: string): Promise<StoredObject | null> {
  try {
    const db = await getDb();
    const row = await db
      .prepare("SELECT data FROM storage_files WHERE key = ?")
      .bind(key)
      .first<{ data: string }>(undefined as never)
      .catch(() => null);
    if (row?.data) {
      const buf = Buffer.from(row.data, "base64");
      const u8 = new Uint8Array(buf);
      return { key, data: u8, size: u8.length };
    }
  } catch {
    // table or row doesn't exist
  }
  return null;
}

async function deleteFromD1(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.prepare("DELETE FROM storage_files WHERE key = ?").bind(key).run();
  } catch {
    // ignore
  }
}

// ---------------- entry ----------------
export async function getBucket(): Promise<StorageBucket> {
  if (g.__academyBucket) return g.__academyBucket;
  const cf = await getCloudflareEnv();
  const raw = (cf?.BUCKET as unknown as R2BucketLike) || null;
  const mem = g.__academyMemoryStore!;

  g.__academyBucket = {
    async put(key: string, data: Uint8Array): Promise<void> {
      mem.set(key, data);

      let r2Success = false;
      if (raw) {
        try {
          await raw.put(key, data);
          r2Success = true;
        } catch (err) {
          console.warn("Cloudflare R2 put failed, will use D1 storage fallback:", err);
        }
      }

      // Always save to D1 fallback to guarantee persistent availability across workers
      if (!r2Success) {
        await saveToD1(key, data);
      }

      // Local disk for local dev (if filesystem writable)
      try {
        const p = localSafePath(key);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, data);
      } catch {
        // Read-only filesystem in cloudflare worker, ignore
      }
    },

    async get(key: string): Promise<StoredObject | null> {
      // 1) Try Cloudflare R2
      if (raw) {
        try {
          const obj = await raw.get(key);
          if (obj) {
            const buf = new Uint8Array(await obj.arrayBuffer());
            mem.set(key, buf);
            return { key, data: buf, size: buf.length };
          }
        } catch (err) {
          console.warn("Cloudflare R2 get error, checking D1 storage fallback:", err);
        }
      }

      // 2) Try in-memory store
      const inMem = mem.get(key);
      if (inMem) return { key, data: inMem, size: inMem.length };

      // 3) Try D1 database storage
      const fromD1 = await getFromD1(key);
      if (fromD1) {
        mem.set(key, fromD1.data);
        return fromD1;
      }

      // 4) Try local filesystem
      try {
        const p = localSafePath(key);
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const u8 = new Uint8Array(buf);
          mem.set(key, u8);
          return { key, data: u8, size: u8.length };
        }
      } catch {
        // Ignore
      }

      return null;
    },

    async delete(key: string): Promise<void> {
      if (raw) {
        try {
          await raw.delete(key);
        } catch {
          // ignore
        }
      }
      mem.delete(key);
      await deleteFromD1(key);
      try {
        const p = localSafePath(key);
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    },
  };

  return g.__academyBucket;
}
