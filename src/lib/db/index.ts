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
            room_no TEXT,
            max_students INTEGER DEFAULT 0,
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

      // Ensure classes is_active column exists
      await db.prepare("ALTER TABLE classes ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1").run().catch(() => null);

      // Reconcile existing batches columns
      const batchColsToAdd = [
        "room_no TEXT",
        "max_students INTEGER DEFAULT 0",
        "fee REAL",
        "note TEXT",
        "is_active INTEGER NOT NULL DEFAULT 1",
      ];
      for (const colDef of batchColsToAdd) {
        await db.prepare(`ALTER TABLE batches ADD COLUMN ${colDef}`).run().catch(() => null);
      }

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
            period TEXT,
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

      // Reconcile existing routines columns
      const routineColsToAdd = [
        "period TEXT",
        "room_no TEXT",
        "note TEXT",
        "section TEXT",
        "division TEXT",
        "batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL",
        "batch_name TEXT",
        "is_active INTEGER NOT NULL DEFAULT 1",
      ];
      for (const colDef of routineColsToAdd) {
        await db.prepare(`ALTER TABLE routines ADD COLUMN ${colDef}`).run().catch(() => null);
      }
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_routines_batch ON routines(batch_id)`).run().catch(() => null);

      await db.prepare("ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'MONTHLY'").run().catch(() => null);
      await db.prepare("ALTER TABLE directors ADD COLUMN updated_at TEXT").run().catch(() => null);

      // Ensure student_monthly_comments exists in fast-path
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS student_monthly_comments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
            year        INTEGER NOT NULL,
            mode        TEXT NOT NULL DEFAULT 'MONTHLY',
            comment     TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(student_id, teacher_id, month, year, mode)
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_smc_lookup ON student_monthly_comments(student_id, month, year, mode)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_smc_teacher ON student_monthly_comments(teacher_id)").run().catch(() => null);

      // Ensure routine_daily_topics table exists (teachers setting today's chapter & lesson topic)
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS routine_daily_topics (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            routine_id   INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
            date         TEXT NOT NULL,
            chapter_name TEXT,
            topic_name   TEXT NOT NULL,
            objectives   TEXT,
            teacher_id   INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
            teacher_name TEXT,
            created_at   TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(routine_id, date)
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_rdt_routine_date ON routine_daily_topics(routine_id, date)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_rdt_date ON routine_daily_topics(date)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_rdt_teacher ON routine_daily_topics(teacher_id)").run().catch(() => null);

      // Ensure fee_items, fee_payments, fee_notifications exist in fast-path (Cloudflare Workers)
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS fee_items (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            category        TEXT NOT NULL CHECK (category IN ('MONTHLY_FEE', 'EXAM_FEE', 'ABSENT_FINE', 'FAIL_FINE', 'NOTE_MATERIAL', 'ADMISSION_FEE', 'OTHER_FINE', 'OTHER_FEE')),
            title           TEXT NOT NULL,
            amount          REAL NOT NULL CHECK (amount >= 0),
            paid_amount     REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
            due_amount      REAL NOT NULL CHECK (due_amount >= 0),
            month           INTEGER CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
            year            INTEGER,
            exam_id         INTEGER REFERENCES exams(id) ON DELETE SET NULL,
            subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
            reference_note  TEXT,
            due_date        TEXT,
            status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'WAIVED')),
            created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_items_student ON fee_items(student_id)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_items_status ON fee_items(status)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_items_category ON fee_items(category)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_items_period ON fee_items(year, month)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_items_exam ON fee_items(exam_id)").run().catch(() => null);

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS fee_payments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no      TEXT NOT NULL UNIQUE,
            student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            fee_item_id     INTEGER REFERENCES fee_items(id) ON DELETE SET NULL,
            amount_paid     REAL NOT NULL CHECK (amount_paid > 0),
            discount        REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
            payment_method  TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'OTHER')),
            transaction_id  TEXT,
            receipt_note    TEXT,
            collected_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
            collector_name  TEXT,
            payment_date    TEXT NOT NULL DEFAULT (datetime('now')),
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(invoice_no)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date)").run().catch(() => null);

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS fee_notifications (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            title           TEXT NOT NULL,
            message         TEXT NOT NULL,
            total_due       REAL NOT NULL DEFAULT 0,
            is_read         INTEGER NOT NULL DEFAULT 0,
            sent_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
            type            TEXT NOT NULL DEFAULT 'DUE_REMINDER' CHECK (type IN ('DUE_REMINDER', 'MONTHLY_BILL', 'FINE_ALERT', 'RECEIPT_ALERT')),
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_notifications_student ON fee_notifications(student_id)").run().catch(() => null);
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_fee_notifications_read ON fee_notifications(is_read)").run().catch(() => null);

      // Backfill orphan payments into fee_items so they show up in items & summaries
      await db
        .prepare(
          `INSERT INTO fee_items (
            student_id, category, title, amount, paid_amount, due_amount,
            month, year, status, reference_note, created_by, created_at, updated_at
          )
          SELECT 
            fp.student_id,
            'MONTHLY_FEE',
            COALESCE(fp.receipt_note, 'মাসিক বেতন / ফি পরিশোধ'),
            fp.amount_paid,
            fp.amount_paid,
            0,
            CAST(strftime('%m', fp.payment_date) AS INTEGER),
            CAST(strftime('%Y', fp.payment_date) AS INTEGER),
            'PAID',
            'রসিদ নং: ' || fp.invoice_no,
            fp.collected_by,
            fp.payment_date,
            fp.payment_date
          FROM fee_payments fp
          WHERE fp.fee_item_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM fee_items fi WHERE fi.student_id = fp.student_id AND fi.reference_note = ('রসিদ নং: ' || fp.invoice_no)
          )`
        )
        .run()
        .catch(() => null);

      // Link orphan payments to their created fee_items
      await db
        .prepare(
          `UPDATE fee_payments
           SET fee_item_id = (
             SELECT fi.id FROM fee_items fi
             WHERE fi.student_id = fee_payments.student_id
             AND fi.reference_note = ('রসিদ নং: ' || fee_payments.invoice_no)
             LIMIT 1
           )
           WHERE fee_item_id IS NULL`
        )
        .run()
        .catch(() => null);

      // Ensure push-notification tables exist (migration 0016) — kept here so
      // a deploy without `wrangler d1 migrations apply` still self-heals.
      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS device_tokens (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id     TEXT NOT NULL,
            fcm_token     TEXT NOT NULL,
            platform      TEXT NOT NULL DEFAULT 'android',
            app_version   TEXT,
            active        INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen_at  TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_fcm ON device_tokens(fcm_token)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_device_tokens_user_device ON device_tokens(user_id, device_id, active)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(active, user_id)`).run().catch(() => null);

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS push_notifications (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT NOT NULL,
            body            TEXT NOT NULL,
            deep_link       TEXT,
            image_url       TEXT,
            target_type     TEXT NOT NULL DEFAULT 'ALL'
                            CHECK (target_type IN ('ALL','STUDENTS','TEACHERS','CLASS','USER')),
            target_class_id INTEGER,
            target_user_id  INTEGER,
            kind            TEXT NOT NULL DEFAULT 'MANUAL'
                            CHECK (kind IN ('MANUAL','NOTICE','ROUTINE','RESULT','SYSTEM')),
            status          TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('DRAFT','PENDING','PROCESSING','SENT','PARTIAL','FAILED','CANCELLED')),
            scheduled_at    TEXT NOT NULL DEFAULT (datetime('now')),
            timezone        TEXT NOT NULL DEFAULT 'Asia/Dhaka',
            recurrence      TEXT CHECK (recurrence IS NULL OR recurrence IN ('DAILY','WEEKLY','MONTHLY')),
            recurrence_until TEXT,
            idempotency_key TEXT UNIQUE,
            attempts        INTEGER NOT NULL DEFAULT 0,
            max_attempts    INTEGER NOT NULL DEFAULT 5,
            next_attempt_at TEXT,
            total_devices   INTEGER NOT NULL DEFAULT 0,
            sent_count      INTEGER NOT NULL DEFAULT 0,
            failed_count    INTEGER NOT NULL DEFAULT 0,
            error_message   TEXT,
            created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_notifications_due ON push_notifications(status, scheduled_at)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status, created_at DESC)`).run().catch(() => null);

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS push_deliveries (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
            device_token_id INTEGER NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status          TEXT NOT NULL DEFAULT 'QUEUED'
                            CHECK (status IN ('QUEUED','SENT','FAILED','INVALID')),
            fcm_message_id  TEXT,
            error           TEXT,
            attempted_at    TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification ON push_deliveries(notification_id)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_deliveries_user ON push_deliveries(user_id, created_at DESC)`).run().catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_push_deliveries_cleanup ON push_deliveries(created_at)`).run().catch(() => null);

      await db
        .prepare(
          `CREATE TABLE IF NOT EXISTS notification_inbox (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
            title           TEXT NOT NULL,
            body            TEXT NOT NULL,
            deep_link       TEXT,
            kind            TEXT NOT NULL DEFAULT 'MANUAL',
            is_read         INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        )
        .run()
        .catch(() => null);
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, created_at DESC)`).run().catch(() => null);

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

  // Ensure classes is_active column exists in existing databases
  await execSchemaStep(db, "ALTER TABLE classes ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;", "classes.is_active");

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

  // Ensure batches extended columns exist on legacy databases
  await execSchemaStep(db, "ALTER TABLE batches ADD COLUMN room_no TEXT;", "batches.room_no");
  await execSchemaStep(db, "ALTER TABLE batches ADD COLUMN max_students INTEGER DEFAULT 0;", "batches.max_students");
  await execSchemaStep(db, "ALTER TABLE batches ADD COLUMN fee REAL;", "batches.fee");
  await execSchemaStep(db, "ALTER TABLE batches ADD COLUMN note TEXT;", "batches.note");
  await execSchemaStep(db, "ALTER TABLE batches ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;", "batches.is_active");

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
        batch_id     INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        batch_name   TEXT,
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
      CREATE INDEX IF NOT EXISTS idx_routines_batch ON routines(batch_id);
    `,
    "routines"
  );
  await execSchemaStep(db, `ALTER TABLE routines ADD COLUMN period TEXT;`, "routines.period");
  await execSchemaStep(db, `ALTER TABLE routines ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;`, "routines.batch_id");
  await execSchemaStep(db, `ALTER TABLE routines ADD COLUMN batch_name TEXT;`, "routines.batch_name");

  // Student monthly comments
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS student_monthly_comments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year        INTEGER NOT NULL,
        mode        TEXT NOT NULL DEFAULT 'MONTHLY',
        comment     TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(student_id, teacher_id, month, year, mode)
      );
      CREATE INDEX IF NOT EXISTS idx_smc_lookup ON student_monthly_comments(student_id, month, year, mode);
      CREATE INDEX IF NOT EXISTS idx_smc_teacher ON student_monthly_comments(teacher_id);
    `,
    "student_monthly_comments"
  );

  // Routine daily topics (teachers specify today's chapter & lesson topic)
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS routine_daily_topics (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id   INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        chapter_name TEXT,
        topic_name   TEXT NOT NULL,
        objectives   TEXT,
        teacher_id   INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        teacher_name TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(routine_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_rdt_routine_date ON routine_daily_topics(routine_id, date);
      CREATE INDEX IF NOT EXISTS idx_rdt_date ON routine_daily_topics(date);
      CREATE INDEX IF NOT EXISTS idx_rdt_teacher ON routine_daily_topics(teacher_id);
    `,
    "routine_daily_topics"
  );

  // Fees, Automated Absent/Fail Fines, Payments & Notifications
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS fee_items (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        category        TEXT NOT NULL CHECK (category IN ('MONTHLY_FEE', 'EXAM_FEE', 'ABSENT_FINE', 'FAIL_FINE', 'NOTE_MATERIAL', 'ADMISSION_FEE', 'OTHER_FINE', 'OTHER_FEE')),
        title           TEXT NOT NULL,
        amount          REAL NOT NULL CHECK (amount >= 0),
        paid_amount     REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
        due_amount      REAL NOT NULL CHECK (due_amount >= 0),
        month           INTEGER CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
        year            INTEGER,
        exam_id         INTEGER REFERENCES exams(id) ON DELETE SET NULL,
        subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        reference_note  TEXT,
        due_date        TEXT,
        status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'WAIVED')),
        created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fee_items_student ON fee_items(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_items_status ON fee_items(status);
      CREATE INDEX IF NOT EXISTS idx_fee_items_category ON fee_items(category);
      CREATE INDEX IF NOT EXISTS idx_fee_items_period ON fee_items(year, month);
      CREATE INDEX IF NOT EXISTS idx_fee_items_exam ON fee_items(exam_id);

      CREATE TABLE IF NOT EXISTS fee_payments (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no      TEXT NOT NULL UNIQUE,
        student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        fee_item_id     INTEGER REFERENCES fee_items(id) ON DELETE SET NULL,
        amount_paid     REAL NOT NULL CHECK (amount_paid > 0),
        discount        REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
        payment_method  TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'OTHER')),
        transaction_id  TEXT,
        receipt_note    TEXT,
        collected_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        collector_name  TEXT,
        payment_date    TEXT NOT NULL DEFAULT (datetime('now')),
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(invoice_no);
      CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);

      CREATE TABLE IF NOT EXISTS fee_notifications (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        title           TEXT NOT NULL,
        message         TEXT NOT NULL,
        total_due       REAL NOT NULL DEFAULT 0,
        is_read         INTEGER NOT NULL DEFAULT 0,
        sent_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type            TEXT NOT NULL DEFAULT 'DUE_REMINDER' CHECK (type IN ('DUE_REMINDER', 'MONTHLY_BILL', 'FINE_ALERT', 'RECEIPT_ALERT')),
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_fee_notifications_student ON fee_notifications(student_id);
      CREATE INDEX IF NOT EXISTS idx_fee_notifications_read ON fee_notifications(is_read);
    `,
    "fee_management_tables"
  );

  // Push notifications (migration 0016) — also on the fresh-db path so a
  // brand-new local database gets the same tables as the Workers fast path.
  await execSchemaStep(
    db,
    `
      CREATE TABLE IF NOT EXISTS device_tokens (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id     TEXT NOT NULL,
        fcm_token     TEXT NOT NULL,
        platform      TEXT NOT NULL DEFAULT 'android',
        app_version   TEXT,
        active        INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_fcm ON device_tokens(fcm_token);
      CREATE INDEX IF NOT EXISTS idx_device_tokens_user_device ON device_tokens(user_id, device_id, active);
      CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(active, user_id);

      CREATE TABLE IF NOT EXISTS push_notifications (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        title           TEXT NOT NULL,
        body            TEXT NOT NULL,
        deep_link       TEXT,
        image_url       TEXT,
        target_type     TEXT NOT NULL DEFAULT 'ALL'
                        CHECK (target_type IN ('ALL','STUDENTS','TEACHERS','CLASS','USER')),
        target_class_id INTEGER,
        target_user_id  INTEGER,
        kind            TEXT NOT NULL DEFAULT 'MANUAL'
                        CHECK (kind IN ('MANUAL','NOTICE','ROUTINE','RESULT','SYSTEM')),
        status          TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('DRAFT','PENDING','PROCESSING','SENT','PARTIAL','FAILED','CANCELLED')),
        scheduled_at    TEXT NOT NULL DEFAULT (datetime('now')),
        timezone        TEXT NOT NULL DEFAULT 'Asia/Dhaka',
        recurrence      TEXT CHECK (recurrence IS NULL OR recurrence IN ('DAILY','WEEKLY','MONTHLY')),
        recurrence_until TEXT,
        idempotency_key TEXT UNIQUE,
        attempts        INTEGER NOT NULL DEFAULT 0,
        max_attempts    INTEGER NOT NULL DEFAULT 5,
        next_attempt_at TEXT,
        total_devices   INTEGER NOT NULL DEFAULT 0,
        sent_count      INTEGER NOT NULL DEFAULT 0,
        failed_count    INTEGER NOT NULL DEFAULT 0,
        error_message   TEXT,
        created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_push_notifications_due ON push_notifications(status, scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status, created_at DESC);

      CREATE TABLE IF NOT EXISTS push_deliveries (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
        device_token_id INTEGER NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status          TEXT NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','FAILED','INVALID')),
        fcm_message_id  TEXT,
        error           TEXT,
        attempted_at    TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification ON push_deliveries(notification_id);
      CREATE INDEX IF NOT EXISTS idx_push_deliveries_user ON push_deliveries(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_push_deliveries_cleanup ON push_deliveries(created_at);

      CREATE TABLE IF NOT EXISTS notification_inbox (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
        title           TEXT NOT NULL,
        body            TEXT NOT NULL,
        deep_link       TEXT,
        kind            TEXT NOT NULL DEFAULT 'MANUAL',
        is_read         INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, created_at DESC);
    `,
    "push_notification_tables"
  );

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
