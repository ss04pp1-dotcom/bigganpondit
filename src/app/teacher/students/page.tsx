import { requirePageUser } from "@/lib/auth/guards";
import { StudentManager } from "@/components/students/student-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষার্থী" };

export default async function StudentsPage() {
  await requirePageUser(["TEACHER"]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">শিক্ষার্থী তালিকা ও খুঁজুন</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          শ্রেণি ও বিভাগ অনুযায়ী গ্রুপ করা — রোল ক্রমে সাজানো।
        </p>
      </div>
      <StudentManager />
    </div>
  );
}
