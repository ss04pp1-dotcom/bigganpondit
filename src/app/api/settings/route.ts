// /api/settings — academy name & logo settings.
// GET: any logged-in user (branding info for headers/reports).
// PUT: admin only.

import { getDb } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME } from "@/lib/constants";
import { parseJson, settingsUpdateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireApiUser();
    const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
    const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
    return ok({ academyName, logoKey: logoKey || null, logoUrl: logoKey ? `/api/files/${logoKey}` : null });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = await parseJson(req, settingsUpdateSchema);
    await setSetting(SETTING_ACADEMY_NAME, body.academyName);
    return ok({ message: MSG.updated });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
