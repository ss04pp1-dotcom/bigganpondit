-- Migration 0017: Routine daily topics (teachers specify today's chapter & lesson topic)
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
