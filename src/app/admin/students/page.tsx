import { requirePageUser } from "@/lib/auth/guards";
import { StudentManager } from "@/components/students/student-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষার্থী" };

export default async function AdminStudentsPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">শিক্ষার্থী ব্যবস্থাপনা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          সব শিক্ষার্থী — যুক্ত/সম্পাদনা/মুছে ফেলুন, শিক্ষকের পাঠানো অনুরোধ অনুমোদন এবং ছবি ও পাসওয়ার্ড ব্যবস্থাপনা।
        </p>
      </div>
      <StudentManager role="ADMIN" />
    </div>
  );
}
