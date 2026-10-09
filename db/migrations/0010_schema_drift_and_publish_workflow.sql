-- Migration 0010: Schema drift reconciliation + publish workflow columns.
--
-- Brings migration-provisioned databases in line with the runtime schema
-- (src/lib/db/schema.ts). All changes are additive ALTER TABLEs / CREATEs —
-- safe to re-run against databases already bootstrapped by the app.
--
-- NOTE ON users.role CHECK:
-- The 0001 CHECK (role IN ('ADMIN','TEACHER','STUDENT')) cannot be widened
-- in place in SQLite, and rebuilding the users table (CREATE new + DROP old)
-- is NOT safe here: DROP TABLE users performs an implicit DELETE which, with
-- foreign_keys ON, cascades into teachers/students/sessions/directors and
-- would destroy live data. Instead, the application stores directors on
-- legacy databases with role='TEACHER' (satisfying the old CHECK) and
-- resolves the effective role DIRECTOR through the directors table —
-- exactly what the login and session layers already do. No silent ADMIN
-- fallback exists anywhere.

-- students: profile + privacy + password-mirror columns (schema.ts parity)
ALTER TABLE students ADD COLUMN father_occupation TEXT;
ALTER TABLE students ADD COLUMN mother_occupation TEXT;
ALTER TABLE students ADD COLUMN guardian_name TEXT;
ALTER TABLE students ADD COLUMN guardian_occupation TEXT;
ALTER TABLE students ADD COLUMN guardian_relation TEXT;
ALTER TABLE students ADD COLUMN hide_photo_from_students INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN raw_password TEXT;

-- student_requests: same parity
ALTER TABLE student_requests ADD COLUMN father_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN mother_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_name TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_relation TEXT;
ALTER TABLE student_requests ADD COLUMN raw_password TEXT;

-- exams: draft/publish workflow + model-test separation
ALTER TABLE exams ADD COLUMN exam_type TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE exams ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0;

-- notebooks: download permission flag
ALTER TABLE notebooks ADD COLUMN download_allowed INTEGER NOT NULL DEFAULT 0;

-- directors: updated_at (schema.ts parity; backup restore expects it)
ALTER TABLE directors ADD COLUMN updated_at TEXT;

-- storage: D1 chunked-blob fallback table used by the storage layer
CREATE TABLE IF NOT EXISTS storage_chunks (
  key         TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data        TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_storage_chunks_key ON storage_chunks(key);
