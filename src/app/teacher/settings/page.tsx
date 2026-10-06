import { requirePageUser } from "@/lib/auth/guards";
import { getSetting } from "@/lib/db";
import { ImageUpload } from "@/components/app/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেটিংস" };

export default async function TeacherSettingsPage() {
  const user = await requirePageUser(["TEACHER"]);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">সেটিংস</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          আপনার প্রোফাইল ছবি ও স্বাক্ষর আপলোড করুন — স্বাক্ষর পরীক্ষার ফলাফল ও রিপোর্ট কার্ডে ব্যবহৃত হবে।
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">শিক্ষক প্রোফাইল</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-3">
              {user.photoKey ? (
                <img
                  src={`/api/files/${user.photoKey}`}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {user.shortName ?? user.name.slice(0, 2)}
                </div>
              )}
              <div>
                <p className="text-[16px] font-bold text-slate-800">{user.name}</p>
                <p className="text-[12px] text-muted-foreground">আইডি সংক্ষেপ: <span className="font-semibold text-slate-700">{user.shortName ?? "—"}</span></p>
                <p className="text-[12px] text-muted-foreground">ইউজারনেম: <span className="font-mono text-slate-700">@{user.username}</span></p>
              </div>
            </div>
            <div className="space-y-1.5 text-[13px] border-t border-border pt-3">
              <p className="text-muted-foreground">প্রতিষ্ঠান: <span className="font-medium text-slate-800">{academyName}</span></p>
              <p className="text-muted-foreground">ভূমিকা: <span className="font-medium text-blue-700">বিষয় শিক্ষক</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">ছবি ও স্বাক্ষর আপলোড</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <ImageUpload
              type="teacher-photo"
              teacherId={user.teacherId}
              label="আপনার প্রোফাইল ছবি"
              currentUrl={user.photoKey ? `/api/files/${user.photoKey}` : null}
            />
            <ImageUpload
              type="signature"
              teacherId={user.teacherId}
              label="আপনার স্বাক্ষর (হাতের লেখা)"
              currentUrl={user.signatureKey ? `/api/files/${user.signatureKey}` : null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
