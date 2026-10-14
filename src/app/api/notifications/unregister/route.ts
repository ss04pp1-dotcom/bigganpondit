// /api/notifications/unregister — called by the mobile app on logout.
// Deactivates ONLY the current user's registration for that device/token —
// unrelated devices of other users are never touched.
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { unregisterDevice } from "@/lib/push-service";
import { z } from "zod";

const unregisterSchema = z.object({
  token: z.string().min(20).max(512).optional(),
  deviceId: z.string().min(1).max(128).optional(),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();
    const body = await parseJson(req, unregisterSchema);
    if (!body.token && !body.deviceId) {
      return ok({ deactivated: 0 });
    }
    const n = await unregisterDevice(db, user.id, body.token ?? null, body.deviceId ?? null);
    return ok({ deactivated: n });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
