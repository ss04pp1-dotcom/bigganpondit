// /api/cron/push — the push-queue processor endpoint.
//
// Triggered by the Worker's Cron Trigger (every 5 minutes) through the
// scheduled() handler injected by scripts/patch-worker.mjs, which calls this
// route with the server-side CRON_SECRET header. Also manually callable by
// an ADMIN for testing ("process now" button in the admin panel).
//
// The processor itself is claim-guarded and idempotent, so overlapping
// invocations are harmless.
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";
import { processDueNotifications, getServerEnv } from "@/lib/push-service";
import { enqueueUpcomingClassPushReminders } from "@/lib/push-events";
import type { D1Database } from "@/lib/db/types";

export async function POST(req: Request) {
  try {
    const env = await getServerEnv();
    const cronSecret = (env.CRON_SECRET as string | undefined) || "";
    const provided =
      req.headers.get("x-cron-secret") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

    let db: D1Database;
    if (cronSecret && provided === cronSecret) {
      // Cron path — server-side secret matches.
      db = await getDb();
    } else {
      // Manual path — must be an authenticated ADMIN (throws 401/403 otherwise).
      const r = await requireApiUser(["ADMIN"]);
      db = r.db;
    }

    // 1. Enqueue automatic class reminders (10min before and start) for today
    await enqueueUpcomingClassPushReminders(db).catch((err) => {
      console.error("[cron/push] class reminder scan error:", err);
    });

    // 2. Process all due notifications in queue
    const summary = await processDueNotifications(db);
    return ok({ processedAt: new Date().toISOString(), summary });
  } catch (e) {
    return handleError(e);
  }
}

// GET returns queue stats without processing (safe probe for monitoring).
export async function GET(req: Request) {
  try {
    const env = await getServerEnv();
    const cronSecret = (env.CRON_SECRET as string | undefined) || "";
    const provided =
      req.headers.get("x-cron-secret") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

    let db: D1Database;
    if (cronSecret && provided === cronSecret) {
      db = await getDb();
    } else {
      const r = await requireApiUser(["ADMIN"]);
      db = r.db;
    }

    const stats = await db
      .prepare("SELECT status, COUNT(*) as c FROM push_notifications GROUP BY status")
      .all<{ status: string; c: number }>()
      .catch(() => ({ results: [] as { status: string; c: number }[] }));
    const next = await db
      .prepare(
        `SELECT MIN(scheduled_at) as next FROM push_notifications
          WHERE status IN ('PENDING','DRAFT')`
      )
      .first<{ next: string | null }>()
      .catch(() => null);
    return ok({
      queue: stats.results ?? [],
      nextScheduled: next?.next ?? null,
      fcmConfigured: !!(env.FCM_SERVICE_ACCOUNT && String(env.FCM_SERVICE_ACCOUNT).includes("private_key")),
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
