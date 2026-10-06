// R2-compatible file storage.
// Production: Cloudflare R2 binding (BUCKET).
// Local dev: filesystem under .storage/r2/ with identical API.
// Only R2 object keys are stored in D1 — never binary data.

import path from "node:path";
import fs from "node:fs";
import { getCloudflareEnv } from "@/lib/cloudflare";

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

const g = globalThis as unknown as { __academyBucket?: StorageBucket };

// ---------------- local filesystem implementation ----------------
const LOCAL_ROOT = path.join(process.cwd(), ".storage", "r2");

class LocalBucket implements StorageBucket {
  private safePath(key: string): string {
    const p = path.normalize(path.join(LOCAL_ROOT, key));
    if (!p.startsWith(LOCAL_ROOT)) throw new Error("Invalid storage key");
    return p;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const p = this.safePath(key);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, data);
  }

  async get(key: string): Promise<StoredObject | null> {
    const p = this.safePath(key);
    try {
      const buf = fs.readFileSync(p);
      return { key, data: new Uint8Array(buf), size: buf.length };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const p = this.safePath(key);
    try {
      fs.unlinkSync(p);
    } catch {
      /* already gone */
    }
  }
}

// ---------------- entry ----------------
export async function getBucket(): Promise<StorageBucket> {
  if (g.__academyBucket) return g.__academyBucket;
  const cf = await getCloudflareEnv();
  if (cf?.BUCKET) {
    const raw = cf.BUCKET as unknown as R2BucketLike;
    g.__academyBucket = {
      async put(key, data) {
        await raw.put(key, data);
      },
      async get(key) {
        const obj = await raw.get(key);
        if (!obj) return null;
        const buf = new Uint8Array(await obj.arrayBuffer());
        return { key, data: buf, size: buf.length };
      },
      async delete(key) {
        await raw.delete(key);
      },
    };
  } else {
    g.__academyBucket = new LocalBucket();
  }
  return g.__academyBucket;
}
