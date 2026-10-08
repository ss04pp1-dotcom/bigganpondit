import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getTeacherSubjects } from "@/lib/permissions";
import { MarksEntry } from "@/components/marks/marks-entry";
import { bn } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "নম্বর দিন" };

interface MarksPageProps {
  searchParams: Promise<{
    class?: string;
    division?: string;
    subjectId?: string;
  }>;
}

export default async function MarksPage({ searchParams }: MarksPageProps) {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const sp = await searchParams;
  const db = await getDb();
  let subjects: { id: number; name: string; class_name: string; class_id: number; is_fourth_subject: number }[] = [];

  if (user.role === "ADMIN") {
    const res = await db
      .prepare(
        `SELECT s.id, s.name, s.class_id, s.is_fourth_subject, c.name as class_name
         FROM subjects s JOIN classes c ON c.id = s.class_id
         ORDER BY c.sort_order DESC, s.name`
      )
      .all<{ id: number; name: string; class_name: string; class_id: number; is_fourth_subject: number }>()
      .catch(() => null);
    subjects = res?.results ?? [];
  } else {
    subjects = (await getTeacherSubjects(db, user.teacherId!)) as unknown as typeof subjects;
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">পরীক্ষার নম্বর দিন</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {isAdmin
            ? `প্রশাসক মোড — সকল বিষয় উন্মুক্ত (${bn(subjects.length)} টি বিষয়)। সব হিসাব সার্ভারে যাচাই করা হয়।`
            : `শুধু আপনার অনুমোদিত বিষয়গুলো দেখানো হচ্ছে (${bn(subjects.length)} টি বিষয়)। সব হিসাব সার্ভারে যাচাই করা হয়।`}
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
        initialClass={sp.class}
        initialDivision={sp.division}
        initialSubjectId={sp.subjectId ? Number(sp.subjectId) : undefined}
      />
    </div>
  );
}
