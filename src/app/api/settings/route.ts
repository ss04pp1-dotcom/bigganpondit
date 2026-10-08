// /api/settings — academy name & logo settings.
// GET: any logged-in user (branding info for headers/reports).
// PUT: admin only.

import { getDb } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import {
  MSG,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
  DEFAULT_ACADEMY_NAME,
  SETTING_PUBLICATION_NAME,
  SETTING_PUBLICATION_LOGO,
  SETTING_PUBLICATION_DESCRIPTION,
  DEFAULT_PUBLICATION_NAME,
} from "@/lib/constants";
import { parseJson, settingsUpdateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireApiUser();
    const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
    const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
    const cardBgKey = await getSetting("card_bg_image_key", "");
    const publicationName = await getSetting(SETTING_PUBLICATION_NAME, DEFAULT_PUBLICATION_NAME);
    const publicationLogoKey = await getSetting(SETTING_PUBLICATION_LOGO, "");
    const publicationDescription = await getSetting(
      SETTING_PUBLICATION_DESCRIPTION,
      "অনলাইনে প্রকাশনীর বই ও লেকচার শিট পড়ার সুরক্ষিত মাধ্যম (রিড-অনলি মোড)"
    );

    return ok({
      academyName,
      logoKey: logoKey || null,
      logoUrl: logoKey ? `/api/files/${logoKey}` : null,
      cardBgUrl: cardBgKey
        ? cardBgKey.startsWith("http") || cardBgKey.startsWith("data:") || cardBgKey.startsWith("/card")
          ? cardBgKey
          : `/api/files/${cardBgKey}`
        : null,
      publicationName,
      publicationLogoKey: publicationLogoKey || null,
      publicationLogoUrl: publicationLogoKey ? `/api/files/${publicationLogoKey}` : null,
      publicationDescription,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await parseJson(req, settingsUpdateSchema);
    if (body.academyName) {
      await setSetting(SETTING_ACADEMY_NAME, body.academyName);
    }
    if (body.cardBgUrl !== undefined) {
      await setSetting("card_bg_image_key", body.cardBgUrl ?? "");
    }
    if (body.publicationName !== undefined) {
      await setSetting(SETTING_PUBLICATION_NAME, body.publicationName.trim());
    }
    if (body.publicationDescription !== undefined) {
      await setSetting(SETTING_PUBLICATION_DESCRIPTION, body.publicationDescription.trim());
    }
    if (body.publicationLogoKey !== undefined) {
      await setSetting(SETTING_PUBLICATION_LOGO, body.publicationLogoKey ?? "");
    }
    return ok({ message: MSG.updated });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
