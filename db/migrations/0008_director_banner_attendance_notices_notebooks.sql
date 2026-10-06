-- Migration 0008: Director role, Banner ads, Attendance, Notices with approval, Notebooks (read-only PDF library), Student photo privacy
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
