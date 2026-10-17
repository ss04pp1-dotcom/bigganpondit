-- 0016_push_notifications.sql
-- FCM Push Notifications: device registration, persistent scheduled queue,
-- delivery log with per-device status, invalid-token cleanup support.
--
-- All timestamps are stored in UTC (SQLite datetime('now') is UTC).
-- The admin UI converts between Asia/Dhaka and UTC on input/display.

-- ---------------------------------------------------------------- devices --
CREATE TABLE IF NOT EXISTS device_tokens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  fcm_token     TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'android',
  app_version   TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One FCM token maps to exactly one physical device; one user may own many
-- devices. Token history is kept (inactive rows) — "one active registration
-- per (user, device)" is enforced by the register endpoint, not by a unique
-- index, because token refreshes create successive rows for the same device.
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_fcm ON device_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_device ON device_tokens(user_id, device_id, active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(active, user_id);

-- ------------------------------------------------------------ notification --
-- The queue. Rows are inserted by:
--   * admin manual compose (send-now / scheduled / recurring / draft)
--   * trusted server-side events (notice published, routine updated,
--     result published) — always with an idempotency_key so a retried
--     event can never enqueue a duplicate.
-- status lifecycle:
--   DRAFT → PENDING → PROCESSING → SENT | PARTIAL | FAILED
--   PENDING/PROCESSING → CANCELLED (admin)
--   FAILED retry loop: attempts < max_attempts, exponential backoff via
--   next_attempt_at; when attempts are exhausted the row stays FAILED
--   (terminal — never stuck pending forever).
CREATE TABLE IF NOT EXISTS push_notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  deep_link       TEXT,
  image_url       TEXT,
  target_type     TEXT NOT NULL DEFAULT 'ALL'
                  CHECK (target_type IN ('ALL','STUDENTS','TEACHERS','CLASS','USER')),
  target_class_id INTEGER,
  target_user_id  INTEGER,
  kind            TEXT NOT NULL DEFAULT 'MANUAL'
                  CHECK (kind IN ('MANUAL','NOTICE','ROUTINE','RESULT','SYSTEM')),
  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('DRAFT','PENDING','PROCESSING','SENT','PARTIAL','FAILED','CANCELLED')),
  scheduled_at    TEXT NOT NULL DEFAULT (datetime('now')),
  timezone        TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  recurrence      TEXT CHECK (recurrence IS NULL OR recurrence IN ('DAILY','WEEKLY','MONTHLY')),
  recurrence_until TEXT,
  idempotency_key TEXT UNIQUE,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT,
  total_devices   INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_due
  ON push_notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status
  ON push_notifications(status, created_at DESC);

-- ------------------------------------------------------------- deliveries --
-- Per-device delivery log. Distinguishes queued / sent-to-FCM / failed /
-- invalid-token. "SENT" means FCM accepted the message — it does NOT prove
-- the device displayed it (FCM delivery receipts are not exposed here).
CREATE TABLE IF NOT EXISTS push_deliveries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  device_token_id INTEGER NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'QUEUED'
                  CHECK (status IN ('QUEUED','SENT','FAILED','INVALID')),
  fcm_message_id  TEXT,
  error           TEXT,
  attempted_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification ON push_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_user ON push_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_cleanup ON push_deliveries(created_at);

-- -------------------------------------------------------- notification inbox --
-- Copy of delivered notifications per user so the app can show history even
-- after FCM messages expire (FCM keeps messages only ~4 weeks / while
-- delivery is possible). Written by the queue processor at send time.
CREATE TABLE IF NOT EXISTS notification_inbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id INTEGER NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  deep_link       TEXT,
  kind            TEXT NOT NULL DEFAULT 'MANUAL',
  is_read         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, created_at DESC);
