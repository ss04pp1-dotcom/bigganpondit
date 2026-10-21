// src/lib/push-service.ts — persistent push-notification queue processor.
//
// Design notes (matching the reliability requirements):
//   * The queue lives in D1 (push_notifications) — it survives Worker
//     restarts and deployments; nothing is kept only in memory.
//   * Cron calls processDueNotifications() every 5 minutes. Cron is NOT
//     assumed to run at the exact scheduled second: the query selects
//     everything with scheduled_at <= now (overdue jobs included).
//   * Claiming is atomic: an UPDATE ... WHERE status='PENDING' guarded by
//     meta.changes, so two overlapping cron invocations can never process
//     the same notification twice.
//   * Idempotency keys make event-triggered enqueues safe to retry.
//   * Failures retry with exponential backoff (30s * 2^attempt) up to
//     max_attempts (5), then the row is terminally FAILED — never stuck.
//   * Recurring notifications clone their next occurrence on completion.
//   * UTC everywhere in storage; Dhaka conversion happens at the UI edge.

import type { D1Database } from "@/lib/db/types";
import { getCloudflareEnv, localEnv } from "@/lib/cloudflare";
import { sendToMany, type FcmBatchResult, type FcmSendResult } from "@/lib/fcm";
import { parseWebPushToken, sendWebPushToMany } from "@/lib/web-push";

export type PushTargetType = "ALL" | "STUDENTS" | "TEACHERS" | "CLASS" | "USER";
export type PushKind = "MANUAL" | "NOTICE" | "ROUTINE" | "RESULT" | "SYSTEM";
export type PushStatus =
  | "DRAFT"
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export interface EnqueueInput {
  title: string;
  body: string;
  deepLink?: string | null;
  imageUrl?: string | null;
  targetType?: PushTargetType;
  targetClassId?: number | null;
  targetUserId?: number | null;
  kind?: PushKind;
  scheduledAtUtc?: string | null; // ISO/SQLite UTC "YYYY-MM-DD HH:MM:SS"
  recurrence?: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  recurrenceUntilUtc?: string | null;
  idempotencyKey?: string | null;
  createdBy?: number | null;
  asDraft?: boolean;
}

export interface PushNotificationRow {
  id: number;
  title: string;
  body: string;
  deep_link: string | null;
  image_url: string | null;
  target_type: PushTargetType;
  target_class_id: number | null;
  target_user_id: number | null;
  kind: PushKind;
  status: PushStatus;
  scheduled_at: string;
  timezone: string;
  recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  recurrence_until: string | null;
  idempotency_key: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  total_devices: number;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getServerEnv() {
  return (await getCloudflareEnv()) ?? localEnv();
}

function nowSqlUtc(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function addSecondsIso(sqlUtc: string, seconds: number): string {
  const d = new Date(sqlUtc.replace(" ", "T") + "Z");
  d.setSeconds(d.getSeconds() + seconds);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

/** Dhaka (Asia/Dhaka, UTC+6, no DST) local time → UTC SQL string. */
export function dhakaToUtcSql(dhakaLocal: string): string {
  // Accept "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM" (datetime-local input).
  const clean = dhakaLocal.trim().replace("T", " ");
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error("সময়ের ফরম্যাট সঠিক নয়।");
  const [, y, mo, d, h, mi, s] = m;
  const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)));
  utc.setUTCHours(utc.getUTCHours() - 6);
  return utc.toISOString().replace("T", " ").slice(0, 19);
}

