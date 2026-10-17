// D1-backed durable rate limiting.
//
// The previous limiter was an in-memory Map — on Cloudflare Workers every
// isolate (and every recycle) starts with an empty Map, so brute-force
// counters never shared state and the "8 attempts per 5 minutes" limit was
// decorative in production. This implementation persists counters in a D1
// table so the limit survives isolate churn.
//
// Usage pattern:
//   await assertNotRateLimited(db, key, opts);      // throws 429 while locked
//   ... verify credentials ...
//   await recordRateFailure(db, key, opts);          // on failure (may throw 429)
//   await clearRateLimit(db, key);                   // on success

import type { D1Database } from "@/lib/db/types";
import { ApiError } from "@/lib/api";

export interface RateLimitOptions {
  /** Failures allowed inside the window before the lockout engages. */
  limit: number;
  /** Failure-counting window, in seconds. */
  windowSec: number;
  /** Lockout duration once the limit is exceeded, in seconds. */
  lockoutSec: number;
}

export const LOGIN_RATE: RateLimitOptions = { limit: 8, windowSec: 300, lockoutSec: 900 };
export const OTP_RATE: RateLimitOptions = { limit: 5, windowSec: 900, lockoutSec: 900 };
export const FORGOT_RATE: RateLimitOptions = { limit: 5, windowSec: 3600, lockoutSec: 3600 };

interface AttemptRow {
  count: number;
  window_start: string;
  locked_until: string | null;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export function loginRateKey(req: Request, username: string): string {
  return `login:${clientIp(req)}:${username.trim().toLowerCase()}`;
}

function sqlTime(value: string): number {
  // SQLite datetime('now') strings are UTC "YYYY-MM-DD HH:MM:SS".
  const t = new Date(`${value.replace(" ", "T")}Z`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function getRow(db: D1Database, key: string): Promise<AttemptRow | null> {
  const row = await db
    .prepare("SELECT count, window_start, locked_until FROM login_attempts WHERE key = ?")
    .bind(key)
    .first<AttemptRow>()
    .catch(() => null);
  return row ?? null;
}

/** Throws 429 while the key is locked out. No-op otherwise. */
export async function assertNotRateLimited(
  db: D1Database,
  key: string,
  opts: RateLimitOptions
): Promise<void> {
  const row = await getRow(db, key);
  if (!row) return;
  if (row.locked_until) {
    const remaining = Math.ceil((sqlTime(row.locked_until) - Date.now()) / 1000);
    if (remaining > 0) {
      throw new ApiError(
        429,
        `অনেকবার ভুল চেষ্টা করা হয়েছে। অনুগ্রহ করে ~${Math.ceil(remaining / 60)} মিনিট পর আবার চেষ্টা করুন।`
      );
    }
  }
  void opts;
}

/** Records a failure; throws 429 when this failure triggers the lockout. */
export async function recordRateFailure(
  db: D1Database,
  key: string,
  opts: RateLimitOptions
): Promise<void> {
  const expire = `-${opts.windowSec} seconds`;
  await db
    .prepare(
      `INSERT INTO login_attempts (key, count, window_start, locked_until)
       VALUES (?, 1, datetime('now'), NULL)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN datetime(window_start) < datetime('now', ?) THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN datetime(window_start) < datetime('now', ?) THEN datetime('now') ELSE window_start END,
         locked_until = CASE
           WHEN locked_until IS NOT NULL AND datetime(locked_until) <= datetime('now') THEN NULL
           ELSE locked_until
         END`
    )
    .bind(key, expire, expire)
    .run()
    .catch(() => null);

  // Occasional purge of stale rows so the table cannot grow unbounded.
  if (Math.random() < 0.1) {
    await db
      .prepare(
        `DELETE FROM login_attempts
         WHERE datetime(window_start) < datetime('now', '-2 days')
           AND (locked_until IS NULL OR datetime(locked_until) < datetime('now', '-2 days'))`
      )
      .run()
      .catch(() => null);
  }

  const row = await getRow(db, key);
  if (row && row.count >= opts.limit) {
    const lock = `+${opts.lockoutSec} seconds`;
    await db
      .prepare("UPDATE login_attempts SET locked_until = datetime('now', ?) WHERE key = ?")
      .bind(lock, key)
      .run()
      .catch(() => null);
    throw new ApiError(
      429,
      `অনেকবার ভুল চেষ্টা করা হয়েছে। অনুগ্রহ করে ${Math.ceil(opts.lockoutSec / 60)} মিনিট পর আবার চেষ্টা করুন।`
    );
  }
}

/** Clears the counter after a successful attempt. */
export async function clearRateLimit(db: D1Database, key: string): Promise<void> {
  await db
    .prepare("DELETE FROM login_attempts WHERE key = ?")
    .bind(key)
    .run()
    .catch(() => null);
}
