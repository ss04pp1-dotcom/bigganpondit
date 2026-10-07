import { redirect } from "next/navigation";
import { getDb, getSetting } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";
import { APP_TITLE, DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const db = await getDb();
  const user = await getCurrentUser(db);
  if (user) redirect(roleHome(user.role));

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
