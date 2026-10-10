-- Migration 0013: Batches, Class Routines, and extended Student profile fields

-- 1) Batches table
CREATE TABLE IF NOT EXISTS batches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  class_id     INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  division     TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
  time_slot    TEXT,
  days         TEXT,
  max_students INTEGER,
  fee          REAL,
  note         TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, name)
);
CREATE INDEX IF NOT EXISTS idx_batches_class ON batches(class_id);

-- 2) Extended student profile & batch assignment columns
ALTER TABLE students ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN batch_name TEXT;
ALTER TABLE students ADD COLUMN hide_photo_from_students INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN raw_password TEXT;
ALTER TABLE students ADD COLUMN father_occupation TEXT;
ALTER TABLE students ADD COLUMN mother_occupation TEXT;
ALTER TABLE students ADD COLUMN guardian_name TEXT;
ALTER TABLE students ADD COLUMN guardian_occupation TEXT;
ALTER TABLE students ADD COLUMN guardian_relation TEXT;

-- 3) Extended student_requests columns
ALTER TABLE student_requests ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;
ALTER TABLE student_requests ADD COLUMN batch_name TEXT;
ALTER TABLE student_requests ADD COLUMN raw_password TEXT;
ALTER TABLE student_requests ADD COLUMN father_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN mother_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_name TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_occupation TEXT;
ALTER TABLE student_requests ADD COLUMN guardian_relation TEXT;

-- 4) Routines table (Weekly & Daily Class Routine Schedule)
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

-- 5) Exams exam_type and Directors updated_at
ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'MONTHLY';
ALTER TABLE directors ADD COLUMN updated_at TEXT;
