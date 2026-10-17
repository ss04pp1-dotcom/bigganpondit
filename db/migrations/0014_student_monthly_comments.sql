-- Migration 0014: Teacher monthly comments table
-- Allows subject teachers to store comments and signatures for students on monthly result cards.

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
