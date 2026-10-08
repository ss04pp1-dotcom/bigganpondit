import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import {
  buildStudentAnnualReport,
  getDirectorSignatureInfo,
  getAllDirectorsList,
  getStudentExamRows,
  getSubjectTeachersMap,
} from "@/lib/results/reports";
import { OfficialResultCard } from "@/components/app/official-result-card";
import { AnnualChart } from "@/components/app/annual-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PUBLICATION_NAME,
  MONTHS_BN,
  SETTING_ACADEMY_LOGO,
  SETTING_PUBLICATION_LOGO,
  SETTING_PUBLICATION_NAME,
  bn,
  fmtGpa,
  fmtNum,
  fmtPct,
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
  const availableDirectors = await getAllDirectorsList(db);
  const teacherMap = await getSubjectTeachersMap(db);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const logoUrl = logoKey ? `/api/files/${logoKey}` : null;
  const pubLogoKey = await getSetting(SETTING_PUBLICATION_LOGO, "");
  const publicationLogoUrl = pubLogoKey ? `/api/files/${pubLogoKey}` : null;
  const publicationName = await getSetting(SETTING_PUBLICATION_NAME, DEFAULT_PUBLICATION_NAME);

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

  const officialSubjects = [...bySub.entries()].map(([subId, s]) => {
    const t = teacherMap.get(subId);
    const pct = s.total > 0 ? (s.obtained / s.total) * 100 : 0;
    const gpa = pct >= 80 ? 5.0 : pct >= 70 ? 4.0 : pct >= 60 ? 3.5 : pct >= 50 ? 3.0 : pct >= 40 ? 2.0 : pct >= 33 ? 1.0 : 0.0;
    const grade = pct >= 80 ? "A+" : pct >= 70 ? "A" : pct >= 60 ? "A-" : pct >= 50 ? "B" : pct >= 40 ? "C" : pct >= 33 ? "D" : "F";
    return {
      subjectId: subId,
      subjectName: s.name,
      teacherName: t?.name,
      teacherShortName: t?.shortName,
      totalMarks: s.total,
      classHighest: s.total,
      obtained: s.obtained,
      grade,
      gpa,
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

      {/* 100% Pixel to Pixel Official Result Sheet & Booklet */}
      <OfficialResultCard
        mode="ANNUAL"
        year={year}
        student={{
          name: user.name,
          roll: user.roll ?? 1,
          className: user.className ?? "10",
          division: user.division,
          section: user.section,
        }}
        subjects={officialSubjects}
        overall={overall}
        directorInfo={dirInfo}
        availableDirectors={availableDirectors}
        logoUrl={logoUrl}
        publicationLogoUrl={publicationLogoUrl}
        publicationName={publicationName}
        defaultTab="ALL"
        showPrintButton={true}
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
                            {report.annual.overall.grade ?? ""}
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
