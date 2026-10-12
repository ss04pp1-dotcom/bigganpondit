// Root entry: send the user to the right dashboard (or login).

import { cookies } from "next/headers";
import { getDb, getSetting } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/guards";
import { LoginForm } from "./(auth)/login/login-form";
import { RedirectClient } from "@/components/app/redirect-client";
import { APP_TITLE, DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME } from "@/lib/constants";

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

  if (db) {
    try {
      const jar = await cookies();
      const sid = jar.get("sid");

      if (sid) {
        const user = await getCurrentUser(db);
        if (user) {
          return <RedirectClient to={roleHome(user.role)} />;
        }
      }
    } catch (sessionErr) {
      console.warn("[Home] Session verification notice:", sessionErr);
    }
  }

  let academyName = DEFAULT_ACADEMY_NAME;
  let logoUrl: string | null = null;

  if (db) {
    try {
      academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
      const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
      logoUrl = logoKey ? `/api/files/${logoKey}` : null;
    } catch (settingsErr) {
      console.warn("[Home] Settings fetch notice:", settingsErr);
    }
  }

  const demoHint = process.env.DEMO_HINT === "1";

  return (
    <>
      {dbError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-center text-xs font-medium">
          সতর্কতা: ডেটাবেস সংযোগ বিচ্ছিন্ন ({dbError})। Cloudflare D1 বাইন্ডিং ও wrangler.toml পরীক্ষা করুন।
        </div>
      )}
      <LoginForm
        academyName={academyName}
        logoUrl={logoUrl}
        appTitle={APP_TITLE}
        demoHint={demoHint}
      />
    </>
  );
}
