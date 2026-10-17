// /api/banner — Get active promotional banner (Public/Authenticated)
import { getSetting } from "@/lib/db";
import {
  SETTING_BANNER_ACTIVE,
  SETTING_BANNER_IMAGE,
  SETTING_BANNER_LINK,
  SETTING_BANNER_SUBTITLE,
  SETTING_BANNER_TITLE,
} from "@/lib/constants";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const [active, imageKey, title, subtitle, link] = await Promise.all([
      getSetting(SETTING_BANNER_ACTIVE, "1"),
      getSetting(SETTING_BANNER_IMAGE, ""),
      getSetting(SETTING_BANNER_TITLE, ""),
      getSetting(SETTING_BANNER_SUBTITLE, ""),
      getSetting(SETTING_BANNER_LINK, ""),
    ]);

    return ok({
      active: active === "1",
      imageKey: imageKey || null,
      title: title || null,
      subtitle: subtitle || null,
      link: link || null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
