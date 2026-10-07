import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getTeacherSubjects } from "@/lib/permissions";
import { MarksEntry } from "@/components/marks/marks-entry";
import { bn } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "নম্বর দিন" };

export default async function MarksPage() {
  const user = await requirePageUser(["TEACHER"]);
  const db = await getDb();
  const subjects = await getTeacherSubjects(db, user.teacherId!);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">পরীক্ষার নম্বর দিন</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          শুধু আপনার অনুমোদিত বিষয়গুলো দেখানো হচ্ছে ({bn(subjects.length)} টি বিষয়)। সব হিসাব সার্ভারে যাচাই করা হয়।
        </p>
      </div>
      <MarksEntry
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          className: s.class_name,
          classId: s.class_id,
          isFourth: Number(s.is_fourth_subject) === 1,
        }))}
      />
    </div>
  );
}
