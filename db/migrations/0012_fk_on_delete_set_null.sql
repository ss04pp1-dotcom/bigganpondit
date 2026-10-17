-- Migration 0012: user references that block teacher deletion.
--
-- notices.author_id, notebooks.uploaded_by and attendance.recorded_by were
-- plain `REFERENCES users(id)` with no ON DELETE action. D1 enforces foreign
-- keys, so deleting a teacher who ever authored a notice, uploaded a
-- notebook, or recorded attendance failed with a 500 (unique-index style
-- FK violation) instead of removing the account.
--
-- Rebuild the three tables with `ON DELETE SET NULL` (the display columns
-- author_name / uploader_name are denormalized, so SET NULL is safe).

-- ---------- notices ----------
CREATE TABLE notices_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name     TEXT NOT NULL,
  author_role     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'APPROVED',
  is_ticker       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at     TEXT
);
INSERT INTO notices_new (id, title, content, author_id, author_name, author_role, status, is_ticker, created_at, approved_at)
  SELECT id, title, content, author_id, author_name, author_role, status, is_ticker, created_at, approved_at FROM notices;
DROP TABLE notices;
ALTER TABLE notices_new RENAME TO notices;
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);

-- ---------- notebooks ----------
CREATE TABLE notebooks_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  class_id        INTEGER REFERENCES classes(id),
  subject_id      INTEGER REFERENCES subjects(id),
  file_key        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       INTEGER,
  uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploader_name   TEXT NOT NULL,
  description     TEXT,
  download_allowed INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO notebooks_new (id, title, class_id, subject_id, file_key, file_name, file_size, uploaded_by, uploader_name, description, download_allowed, created_at)
  SELECT id, title, class_id, subject_id, file_key, file_name, file_size, uploaded_by, uploader_name, description, COALESCE(download_allowed, 0), created_at FROM notebooks;
DROP TABLE notebooks;
ALTER TABLE notebooks_new RENAME TO notebooks;

-- ---------- attendance ----------
CREATE TABLE attendance_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id        INTEGER NOT NULL REFERENCES classes(id),
  date            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PRESENT',
  remarks         TEXT,
  recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, date)
);
INSERT INTO attendance_new (id, student_id, class_id, date, status, remarks, recorded_by, created_at)
  SELECT id, student_id, class_id, date, status, remarks, recorded_by, created_at FROM attendance;
DROP TABLE attendance;
ALTER TABLE attendance_new RENAME TO attendance;
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_att_class_date ON attendance(class_id, date);