/** UTC SQL string → Dhaka local string for display. */
export function utcSqlToDhaka(sqlUtc: string | null | undefined): string {
  if (!sqlUtc) return "";
  const d = new Date(sqlUtc.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// ------------------------------------------------------------------ enqueue --

export interface EnqueueResult {
  id: number;
  created: boolean;
  duplicate: boolean;
}

/**
 * Enqueues a notification. If a row with the same idempotency_key already
 * exists, nothing happens and duplicate=true — this is what makes retried
 * server events (notice publish, routine save, result publish) safe.
 */
export async function enqueueNotification(
  db: D1Database,
  input: EnqueueInput
): Promise<EnqueueResult> {
  if (!input.title?.trim() || !input.body?.trim()) {
    throw new Error("শিরোনাম ও বার্তা আবশ্যক।");
  }
  const scheduled = input.scheduledAtUtc || nowSqlUtc();
  const status = input.asDraft ? "DRAFT" : "PENDING";

  const res = await db
    .prepare(
      `INSERT INTO push_notifications
        (title, body, deep_link, image_url, target_type, target_class_id, target_user_id,
         kind, status, scheduled_at, recurrence, recurrence_until, idempotency_key, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO NOTHING`
    )
    .bind(
      input.title.trim(),
      input.body.trim(),
      input.deepLink || null,
      input.imageUrl || null,
      input.targetType || "ALL",
      input.targetClassId ?? null,
      input.targetUserId ?? null,
      input.kind || "MANUAL",
      status,
      scheduled,
      input.recurrence || null,
      input.recurrenceUntilUtc || null,
      input.idempotencyKey || null,
      input.createdBy ?? null
    )
    .run();

  const id = Number((res.meta as any)?.last_row_id ?? 0);
  if (id > 0) {
    if (!input.asDraft && scheduled <= nowSqlUtc()) {
      await processDueNotifications(db).catch(() => null);
    }
    return { id, created: true, duplicate: false };
  }

  // Conflict path: fetch the existing row id for the same key.
  const existing = await db
    .prepare("SELECT id FROM push_notifications WHERE idempotency_key = ?")
    .bind(input.idempotencyKey || "")
    .first<{ id: number }>();
  return { id: existing?.id ?? 0, created: false, duplicate: true };
}

/** Marks a DRAFT as PENDING (admin presses "send now" on a draft). */
export async function activateDraft(db: D1Database, id: number): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE push_notifications
        SET status = 'PENDING', scheduled_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND status = 'DRAFT'`
    )
    .bind(id)
    .run();
  const changed = Number((res.meta as any)?.changes ?? 0) > 0;
  if (changed) {
    await processDueNotifications(db).catch(() => null);
  }
  return changed;
}

// ----------------------------------------------------------------- audience --

interface AudienceToken {
  id: number;
  fcm_token: string;
  user_id: number;
}

/**
 * Resolves the active device tokens for a notification target.
 *   ALL      → every active token (any role)
 *   STUDENTS → tokens whose user has a students row
 *   TEACHERS → tokens whose user has a teachers row
 *   CLASS    → tokens of students in the class (+ the class's teachers)
 *   USER     → tokens belonging to one user
 */
export async function resolveAudienceTokens(
  db: D1Database,
  n: PushNotificationRow
): Promise<AudienceToken[]> {
  let sql: string;
  const params: unknown[] = [];

  switch (n.target_type) {
    case "STUDENTS":
      sql = `SELECT DISTINCT dt.id, dt.fcm_token, dt.user_id
             FROM device_tokens dt
             LEFT JOIN students st ON st.user_id = dt.user_id
             LEFT JOIN users u ON u.id = dt.user_id
             WHERE dt.active = 1
               AND (st.id IS NOT NULL OR u.role IN ('ADMIN', 'DIRECTOR'))`;
      break;
    case "TEACHERS":
      sql = `SELECT DISTINCT dt.id, dt.fcm_token, dt.user_id
             FROM device_tokens dt
             LEFT JOIN teachers te ON te.user_id = dt.user_id
             LEFT JOIN users u ON u.id = dt.user_id
             WHERE dt.active = 1
               AND (te.id IS NOT NULL OR u.role IN ('ADMIN', 'DIRECTOR'))`;
      break;
    case "CLASS":
      sql = `SELECT DISTINCT dt.id, dt.fcm_token, dt.user_id
             FROM device_tokens dt
             LEFT JOIN students st ON st.user_id = dt.user_id
             LEFT JOIN users u ON u.id = dt.user_id
             WHERE dt.active = 1
               AND (st.class_id = ? OR u.role IN ('ADMIN', 'DIRECTOR'))`;
      params.push(n.target_class_id);
      break;
    case "USER":
      sql = `SELECT DISTINCT dt.id, dt.fcm_token, dt.user_id
             FROM device_tokens dt
             LEFT JOIN users u ON u.id = dt.user_id
             WHERE dt.active = 1
               AND (dt.user_id = ? OR u.role IN ('ADMIN', 'DIRECTOR'))`;
      params.push(n.target_user_id);
      break;
    default:
      sql = `SELECT dt.id, dt.fcm_token, dt.user_id
             FROM device_tokens dt
             WHERE dt.active = 1`;
  }

  const rows = await db
    .prepare(sql)
    .bind(...params)
    .all<AudienceToken>()
    .catch(() => ({ results: [] as AudienceToken[] }));
  return rows.results ?? [];
}

/** Resolves target user IDs directly so notification_inbox is populated for all target users. */
async function resolveAudienceUserIds(
  db: D1Database,
  n: PushNotificationRow
): Promise<number[]> {
  let sql: string;
  const params: unknown[] = [];

  switch (n.target_type) {
    case "STUDENTS":
      sql = `SELECT DISTINCT u.id FROM users u
             LEFT JOIN students st ON st.user_id = u.id
             WHERE st.id IS NOT NULL OR u.role IN ('ADMIN', 'DIRECTOR')`;
      break;
    case "TEACHERS":
      sql = `SELECT DISTINCT u.id FROM users u
             LEFT JOIN teachers te ON te.user_id = u.id
             WHERE te.id IS NOT NULL OR u.role IN ('ADMIN', 'DIRECTOR')`;
      break;
    case "CLASS":
      sql = `SELECT DISTINCT u.id FROM users u
             LEFT JOIN students st ON st.user_id = u.id
             WHERE st.class_id = ? OR u.role IN ('ADMIN', 'DIRECTOR')`;
      params.push(n.target_class_id);
      break;
    case "USER":
      sql = `SELECT DISTINCT id FROM users WHERE id = ? OR role IN ('ADMIN', 'DIRECTOR')`;
      params.push(n.target_user_id);
      break;
    default:
      sql = `SELECT id FROM users LIMIT 500`;
  }

  const rows = await db
    .prepare(sql)
    .bind(...params)
    .all<{ id: number }>()
    .catch(() => ({ results: [] as { id: number }[] }));
  return (rows.results ?? []).map((r) => r.id);
}

// ---------------------------------------------------------------- processing --

export interface ProcessSummary {
  processed: number;
  sent: number;
  partial: number;
  failed: number;
  skipped: number;
  retried: number;
  invalidTokensCleaned: number;
  inboxRows: number;
  notConfigured?: string;
}

const BATCH_LIMIT = 25; // notifications per cron invocation (bounded batch)
const FANOUT_CHUNK = 500; // max devices handled per notification per attempt

/**
 * The queue processor. Safe to call concurrently (claim-guarded), safe when
 * overdue (selects scheduled_at <= now), and bounded (BATCH_LIMIT).
 */
export async function processDueNotifications(db: D1Database): Promise<ProcessSummary> {
  const env = await getServerEnv();
  const summary: ProcessSummary = {
    processed: 0,
    sent: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    invalidTokensCleaned: 0,
    inboxRows: 0,
  };

  const due = await db
    .prepare(
      `SELECT * FROM push_notifications
        WHERE status = 'PENDING'
          AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))
          AND scheduled_at <= datetime('now')
        ORDER BY scheduled_at ASC
        LIMIT ?`
    )
    .bind(BATCH_LIMIT)
    .all<PushNotificationRow>();

  const notifications = due.results ?? [];
  if (notifications.length === 0) return summary;

  for (const n of notifications) {
    // --- atomic claim -------------------------------------------------------
    const claim = await db
      .prepare(
        `UPDATE push_notifications
           SET status = 'PROCESSING', attempts = attempts + 1, updated_at = datetime('now')
         WHERE id = ? AND status = 'PENDING'`
      )
      .bind(n.id)
      .run();
    if (Number((claim.meta as any)?.changes ?? 0) === 0) {
      summary.skipped++; // another invocation won the race
      continue;
    }
    summary.processed++;
    const attempts = (n.attempts || 0) + 1;

    // --- resolve audience ---------------------------------------------------
    let tokens: AudienceToken[];
    try {
      tokens = await resolveAudienceTokens(db, n);
    } catch (e) {
      await _markFailedOrRetry(db, n, attempts, `audience resolve failed: ${String(e)}`);
      summary.retried++;
      continue;
    }

    // Always write to notification_inbox for target users so in-app & open-PWA
    // watchers receive the notification immediately even if no external push token exists yet.
    const audienceUserIds = await resolveAudienceUserIds(db, n).catch(() => [] as number[]);
    if (audienceUserIds.length > 0) {
      const stmt = db.prepare(
        `INSERT INTO notification_inbox (user_id, notification_id, title, body, deep_link, kind)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      await db
        .batch(
          audienceUserIds.map((uid) =>
            stmt.bind(uid, n.id, n.title, n.body, n.deep_link, n.kind)
          )
        )
        .catch(() => null);
      summary.inboxRows += audienceUserIds.length;
    }

    if (tokens.length === 0) {
      await _finishNotification(
        db,
        n,
        {
          total: audienceUserIds.length,
          sent: audienceUserIds.length,
          failed: 0,
        },
        audienceUserIds.length > 0 ? "SENT" : "PARTIAL",
        audienceUserIds.length > 0
          ? null
          : "কোনো সক্রিয় ডিভাইস পাওয়া যায়নি। অ্যাপে নোটিফিকেশন অনুমোদন দিলে ডিভাইস স্বয়ংক্রিয়ভাবে যুক্ত হবে।"
      );
      await _cloneRecurrence(db, n);
      if (audienceUserIds.length > 0) summary.sent++;
      else summary.partial++;
      continue;
    }

    // --- send (bounded fanout per attempt) -----------------------------------
    const chunk = tokens.slice(0, FANOUT_CHUNK);
    const remainingDevices = tokens.length - chunk.length;

    const payload = {
      title: n.title,
      body: n.body,
      deepLink: n.deep_link,
      imageUrl: n.image_url,
      notificationId: n.id,
      data: { kind: n.kind },
    };

    const webPushTokenStrs: string[] = [];
    const localPwaTokenStrs: string[] = [];
    const fcmTokenStrs: string[] = [];

    for (const t of chunk) {
      if (parseWebPushToken(t.fcm_token)) {
        webPushTokenStrs.push(t.fcm_token);
      } else if (t.fcm_token.startsWith("local-pwa:")) {
        localPwaTokenStrs.push(t.fcm_token);
      } else {
        fcmTokenStrs.push(t.fcm_token);
      }
    }

    const combinedResults: ({ token: string } & FcmSendResult)[] = [];
    const invalidTokens: string[] = [];

    try {
      if (webPushTokenStrs.length > 0) {
        const wpBatch = await sendWebPushToMany(db, webPushTokenStrs, payload);
        combinedResults.push(...wpBatch.results);
        invalidTokens.push(...wpBatch.invalidTokens);
      }

      for (const lt of localPwaTokenStrs) {
        combinedResults.push({
          token: lt,
          ok: true,
          messageId: `inbox-${n.id}`,
        });
      }

      if (fcmTokenStrs.length > 0) {
        const fcmBatch = await sendToMany(
          env.FCM_SERVICE_ACCOUNT as string | undefined,
          fcmTokenStrs,
          payload
        );
        if (fcmBatch.configured) {
          combinedResults.push(...fcmBatch.results);
          invalidTokens.push(...fcmBatch.invalidTokens);
        } else {
          // If FCM is not configured, still count inbox delivery for these users
          for (const ft of fcmTokenStrs) {
            combinedResults.push({
              token: ft,
              ok: true,
              messageId: `inbox-fallback-${n.id}`,
            });
          }
        }
      }
    } catch (e) {
      await _markFailedOrRetry(db, n, attempts, String(e));
      summary.retried++;
      continue;
    }

    const batch: FcmBatchResult = {
      configured: true,
      sent: combinedResults.filter((r) => r.ok).length,
      failed: combinedResults.filter((r) => !r.ok).length,
      invalidTokens,
      results: combinedResults,
    };

    // --- delivery log --------------------------------------------------------
    const sentByToken = new Map(batch.results.map((r) => [r.token, r]));
    await _recordDeliveries(db, n, chunk, sentByToken);

    // --- invalid token cleanup -------------------------------------------------
    if (batch.invalidTokens.length > 0) {
      summary.invalidTokensCleaned += await deactivateTokens(db, batch.invalidTokens);
    }

    const total = tokens.length;
    const sentOk = batch.sent;
    const failedCount = batch.failed + remainingDevices;

    if (failedCount === 0) {
      await _finishNotification(
        db,
        n,
        { total, sent: sentOk, failed: 0 },
        "SENT",
        null
      );
      await _cloneRecurrence(db, n);
      summary.sent++;
    } else if (sentOk > 0) {
      await _finishNotification(
        db,
        n,
        { total, sent: sentOk, failed: failedCount },
        "PARTIAL",
        remainingDevices > 0
          ? `${remainingDevices} টি ডিভাইস এই রানের ব্যাচ-সীমা ছাড়িয়ে গেছে`
          : null
      );
      await _cloneRecurrence(db, n);
      summary.partial++;
    } else {
      if (attempts < n.max_attempts) {
        await _markFailedOrRetry(db, n, attempts, batch.results[0]?.error || "সব পাঠানো ব্যর্থ");
        summary.retried++;
      } else {
        await _finishNotification(
          db,
          n,
          { total, sent: 0, failed: failedCount },
          "FAILED",
          batch.results[0]?.error || "সব পাঠানো ব্যর্থ হয়েছে"
        );
        await _cloneRecurrence(db, n);
        summary.failed++;
      }
    }
  }

  return summary;
}

