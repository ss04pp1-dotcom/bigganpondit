import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { AdminSettingsForm } from "@/components/admin/settings-form";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেটিংস" };

export default async function AdminSettingsPage() {
  await requirePageUser(["ADMIN"]);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">সিস্টেম সেটিংস</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">একাডেমির নাম ও লোগো নির্ধারণ করুন।</p>
      </div>
      <AdminSettingsForm initialName={academyName} logoKey={logoKey || null} />
    </div>
  );
}
