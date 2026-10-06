import { requirePageUser } from "@/lib/auth/guards";
import { TeacherManager } from "@/components/admin/teacher-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষক" };

export default async function AdminTeachersPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">শিক্ষক ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          শিক্ষক যুক্ত/সম্পাদনা/মুছে ফেলুন — বিষয়ের অনুমতি ও পাসওয়ার্ড রিসেট সহ।
        </p>
      </div>
      <TeacherManager />
    </div>
  );
}
