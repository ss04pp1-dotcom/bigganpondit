// Schema SQL — identical to db/migrations/0001_init.sql.
// Embedded as a constant so the runtime bootstrap also works on
// Cloudflare Workers (no fs access in production).
// All statements are idempotent (IF NOT EXISTS).

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN','TEACHER','DIRECTOR','STUDENT')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  short_name   TEXT NOT NULL DEFAULT '',
  photo_key    TEXT,
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
  father_occupation TEXT,
  mother_name TEXT,
  mother_occupation TEXT,
  guardian_name TEXT,
  guardian_occupation TEXT,
  guardian_relation TEXT,
  school_name TEXT,
  phone       TEXT,
  address     TEXT,
  blood_group TEXT,
  dob         TEXT,
  raw_password TEXT,
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
  exam_type   TEXT NOT NULL DEFAULT 'MONTHLY',
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
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS storage_files (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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


CREATE TABLE IF NOT EXISTS directors (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution   TEXT,
  photo_key     TEXT,
  signature_key TEXT,
  remarks       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
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
  download_allowed INTEGER NOT NULL DEFAULT 0,
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
  father_occupation TEXT,
  mother_name   TEXT,
  mother_occupation TEXT,
  guardian_name TEXT,
  guardian_occupation TEXT,
  guardian_relation TEXT,
  school_name   TEXT,
  phone         TEXT,
  address       TEXT,
  blood_group   TEXT,
  dob           TEXT,
  raw_password  TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  admin_notes   TEXT,
  reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_student_req_status ON student_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_req_teacher ON student_requests(teacher_id);
`;
