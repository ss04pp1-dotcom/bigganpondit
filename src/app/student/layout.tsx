import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { AppShell } from "@/components/app/shell";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser(["STUDENT"]);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        photoUrl: user.photoKey ? `/api/files/${user.photoKey}` : null,
      }}
      academyName={academyName}
      logoUrl={logoKey ? `/api/files/${logoKey}` : null}
    >
      {children}
    </AppShell>
  );
}