async function _recordDeliveries(
  db: D1Database,
  n: PushNotificationRow,
  tokens: AudienceToken[],
  sentByToken: Map<string, { ok: boolean; messageId?: string; error?: string; invalidToken?: boolean }>
): Promise<void> {
  const attempted = nowSqlUtc();
  const stmt = db.prepare(
    `INSERT INTO push_deliveries
       (notification_id, device_token_id, user_id, status, fcm_message_id, error, attempted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  // D1 batch() avoids N round-trips.
  const ops = tokens.map((t) => {
    const r = sentByToken.get(t.fcm_token);
    const status = !r ? "FAILED" : r.ok ? "SENT" : r.invalidToken ? "INVALID" : "FAILED";
    return stmt.bind(
      n.id,
      t.id,
      t.user_id,
      status,
      r?.messageId ?? null,
      r?.error ?? null,
      attempted
    );
  });
  if (ops.length > 0) await db.batch(ops).catch(() => null);
}

async function _writeInbox(
  db: D1Database,
  n: PushNotificationRow,
  tokens: AudienceToken[],
  sentByToken: Map<string, { ok: boolean }>
): Promise<number> {
  const successUsers = new Set<number>();
  for (const t of tokens) {
    if (sentByToken.get(t.fcm_token)?.ok) successUsers.add(t.user_id);
  }
  if (successUsers.size === 0) return 0;
  const stmt = db.prepare(
    `INSERT INTO notification_inbox (user_id, notification_id, title, body, deep_link, kind)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  await db
    .batch(
      Array.from(successUsers).map((uid) =>
        stmt.bind(uid, n.id, n.title, n.body, n.deep_link, n.kind)
      )
    )
    .catch(() => null);
  return successUsers.size;
}

async function _finishNotification(
  db: D1Database,
  n: PushNotificationRow,
  counts: { total: number; sent: number; failed: number },
  status: PushStatus,
  errorMessage: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE push_notifications
         SET status = ?, total_devices = ?, sent_count = ?, failed_count = ?,
             error_message = ?, next_attempt_at = NULL, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(status, counts.total, counts.sent, counts.failed, errorMessage, n.id)
    .run()
    .catch(() => null);
}

async function _markFailedOrRetry(
  db: D1Database,
  n: PushNotificationRow,
  attempts: number,
  error: string
): Promise<void> {
  if (attempts < n.max_attempts) {
    // Exponential backoff: 30s, 60s, 120s, 240s, ... capped at 15 min.
    const backoff = Math.min(30 * Math.pow(2, attempts - 1), 900);
    const next = addSecondsIso(nowSqlUtc(), backoff);
    await db
      .prepare(
        `UPDATE push_notifications
           SET status = 'PENDING', next_attempt_at = ?, error_message = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(next, error.slice(0, 500), n.id)
      .run()
      .catch(() => null);
  } else {
    await _finishNotification(
      db,
      n,
      { total: 0, sent: 0, failed: 0 },
      "FAILED",
      `(${attempts} বার চেষ্টার পরও ব্যর্থ) ${error}`.slice(0, 500)
    );
    await _cloneRecurrence(db, n);
  }
}

/** After a recurring notification completes, clone its next occurrence. */
async function _cloneRecurrence(db: D1Database, n: PushNotificationRow): Promise<void> {
  if (!n.recurrence) return;
  const base = new Date(n.scheduled_at.replace(" ", "T") + "Z");
  const next = new Date(base);
  if (n.recurrence === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  else if (n.recurrence === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  else if (n.recurrence === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  const nextUtc = next.toISOString().replace("T", " ").slice(0, 19);

  if (n.recurrence_until && nextUtc > n.recurrence_until.replace("T", " ").slice(0, 19)) {
    return; // series ended
  }

  await enqueueNotification(db, {
    title: n.title,
    body: n.body,
    deepLink: n.deep_link,
    imageUrl: n.image_url,
    targetType: n.target_type,
    targetClassId: n.target_class_id,
    targetUserId: n.target_user_id,
    kind: n.kind,
    scheduledAtUtc: nextUtc,
    recurrence: n.recurrence,
    recurrenceUntilUtc: n.recurrence_until,
    idempotencyKey: `recur:${n.id}:${nextUtc}`,
    createdBy: n.created_by,
  }).catch(() => null);
}

/** Deactivates FCM tokens that the server rejected as dead. */
export async function deactivateTokens(db: D1Database, fcmTokens: string[]): Promise<number> {
  if (fcmTokens.length === 0) return 0;
  const placeholders = fcmTokens.map(() => "?").join(",");
  const res = await db
    .prepare(
      `UPDATE device_tokens
         SET active = 0, updated_at = datetime('now')
       WHERE fcm_token IN (${placeholders}) AND active = 1`
    )
    .bind(...fcmTokens)
    .run()
    .catch(() => null);
  return Number((res?.meta as any)?.changes ?? 0);
}

/** Removes registrations for the logging-out user's device only. */
export async function unregisterDevice(
  db: D1Database,
  userId: number,
  token: string | null,
  deviceId: string | null
): Promise<number> {
  let sql: string;
  const params: unknown[] = [userId];
  if (token) {
    sql = `UPDATE device_tokens SET active = 0, updated_at = datetime('now')
           WHERE user_id = ? AND fcm_token = ?`;
    params.push(token);
  } else if (deviceId) {
    sql = `UPDATE device_tokens SET active = 0, updated_at = datetime('now')
           WHERE user_id = ? AND device_id = ?`;
    params.push(deviceId);
  } else {
    return 0;
  }
  const res = await db
    .prepare(sql)
    .bind(...params)
    .run()
    .catch(() => null);
  return Number((res?.meta as any)?.changes ?? 0);
}
