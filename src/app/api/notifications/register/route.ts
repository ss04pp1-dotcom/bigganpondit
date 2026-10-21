// /api/notifications/register — device-token registration (mobile app).
//
// Requires an authenticated session (any role). The token is bound to the
// logged-in account server-side — a client can never register a token for
// someone else. Handles:
//   * token refresh (same user+device, new token)
//   * account switch (same device, new user → previous user's rows for this
//     device are deactivated, never deleted)
//   * re-login (same token → reactivate + touch)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(10).max(2048),
  deviceId: z.string().min(1).max(128),
  platform: z.enum(["android", "ios", "web"]).default("web"),
  appVersion: z.string().max(32).optional(),
});

export async function POST(req: Request) {
  try {
    // Mobile app sends no Origin header (passes); browsers send their own
    // origin (must match). Same guard pattern as every other mutation.
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();
    const body = await parseJson(req, registerSchema);

    const token = body.token.trim();
    const deviceId = body.deviceId.trim();

    // 1. Does this FCM token already exist?
    const existing = await db
      .prepare("SELECT id, user_id, active FROM device_tokens WHERE fcm_token = ?")
      .bind(token)
      .first<{ id: number; user_id: number; active: number }>()
      .catch(() => null);

    if (existing) {
      // Token stays bound to whoever last logged in on that device.
      await db
        .prepare(
          `UPDATE device_tokens
             SET user_id = ?, device_id = ?, platform = ?, app_version = ?,
                 active = 1, last_seen_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(user.id, deviceId, body.platform, body.appVersion ?? null, existing.id)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO device_tokens
             (user_id, device_id, fcm_token, platform, app_version)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(user.id, deviceId, token, body.platform, body.appVersion ?? null)
        .run();
    }

    // 2. Deactivate stale rows: older tokens of THIS user on THIS device
    //    (token refresh) and any other user's rows on THIS device
    //    (account switch on a shared phone).
    await db
      .prepare(
        `UPDATE device_tokens SET active = 0, updated_at = datetime('now')
          WHERE device_id = ? AND fcm_token != ? AND active = 1`
      )
      .bind(deviceId, token)
      .run();

    return ok({ registered: true });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
