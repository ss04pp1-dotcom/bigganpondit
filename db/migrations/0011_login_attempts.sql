-- 0011: Durable D1-backed rate limiting.
-- The previous in-memory limiter was per-isolate on Cloudflare Workers and
-- never shared state. This table backs login brute-force limits, OTP attempt
-- caps, and forgot-password request throttling.
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  locked_until TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_window ON login_attempts(window_start);
