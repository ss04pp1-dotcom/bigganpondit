// Database entry point.
// Production: Cloudflare D1 binding (DB) via @opennextjs/cloudflare context.
// Local dev: SQLite behind the same D1 API (see ./local.ts).
// On first access the schema is applied and the secure seed runs
// (idempotent), so both environments converge to the same state.

import { getCloudflareEnv, localEnv, type CloudflareEnv } from "@/lib/cloudflare";
import { getLocalD1 } from "./local";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";
import type { D1Database } from "./types";

const g = globalThis as unknown as {
  __academyDb?: D1Database;
  __academyInit?: Promise<D1Database>;
};

/**
 * Single-flight database access. The init promise is assigned synchronously,
 * so concurrent requests always share ONE bootstrap run (no races).
 */
export function getDb(): Promise<D1Database> {
  if (!g.__academyInit) {
    g.__academyInit = (async () => {
      const cf = await getCloudflareEnv();
      let db: D1Database;
      if (cf?.DB) {
        db = cf.DB as unknown as D1Database;
      } else {
        try {
          db = await getLocalD1();
        } catch {
          console.error("Neither Cloudflare D1 nor local SQLite is available.");
          db = {
            prepare: () => ({
              bind: () => ({
                first: async () => null,
                all: async () => ({ results: [], success: true, meta: {} }),
                run: async () => ({ success: true, meta: {} }),
              }),
              first: async () => null,
              all: async () => ({ results: [], success: true, meta: {} }),
              run: async () => ({ success: true, meta: {} }),
            }),
            batch: async () => [],
            exec: async () => ({ count: 0, duration: 0 }),
            dump: async () => new ArrayBuffer(0),
          } as unknown as D1Database;
        }
      }
      g.__academyDb = db;
      try {
        await bootstrap(db, cf);
      } catch (e) {
        console.error("Database bootstrap warning:", e);
      }
      return db;
    })();
  }
  return g.__academyInit;
}

async function bootstrap(db: D1Database, cf: CloudflareEnv | null): Promise<void> {
  try {
    // 1) apply schema (idempotent, same SQL as db/migrations/0001_init.sql)
    await db.exec(SCHEMA_SQL);
  } catch (err) {
    console.warn("Schema execution notice:", err);
  }

  // Ensure new student profile columns exist in existing databases
  const newCols = [
    "father_name TEXT",
    "mother_name TEXT",
    "school_name TEXT",
    "phone TEXT",
    "address TEXT",
    "blood_group TEXT",
    "dob TEXT",
  ];
  for (const col of newCols) {
    try {
      await db.exec(`ALTER TABLE students ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }
  try {
    // 2) seed (idempotent); initial admin comes from environment variables
    const env = cf ?? localEnv();
    await seedDatabase(db, {
      adminUsername: String(env.ADMIN_USERNAME ?? "admin"),
      adminPassword: String(env.ADMIN_PASSWORD ?? "admin123"),
    });
  } catch (err) {
    console.warn("Seed execution notice:", err);
  }
}

// ---- small helpers used across the app ----
export async function getSetting(key: string, fallback = ""): Promise<string> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string | null }>()
    .catch(() => null);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    )
    .bind(key, value)
    .run();
}
