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

  // Ensure teacher photo_key column exists in existing databases
  try {
    await db.exec("ALTER TABLE teachers ADD COLUMN photo_key TEXT;");
  } catch {
    // Column already exists
  }

  // Ensure storage_files table exists for fallback file persistence
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS storage_files (key TEXT PRIMARY KEY, data TEXT, updated_at TEXT);");
  } catch {
    // Already exists
  }

  // Ensure WebAuthn biometric tables exist
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL UNIQUE,
        public_key    TEXT NOT NULL,
        counter       INTEGER NOT NULL DEFAULT 0,
        device_name   TEXT NOT NULL DEFAULT 'Fingerprint / Biometric Device',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS webauthn_challenges (
        id         TEXT PRIMARY KEY,
        challenge  TEXT NOT NULL,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_webauthn_cred_user ON webauthn_credentials(user_id);
    `);
  } catch {
    // Already exists
  }

  // Ensure student_requests table exists for teacher submission & admin approval flow
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS student_requests (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id    INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        name          TEXT NOT NULL,
        class_id      INTEGER NOT NULL REFERENCES classes(id),
        division      TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
        section       TEXT,
        roll          INTEGER NOT NULL CHECK (roll > 0),
        username      TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        photo_key     TEXT,
        father_name   TEXT,
        mother_name   TEXT,
        school_name   TEXT,
        phone         TEXT,
        address       TEXT,
        blood_group   TEXT,
        dob           TEXT,
        status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
        admin_notes   TEXT,
        reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at   TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_student_req_status ON student_requests(status);
      CREATE INDEX IF NOT EXISTS idx_student_req_teacher ON student_requests(teacher_id);
    `);
  } catch {
    // Already exists
  }
  // Ensure password_resets table exists for Resend email recovery
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_hash    TEXT NOT NULL,
        email       TEXT NOT NULL,
        expires_at  TEXT NOT NULL,
        used        INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_resets(user_id);
      CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires ON password_resets(expires_at);
    `);
  } catch {
    // Already exists
  }

  // Ensure password_change_requests table exists for Teacher/Student request -> Admin approval workflow
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS password_change_requests (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name         TEXT NOT NULL,
        user_role         TEXT NOT NULL,
        username          TEXT NOT NULL,
        new_password_hash TEXT NOT NULL,
        reason            TEXT,
        status            TEXT NOT NULL DEFAULT 'PENDING',
        admin_notes       TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        reviewed_at       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pwd_change_user ON password_change_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_pwd_change_status ON password_change_requests(status);
    `);
  } catch {
    // Already exists
  }

  // Directors, Notices, Notebooks, Attendance tables & student privacy column
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS directors (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        institution     TEXT,
        photo_key       TEXT,
        signature_key   TEXT,
        remarks         TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notices (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        title           TEXT NOT NULL,
        content         TEXT NOT NULL,
        author_id       INTEGER NOT NULL REFERENCES users(id),
        author_name     TEXT NOT NULL,
        author_role     TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'APPROVED',
        is_ticker       INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        approved_at     TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);

      CREATE TABLE IF NOT EXISTS notebooks (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        title           TEXT NOT NULL,
        class_id        INTEGER REFERENCES classes(id),
        subject_id      INTEGER REFERENCES subjects(id),
        file_key        TEXT NOT NULL,
        file_name       TEXT NOT NULL,
        file_size       INTEGER,
        uploaded_by     INTEGER NOT NULL REFERENCES users(id),
        uploader_name   TEXT NOT NULL,
        description     TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id        INTEGER NOT NULL REFERENCES classes(id),
        date            TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'PRESENT',
        remarks         TEXT,
        recorded_by     INTEGER NOT NULL REFERENCES users(id),
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(student_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
      CREATE INDEX IF NOT EXISTS idx_att_class_date ON attendance(class_id, date);
    `);
  } catch {
    // Already exists
  }

  try {
    await db.exec(`ALTER TABLE students ADD COLUMN hide_photo_from_students INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
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
