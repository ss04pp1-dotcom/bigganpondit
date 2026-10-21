// Root entry: Public landing page showcasing academy courses & features,
// with a top-right Login button (and Dashboard link if already signed in).

import { cookies } from "next/headers";
import { getDb, getSetting } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/guards";
import { PublicLanding } from "@/components/landing/public-landing";
import {
  APP_TITLE,
  DEFAULT_ACADEMY_NAME,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
} from "@/lib/constants";
import {
  DEFAULT_LANDING_CONFIG,
  SETTING_LANDING_PAGE,
  parseLandingConfig,
} from "@/lib/landing-config";

export const dynamic = "force-dynamic";

export default async function Home() {
  let db = null;
  let dbError: string | null = null;

  try {
    db = await getDb();
  } catch (err: unknown) {
    console.error("[Home] Database initialization error:", err);
    dbError = (err as Error)?.message || String(err);
  }

  let dashboardUrl: string | null = null;
  let isAdmin = false;

  if (db) {
    try {
      const jar = await cookies();
      const sid = jar.get("sid");

      if (sid) {
        const user = await getCurrentUser(db);
        if (user) {
          dashboardUrl = roleHome(user.role);
          isAdmin = user.role === "ADMIN" || user.role === "DIRECTOR";
        }
      }
    } catch (sessionErr) {
      console.warn("[Home] Session verification notice:", sessionErr);
    }
  }

  let academyName = DEFAULT_ACADEMY_NAME;
  let logoUrl: string | null = null;
  let landingConfig = DEFAULT_LANDING_CONFIG;

  if (db) {
    try {
      academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
      const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
      logoUrl = logoKey ? `/api/files/${logoKey}` : null;
      const rawLanding = await getSetting(SETTING_LANDING_PAGE, "");
      landingConfig = parseLandingConfig(rawLanding);
    } catch (settingsErr) {
      console.warn("[Home] Settings fetch notice:", settingsErr);
    }
  }

  return (
    <>
      {dbError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-center text-xs font-medium">
          সতর্কতা: ডেটাবেস সংযোগ বিচ্ছিন্ন ({dbError})। Cloudflare D1 বাইন্ডিং ও wrangler.toml পরীক্ষা করুন।
        </div>
      )}
      <PublicLanding
        academyName={academyName}
        logoUrl={logoUrl}
        appTitle={APP_TITLE}
        config={landingConfig}
        dashboardUrl={dashboardUrl}
        isAdmin={isAdmin}
      />
    </>
  );
}
