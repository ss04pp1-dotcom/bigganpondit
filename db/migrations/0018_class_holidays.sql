-- Migration 0018: Class Holiday / Off-day Management (ছুটি ব্যবস্থাপনা)
-- Allows Admin & Director to declare holidays for all classes ('ALL') or specific classes,
-- optionally scoped to a division or batch, for a single day or date range.

CREATE TABLE IF NOT EXISTS class_holidays (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name      TEXT NOT NULL,
  division        TEXT CHECK (division IS NULL OR division IN ('SCIENCE','HUMANITIES')),
  batch_id        INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  batch_name      TEXT,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  reason          TEXT NOT NULL,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_class_holidays_dates ON class_holidays(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_class_holidays_class ON class_holidays(class_name);
CREATE INDEX IF NOT EXISTS idx_class_holidays_active ON class_holidays(is_active, end_date);
