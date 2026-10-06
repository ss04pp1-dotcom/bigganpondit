-- Migration 0005: Student registration requests (Teacher submit -> Admin approve)
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
