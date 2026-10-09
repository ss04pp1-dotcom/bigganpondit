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
  const jar = await cookies();
  const sid = jar.get("sid");
  const db = await getDb();

  if (sid) {
    const user = await getCurrentUser(db);
    if (user) {
      return <RedirectClient to={roleHome(user.role)} />;
    }
  }

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const logoUrl = logoKey ? `/api/files/${logoKey}` : null;
  const demoHint = process.env.DEMO_HINT === "1";

  return (
    <LoginForm
      academyName={academyName}
      logoUrl={logoUrl}
      appTitle={APP_TITLE}
      demoHint={demoHint}
    />
  );
}
