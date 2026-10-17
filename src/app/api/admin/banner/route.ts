// /api/admin/banner — Update promotional banner settings (Admin only)
import { requireApiUser } from "@/lib/auth/guards";
import { setSetting } from "@/lib/db";
import {
  SETTING_BANNER_ACTIVE,
  SETTING_BANNER_IMAGE,
  SETTING_BANNER_LINK,
  SETTING_BANNER_SUBTITLE,
  SETTING_BANNER_TITLE,
} from "@/lib/constants";
import { assertSameOrigin, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);

    const body = (await req.json().catch(() => ({}))) as {
      active?: boolean;
      imageKey?: string;
      title?: string;
      subtitle?: string;
      link?: string;
    };

    if (body.active !== undefined) {
      await setSetting(SETTING_BANNER_ACTIVE, body.active ? "1" : "0");
    }
    if (body.imageKey !== undefined) {
      await setSetting(SETTING_BANNER_IMAGE, body.imageKey.trim());
    }
    if (body.title !== undefined) {
      await setSetting(SETTING_BANNER_TITLE, body.title.trim());
    }
    if (body.subtitle !== undefined) {
      await setSetting(SETTING_BANNER_SUBTITLE, body.subtitle.trim());
    }
    if (body.link !== undefined) {
      await setSetting(SETTING_BANNER_LINK, body.link.trim());
    }

    return ok({ message: "ব্যানার সেটিংস সফলভাবে আপডেট করা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
