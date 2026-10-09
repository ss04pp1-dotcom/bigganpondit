import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { MarksEntry } from "@/components/marks/marks-entry";
import { bn } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "পরীক্ষার নম্বর এন্ট্রি" };

interface AdminMarksPageProps {
  searchParams: Promise<{
    class?: string;
    division?: string;
    subjectId?: string;
  }>;
}

export default async function AdminMarksPage({ searchParams }: AdminMarksPageProps) {
  await requirePageUser(["ADMIN"]);
  const sp = await searchParams;
  const db = await getDb();

  const res = await db
    .prepare(
      `SELECT s.id, s.name, s.class_id, s.is_fourth_subject, c.name as class_name
       FROM subjects s JOIN classes c ON c.id = s.class_id
       ORDER BY c.sort_order DESC, s.name`
    )
    .all<{ id: number; name: string; class_name: string; class_id: number; is_fourth_subject: number }>()
    .catch(() => null);

  const subjects = res?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">পরীক্ষার নম্বর এন্ট্রি (প্রশাসক প্যানেল)</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          সকল শ্রেণি ও বিষয়ের নম্বর এন্ট্রি ও হালনাগাদ করার জন্য পূর্ণ নিয়ন্ত্রণ ({bn(subjects.length)} টি বিষয়)।
        </p>
      </div>
      <MarksEntry
        role="ADMIN"
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
