import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { AdminSettingsForm } from "@/components/admin/settings-form";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME, SETTING_ADMIN_EMAIL, SETTING_RESEND_FROM } from "@/lib/constants";
import { getResendApiKey } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেটিংস" };

export default async function AdminSettingsPage() {
  const user = await requirePageUser(["ADMIN"]);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const coverBgKey = (await getSetting("card_cover_bg_url", "")) || (await getSetting("card_bg_image_key", ""));
  const adminEmail = await getSetting(SETTING_ADMIN_EMAIL, "");
  const hasResendKey = !!(await getResendApiKey());
  const resendFromEmail = await getSetting(SETTING_RESEND_FROM, "");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">সিস্টেম সেটিংস ও নিরাপত্তা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          একাডেমির নাম, লোগো, রেজাল্ট কার্ড কভার ব্যাকগ্রাউন্ড, অ্যাডমিন ইউজারনেম/পাসওয়ার্ড ও রিকভারি ইমেইল ব্যবস্থাপনা।
        </p>
      </div>
      <AdminSettingsForm
        initialName={academyName}
        logoKey={logoKey || null}
        initialCoverBg={coverBgKey || null}
        adminUser={{ name: user.name, username: user.username }}
        initialAdminEmail={adminEmail}
        hasResendKey={hasResendKey}
        initialResendFrom={resendFromEmail}
      />
    </div>
  );
}
