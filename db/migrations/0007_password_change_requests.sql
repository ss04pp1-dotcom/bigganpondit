-- Migration 0007: Password change requests workflow (Teacher/Student request, Admin approve)
CREATE TABLE IF NOT EXISTS password_change_requests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  user_role         TEXT NOT NULL,
  username          TEXT NOT NULL,
  new_password_hash TEXT NOT NULL,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  admin_notes       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_pwd_change_user ON password_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_change_status ON password_change_requests(status);
