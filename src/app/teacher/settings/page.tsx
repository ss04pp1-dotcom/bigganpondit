import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { ImageUpload } from "@/components/app/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_LOGO, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেটিংস" };

export default async function TeacherSettingsPage() {
  const user = await requirePageUser(["TEACHER"]);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">সেটিংস</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          একাডেমির লোগো ও আপনার স্বাক্ষর আপলোড করুন — এগুলো রিপোর্ট ও প্রিন্টে ব্যবহৃত হবে।
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">শিক্ষক প্রোফাইল</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <p className="text-[15px] font-semibold">{user.name}</p>
            <p className="text-[13px] text-muted-foreground">শিক্ষক আইডি (সংক্ষেপ): {user.shortName ?? "—"}</p>
            <p className="text-[13px] text-muted-foreground">ইউজারনেম: @{user.username}</p>
            <p className="text-[13px] text-muted-foreground">প্রতিষ্ঠান: {academyName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">আপলোড</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <ImageUpload
              type="logo"
              label="একাডেমির লোগো"
              currentUrl={logoKey ? `/api/files/${logoKey}` : null}
            />
            <ImageUpload
              type="signature"
              label="আপনার স্বাক্ষর (হাতের লেখা)"
              currentUrl={user.signatureKey ? `/api/files/${user.signatureKey}` : null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
