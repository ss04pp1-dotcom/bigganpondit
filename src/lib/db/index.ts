// Database entry point.
// Production: Cloudflare D1 binding (DB) via @opennextjs/cloudflare context.
// Local dev: SQLite behind the same D1 API (see ./local.ts).
// On first access the schema is applied and the secure seed runs
// (idempotent), so both environments converge to the same state.

import { getCloudflareEnv, localEnv, isCloudflareWorkersRuntime, type CloudflareEnv } from "@/lib/cloudflare";
import { getLocalD1 } from "./local";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";
import type { D1Database } from "./types";

const g = globalThis as unknown as {
  __academyDb?: D1Database;
  __academyInit?: Promise<D1Database>;
};

/**
 * Run one idempotent schema step. Expected errors on existing databases
 * ("duplicate column name", "already exists", "no such column" for renames)
 * are ignored; ANY other error is logged loudly.
 */
async function execSchemaStep(db: D1Database, sql: string, label: string): Promise<void> {
  try {
    await db.exec(sql);
  } catch (err) {
    const msg = String((err as Error | { message?: string })?.message ?? err);
    if (/duplicate column name|already exists|no such column/i.test(msg)) return;
    console.error(`[bootstrap] ${label} failed (unexpected schema error):`, err);
  }
}

/**
 * Single-flight database access. The init promise is assigned synchronously,
 * so concurrent requests always share ONE bootstrap run (no races).
 */
export function getDb(): Promise<D1Database> {
  if (g.__academyDb) {
    return Promise.resolve(g.__academyDb);
  }

  if (!g.__academyInit) {
    g.__academyInit = (async () => {
      try {
        const cf = await getCloudflareEnv();
        let db: D1Database;

        if (cf?.DB) {
          db = cf.DB as unknown as D1Database;
        } else if (isCloudflareWorkersRuntime() || cf) {
          // Running on Cloudflare Workers but DB binding was not found
          throw new Error(
            "D1 ডেটাবেস বাইন্ডিং পাওয়া যায়নি — wrangler.toml ফাইলে [[d1_databases]] binding = 'DB' এবং database_id সঠিক আছে কিনা নিশ্চিত করুন।"
          );
        } else {
          try {
            db = await getLocalD1();
          } catch (err) {
            throw new Error(`কোনো ডেটাবেস উপলব্ধ নয় (local SQLite চালু করা যায়নি): ${String(err)}`);
          }
        }

        g.__academyDb = db;

        try {
          await bootstrap(db, cf);
        } catch (e) {
          console.error("Database bootstrap warning:", e);
        }

        return db;
      } catch (err) {
        // Clear cached promise on failure so next request can retry and not be permanently poisoned
        g.__academyInit = undefined;
        throw err;
      }
    })();
  }
  return g.__academyInit;
}

