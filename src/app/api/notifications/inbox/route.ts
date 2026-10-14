// /api/notifications/inbox — notification history for the logged-in user
// (mobile app "notifications" screen). Sourced from notification_inbox so
// history survives FCM message expiry. Supports unread count + mark-read.
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const readSchema = z.object({
  ids: z.array(z.number().int().positive()).max(200).optional(),
  all: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";

    const rows = await db
      .prepare(
        `SELECT id, notification_id, title, body, deep_link, kind, is_read, created_at
           FROM notification_inbox
          WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
          ORDER BY created_at DESC, id DESC
          LIMIT 100`
      )
      .bind(user.id)
      .all<{
        id: number;
        notification_id: number;
        title: string;
        body: string;
        deep_link: string | null;
        kind: string;
        is_read: number;
        created_at: string;
      }>()
      .catch(() => ({ results: [] }));

    const unreadRow = await db
      .prepare("SELECT COUNT(*) as c FROM notification_inbox WHERE user_id = ? AND is_read = 0")
      .bind(user.id)
      .first<{ c: number }>()
      .catch(() => null);

    return ok({
      notifications: rows.results ?? [],
      unread: unreadRow?.c ?? 0,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";

/** Mark inbox rows read (by ids, or all at once). */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();
    const body = await parseJson(req, readSchema);

    if (body.all) {
      await db
        .prepare("UPDATE notification_inbox SET is_read = 1 WHERE user_id = ? AND is_read = 0")
        .bind(user.id)
        .run();
    } else if (body.ids && body.ids.length > 0) {
      const placeholders = body.ids.map(() => "?").join(",");
      await db
        .prepare(
          `UPDATE notification_inbox SET is_read = 1
            WHERE user_id = ? AND id IN (${placeholders})`
        )
        .bind(user.id, ...body.ids)
        .run();
    }
    return ok({ marked: true });
  } catch (e) {
    return handleError(e);
  }
}
