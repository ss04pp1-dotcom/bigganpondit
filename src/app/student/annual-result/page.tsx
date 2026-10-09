import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import {
  buildStudentAnnualReport,
  getDirectorSignatureInfo,
  getStudentExamRows,
  getSubjectTeachersMap,
} from "@/lib/results/reports";
import { StudentMarksheet } from "@/components/students/student-marksheet";
import { AnnualChart } from "@/components/app/annual-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ACADEMY_NAME,
  MONTHS_BN,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
  bn,
  fmtGpa,
  fmtNum,
  fmtPct,
  gradeFromPercentage,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "বার্ষিক ফলাফল" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StudentAnnualPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();
  const year = Number(one(sp.year)) || curYear;

  const report = await buildStudentAnnualReport(db, { studentId: user.studentId!, year, subjectIds: null });
  const dirInfo = await getDirectorSignatureInfo(db);
  const teacherMap = await getSubjectTeachersMap(db);
  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const logoUrl = logoKey ? `/api/files/${logoKey}` : null;

  const examRows = await getStudentExamRows(db, {
    studentId: user.studentId!,
    year,
    subjectIds: null,
  });

  const bySub = new Map<number, { name: string; isFourth: boolean; total: number; obtained: number }>();
  for (const r of examRows) {
    const cur = bySub.get(r.subjectId) ?? { name: r.subjectName, isFourth: r.subjectIsFourth, total: 0, obtained: 0 };
    cur.total += r.total;
    cur.obtained += r.obtained;
    bySub.set(r.subjectId, cur);
  }

  // REAL per-subject class highest (published marks, whole class) — was
  // previously fabricated as the subject's full marks, implying the student
  // always scored 100%.
  const classHighestBySubject = new Map<number, number>();
  {
    const stRow = await db
      .prepare("SELECT class_id FROM students WHERE id = ?")
      .bind(user.studentId)
      .first<{ class_id: number }>()
      .catch(() => null);
    if (stRow?.class_id) {
      const rows = (
        (await db
          .prepare(
            `SELECT m.student_id, e.subject_id, SUM(m.obtained_marks) as obtained_marks
             FROM marks m JOIN exams e ON e.id = m.exam_id JOIN students st ON st.id = m.student_id
             WHERE st.class_id = ? AND e.year = ? AND COALESCE(e.is_published, 0) = 1
             GROUP BY m.student_id, e.subject_id`
          )
          .bind(stRow.class_id, year)
          .all<{ student_id: number; subject_id: number; obtained_marks: number }>()
          .catch(() => null))?.results
      ) ?? [];
      for (const r of rows) {
        const cur = classHighestBySubject.get(r.subject_id) ?? -1;
        const ob = Number(r.obtained_marks) || 0;
        if (ob > cur) classHighestBySubject.set(r.subject_id, ob);
      }
    }
  }

  const officialSubjects = [...bySub.entries()].map(([subId, s]) => {
    const t = teacherMap.get(subId);
    const pct = s.total > 0 ? (s.obtained / s.total) * 100 : 0;
    // single source of truth for the grade scale (was a duplicated inline
    // table that could drift from the engine)
    const g = gradeFromPercentage(pct);
    return {
      subjectId: subId,
      subjectName: s.name,
      teacherName: t?.name,
      teacherShortName: t?.shortName,
      totalMarks: s.total,
      classHighest: classHighestBySubject.get(subId) ?? s.obtained,
      obtained: s.obtained,
      grade: g.grade,
      gpa: g.gpa,
      isFourth: s.isFourth,
    };
  });

  const overall = {
    totalMarks: officialSubjects.reduce((acc, s) => acc + s.totalMarks, 0),
    obtained: officialSubjects.reduce((acc, s) => acc + s.obtained, 0),
    grade: report?.annual.overall.grade ?? "—",
    gpa: report?.annual.overall.gpa ?? 0,
    percentage: report?.annual.overall.percentage ?? 0,
  };

  return (
    <div className="space-y-4">
      {/* Year filter (Hidden on Print) */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/student/annual-result" className="grid grid-cols-2 gap-3 sm:w-96">
            <div className="space-y-1.5">
              <Label className="text-[12px]">বছর</Label>
              <Select name="year" defaultValue={String(year)}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[curYear + 1, curYear, curYear - 1, curYear - 2, curYear - 3].map((y) => (
                    <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="h-10 w-full">দেখান</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ডেডিকেটেড স্টুডেন্ট একাডেমিক মার্কশিট (এডমিনের রেজাল্ট কার্ড নয়) */}
      <StudentMarksheet
        title="বার্ষিক একাডেমিক মার্কশিট"
        sessionText={`শিক্ষাবর্ষ: ${bn(year)}`}
        student={{
          name: user.name,
          roll: user.roll ?? 1,
          className: user.className ?? "10",
          division: user.division,
          section: user.section,
          photoKey: user.photoKey,
          username: user.username,
        }}
        subjects={officialSubjects}
        overall={overall}
        directorInfo={dirInfo}
        academyName={academyName}
        logoUrl={logoUrl}
      />

      {/* 12 Months Progress & Graph */}
      {report && (
        <Card className="no-print">
          <CardContent className="pt-4 space-y-4">
            <h2 className="text-base font-bold text-slate-900">১২ মাসের অগ্রগতি ও পারফরম্যান্স গ্রাফ</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[12px]">
                    <th className="border border-border px-3 py-2 font-semibold">মাস</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত/মোট</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                  </tr>
                </thead>
                <tbody>
                  {report.annual.months.map((m) => (
                    <tr key={m.month} className={cn(m.percentage !== null && m.percentage < 33 && "bg-red-50/50")}>
                      <td className="border border-border px-3 py-2">{MONTHS_BN[m.month - 1]}</td>
                      <td className="border border-border px-3 py-2 text-right">
                        {m.percentage === null ? "—" : `${bn(m.obtained)} / ${bn(m.totalMarks)}`}
                      </td>
                      <td className="border border-border px-3 py-2 text-right font-semibold">
                        {m.percentage === null ? "N/A" : fmtPct(m.percentage)}
                      </td>
                      <td className="border border-border px-3 py-2 text-center">
                        {m.percentage === null ? "—" : (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {/* per-MONTH grade (was: the ANNUAL overall grade
                                repeated on every month's row) */}
                            {gradeFromPercentage(m.percentage).grade}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <p className="mb-2 text-center text-[15px] font-bold">মাসিক পারফরম্যান্স গ্রাফ — {user.name} ({bn(year)})</p>
              <AnnualChart points={report.annual.months.map((m) => ({ month: m.month, percentage: m.percentage }))} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