async function bootstrap(db: D1Database, cf: CloudflareEnv | null): Promise<void> {
  const isWorkers = !!cf?.DB || isCloudflareWorkersRuntime();

  // FAST PATH: In production on Cloudflare Workers, check if tables already exist.
  // Avoids spamming 50+ D1 ALTER/CREATE subrequests on cold starts (exceeding Workers limits).
  if (isWorkers) {
    const hasUsersTable = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1")
      .first<{ name: string }>()
      .catch(() => null);

    if (hasUsersTable) {
      // Ensure login_attempts table exists in case migration was pending
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS login_attempts (
            key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0,
            window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            locked_until TEXT
          )`
        )
        .run()
        .catch(() => null);

      await db
        .prepare(`CREATE INDEX IF NOT EXISTS idx_login_attempts_window ON login_attempts(window_start)`)
        .run()
        .catch(() => null);

      // Ensure batches table exists
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            division TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
            time_slot TEXT,
            days TEXT,
            max_students INTEGER,
            fee REAL,
            note TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (class_id, name)
          )`
        )
        .run()
        .catch(() => null);

      await db
        .prepare(`CREATE INDEX IF NOT EXISTS idx_batches_class ON batches(class_id)`)
        .run()
        .catch(() => null);

      // Ensure student batch and extended profile columns exist
      const studentColsToAdd = [
        "batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL",
        "batch_name TEXT",
        "hide_photo_from_students INTEGER NOT NULL DEFAULT 0",
        "raw_password TEXT",
        "father_occupation TEXT",
        "mother_occupation TEXT",
        "guardian_name TEXT",
        "guardian_occupation TEXT",
        "guardian_relation TEXT",
      ];
      for (const colDef of studentColsToAdd) {
        await db.prepare(`ALTER TABLE students ADD COLUMN ${colDef}`).run().catch(() => null);
      }

      const reqColsToAdd = [
        "batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL",
        "batch_name TEXT",
        "raw_password TEXT",
        "father_occupation TEXT",
        "mother_occupation TEXT",
        "guardian_name TEXT",
        "guardian_occupation TEXT",
        "guardian_relation TEXT",
      ];
      for (const colDef of reqColsToAdd) {
        await db.prepare(`ALTER TABLE student_requests ADD COLUMN ${colDef}`).run().catch(() => null);
      }

      // Ensure routines table exists
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS routines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            class_name TEXT NOT NULL,
            division TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
            section TEXT,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
            subject_name TEXT NOT NULL,
            teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
            teacher_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            room_no TEXT,
            note TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);

      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_routines_day_class ON routines(day_of_week, class_name)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_routines_teacher ON routines(teacher_id)`).run().catch(() => null);
      await db.prepare("ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'MONTHLY'").run().catch(() => null);
      await db.prepare("ALTER TABLE directors ADD COLUMN updated_at TEXT").run().catch(() => null);

      // Schema is already applied. Check if initial admin needs creation.
      const env = cf ?? localEnv();
      const adminPasswordEnv = env.ADMIN_PASSWORD ? String(env.ADMIN_PASSWORD) : null;
      if (adminPasswordEnv) {
        const hasAdmin = await db
          .prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
          .first<{ id: number }>()
          .catch(() => null);

        if (!hasAdmin) {
          try {
            await seedDatabase(db, {
              adminUsername: String(env.ADMIN_USERNAME ?? "admin"),
              adminPassword: adminPasswordEnv,
              seedDemo: false,
            });
          } catch (e) {
            console.warn("Initial admin seed warning:", e);
          }
        }
      }
      return;
    }
  }

  // SLOW/INIT PATH: Apply full schema if tables do not exist
  // 1) apply schema (idempotent, same SQL as db/migrations/0001_init.sql)
  await execSchemaStep(db, SCHEMA_SQL, "schema");

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
    await execSchemaStep(db, `ALTER TABLE students ADD COLUMN ${col};`, `students.${col.split(" ")[0]}`);
  }

  // Ensure teacher photo_key column exists in existing databases
  await execSchemaStep(db, "ALTER TABLE teachers ADD COLUMN photo_key TEXT;", "teachers.photo_key");

  // Ensure batches table exists
  await execSchemaStep(
    db,
    `CREATE TABLE IF NOT EXISTS batches (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      class_id     INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      division     TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
      time_slot    TEXT,
      days         TEXT,
      room_no      TEXT,
      max_students INTEGER DEFAULT 0,
      is_active    INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (class_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_batches_class ON batches(class_id);`,
    "batches table"
  );

  // Ensure student batch columns exist
  await execSchemaStep(db, "ALTER TABLE students ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;", "students.batch_id");
  await execSchemaStep(db, "ALTER TABLE students ADD COLUMN batch_name TEXT;", "students.batch_name");
  await execSchemaStep(db, "ALTER TABLE student_requests ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;", "student_requests.batch_id");
  await execSchemaStep(db, "ALTER TABLE student_requests ADD COLUMN batch_name TEXT;", "student_requests.batch_name");

  // Ensure exams exam_type column exists in existing databases
  await execSchemaStep(db, "ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'MONTHLY';", "exams.exam_type");

  // Ensure exams is_published column exists (0 = draft/unpublished, 1 = published by admin)
  await execSchemaStep(db, "ALTER TABLE exams ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0;", "exams.is_published");

  // Ensure composite performance indexes exist
  await execSchemaStep(
    db,
    `
      CREATE INDEX IF NOT EXISTS idx_marks_student_exam ON marks(student_id, exam_id);
      CREATE INDEX IF NOT EXISTS idx_exams_class_month_year ON exams(class_id, month, year);
    `,
    "performance indexes"
  );

  // Ensure storage_files table exists for fallback file persistence
  await execSchemaStep(
    db,
    "CREATE TABLE IF NOT EXISTS storage_files (key TEXT PRIMARY KEY, data TEXT, updated_at TEXT);",
    "storage_files"
  );

  // D1 chunked-blob fallback (canonical column name: chunk_index — matches
  // migration 0010). Legacy bootstrap-created tables used chunk_idx; converge
  // them so backup/restore and the storage layer agree on one shape.
  await execSchemaStep(
    db,
    `CREATE TABLE IF NOT EXISTS storage_chunks (
      key         TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      data        TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, chunk_index)
    );
    CREATE INDEX IF NOT EXISTS idx_storage_chunks_key ON storage_chunks(key);`,
    "storage_chunks"
  );
  await execSchemaStep(
    db,
    "ALTER TABLE storage_chunks RENAME COLUMN chunk_idx TO chunk_index;",
    "storage_chunks rename legacy column"
  );

  // Durable rate limiting (login brute-force + OTP attempt caps)
  await execSchemaStep(
    db,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      key          TEXT PRIMARY KEY,
      count        INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL DEFAULT (datetime('now')),
      locked_until TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_window ON login_attempts(window_start);`,
    "login_attempts"
  );

  // Ensure WebAuthn biometric tables exist
  await execSchemaStep(
    db,
    `
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
    `,
    "webauthn tables"
  );

  // Ensure student_requests table exists for teacher submission & admin approval flow
  await execSchemaStep(
    db,
    `
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
    `,
    "student_requests"
  );
  // Ensure password_resets table exists for Resend email recovery
  await execSchemaStep(
    db,
    `
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
    `,
    "password_resets"
  );

  // Ensure password_change_requests table exists for Teacher/Student request -> Admin approval workflow
  await execSchemaStep(
    db,
    `
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
    `,
    "password_change_requests"
  );

  // Directors table
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS directors (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        institution     TEXT,
        photo_key       TEXT,
        signature_key   TEXT,
        remarks         TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT
      );
    `,
    "directors"
  );

  // Notices table
  await execSchemaStep(
    db,
    `
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
    `,
    "notices"
  );

  // Notebooks table
  await execSchemaStep(
    db,
    `
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
    `,
    "notebooks"
  );

  // Attendance table
  await execSchemaStep(
    db,
    `
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
    `,
    "attendance"
  );

  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN hide_photo_from_students INTEGER NOT NULL DEFAULT 0;`, "students.hide_photo_from_students");

  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN raw_password TEXT;`, "students.raw_password");

  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN raw_password TEXT;`, "student_requests.raw_password");

  // SECURITY FIX: no cold-start backfill of raw_password with a default value.
  // If a student's password was set through a flow that does not mirror it
  // (OTP reset / admin-approved change), the admin reveal endpoint must NOT
  // display a fabricated password — it returns "not available" instead.

  await execSchemaStep(db, `ALTER TABLE notebooks ADD COLUMN download_allowed INTEGER NOT NULL DEFAULT 0;`, "notebooks.download_allowed");

  // Parent & Guardian occupation and relationship columns
  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN father_occupation TEXT;`, "students.father_occupation");
  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN mother_occupation TEXT;`, "students.mother_occupation");
  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN guardian_name TEXT;`, "students.guardian_name");
  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN guardian_occupation TEXT;`, "students.guardian_occupation");
  await execSchemaStep(db, `ALTER TABLE students ADD COLUMN guardian_relation TEXT;`, "students.guardian_relation");

  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN father_occupation TEXT;`, "student_requests.father_occupation");
  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN mother_occupation TEXT;`, "student_requests.mother_occupation");
  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN guardian_name TEXT;`, "student_requests.guardian_name");
  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN guardian_occupation TEXT;`, "student_requests.guardian_occupation");
  await execSchemaStep(db, `ALTER TABLE student_requests ADD COLUMN guardian_relation TEXT;`, "student_requests.guardian_relation");

  await execSchemaStep(db, `ALTER TABLE directors ADD COLUMN updated_at TEXT;`, "directors.updated_at");

  // Routines table (Weekly & Daily Class Routine Schedule)
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS routines (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        class_name   TEXT NOT NULL,
        division     TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
        section      TEXT,
        subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        subject_name TEXT NOT NULL,
        teacher_id   INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        teacher_name TEXT NOT NULL,
        period       TEXT,
        start_time   TEXT NOT NULL,
        end_time     TEXT NOT NULL,
        room_no      TEXT,
        note         TEXT,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_routines_day_class ON routines(day_of_week, class_name);
      CREATE INDEX IF NOT EXISTS idx_routines_teacher ON routines(teacher_id);
    `,
    "routines"
  );
  await execSchemaStep(db, `ALTER TABLE routines ADD COLUMN period TEXT;`, "routines.period");

  try {
    // 2) seed (idempotent); initial admin comes from environment variables.
    // Demo teachers/students/exams are opt-in via SEED_DEMO_DATA=1 (local dev
    // only) — production databases must never receive known-credential accounts.
    const env = cf ?? localEnv();
    const isWorkers = !!cf;
    const adminPasswordEnv = env.ADMIN_PASSWORD ? String(env.ADMIN_PASSWORD) : null;
    if (isWorkers && !adminPasswordEnv) {
      // SECURITY: in Workers, no ADMIN_PASSWORD secret means NO initial admin
      // (never the documented default admin/admin123).
      console.error(
        "[seed] ADMIN_PASSWORD secret is not set — skipping initial admin creation. " +
          "Set it with `wrangler secret put ADMIN_PASSWORD` (and ADMIN_USERNAME if customized), then reload."
      );
    }
    await seedDatabase(db, {
      adminUsername: String(env.ADMIN_USERNAME ?? "admin"),
      adminPassword: isWorkers ? adminPasswordEnv : (adminPasswordEnv ?? "admin123"),
      seedDemo: String((env as Record<string, unknown>).SEED_DEMO_DATA ?? "") === "1",
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
