-- ============================================================
-- নম্বর সংগ্রহক ও রিপোর্ট সফটওয়্যার — D1 schema (SQLite compatible)
-- Migration 0001 — initial schema
-- Used by: `wrangler d1 migrations apply` (production)
--          and by the runtime bootstrap (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN','TEACHER','STUDENT')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  short_name   TEXT NOT NULL DEFAULT '',
  signature_key TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  class_id    INTEGER NOT NULL REFERENCES classes(id),
  division    TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
  section     TEXT,
  roll        INTEGER NOT NULL CHECK (roll > 0),
  photo_key   TEXT,
  father_name TEXT,
  mother_name TEXT,
  school_name TEXT,
  phone       TEXT,
  address     TEXT,
  blood_group TEXT,
  dob         TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  class_id         INTEGER NOT NULL REFERENCES classes(id),
  division         TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
  is_fourth_subject INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id),
  division    TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL,
  exam_date   TEXT NOT NULL,
  title       TEXT NOT NULL,
  total_marks INTEGER NOT NULL CHECK (total_marks > 0),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id        INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance     TEXT NOT NULL DEFAULT 'PRESENT' CHECK (attendance IN ('PRESENT','ABSENT')),
  obtained_marks REAL NOT NULL DEFAULT 0 CHECK (obtained_marks >= 0),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Indexes for frequent queries (spec: D1 performance) ----
CREATE INDEX IF NOT EXISTS idx_students_class    ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_roll     ON students(roll);
CREATE INDEX IF NOT EXISTS idx_students_division ON students(division);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_class_div_roll
  ON students(class_id, (COALESCE(division, '')), roll);

CREATE INDEX IF NOT EXISTS idx_exams_class     ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject   ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_month_year ON exams(month, year);
CREATE INDEX IF NOT EXISTS idx_exams_date      ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_class_div ON exams(class_id, (COALESCE(division, '')), month, year);

CREATE INDEX IF NOT EXISTS idx_marks_exam    ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_lookup  ON exams(subject_id, month, year);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
