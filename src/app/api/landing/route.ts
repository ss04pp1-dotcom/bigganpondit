// /api/landing — Public landing page content (courses, features, hero, stats, contact).
// GET: Publicly readable so the landing page and admin editor can fetch it.
// PUT: Admin / Director only — updates the landing page configuration in D1 settings.

import { getSetting, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok, fail } from "@/lib/api";
import {
  DEFAULT_LANDING_CONFIG,
  SETTING_LANDING_PAGE,
  parseLandingConfig,
  type LandingPageConfig,
} from "@/lib/landing-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getSetting(SETTING_LANDING_PAGE, "");
    const config = parseLandingConfig(raw);
    return ok({ config });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR"]);

    const body = (await req.json().catch(() => null)) as {
      config?: Partial<LandingPageConfig>;
      resetToDefault?: boolean;
    } | null;

    if (!body) {
      return fail(400, "অবৈধ তথ্য প্রেরণ করা হয়েছে।");
    }

    if (body.resetToDefault) {
      await setSetting(SETTING_LANDING_PAGE, JSON.stringify(DEFAULT_LANDING_CONFIG));
      return ok({
        message: "হোমপেজের সকল তথ্য ডিফল্ট অবস্থায় রিসেট করা হয়েছে।",
        config: DEFAULT_LANDING_CONFIG,
      });
    }

    if (!body.config || typeof body.config !== "object") {
      return fail(400, "হোমপেজের কনফিগারেশন তথ্য পাওয়া যায়নি।");
    }

    const sanitized = parseLandingConfig(JSON.stringify(body.config));
    await setSetting(SETTING_LANDING_PAGE, JSON.stringify(sanitized));

    return ok({
      message: "ওয়েবসাইটের কোর্স, ফিচার ও হোমপেজ তথ্য সফলভাবে সংরক্ষিত হয়েছে!",
      config: sanitized,
    });
  } catch (e) {
    return handleError(e);
  }
}
