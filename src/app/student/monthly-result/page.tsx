import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import {
  buildMonthlyClassSummary,
  buildMonthlyReport,
  getDirectorSignatureInfo,
  getAllDirectorsList,
  getSubjectTeachersMap,
} from "@/lib/results/reports";
import { OfficialResultCard } from "@/components/app/official-result-card";
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
} from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "মাসিক ফলাফল" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StudentMonthlyResult({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  const month = Number(one(sp.month)) || curMonth;
  const year = Number(one(sp.year)) || curYear;
  const mode = one(sp.mode)?.toUpperCase() === "MODEL" ? "MODEL" : "MONTHLY";

  const classRow = await db
    .prepare("SELECT id FROM classes WHERE name = ?")
    .bind(user.className)
    .first<{ id: number }>(undefined as never)
    .catch(() => null);
  const classId = classRow?.id ?? 0;

  const report = user.studentId && classId
    ? await buildMonthlyReport(db, { studentId: user.studentId, month, year, subjectIds: null, mode })
    : null;

  const summaryAll = classId
    ? await buildMonthlyClassSummary(db, { classId, division: user.division ?? null, month, year, subjectIds: null, mode })
    : null;
  const position = report && summaryAll ? summaryAll.entries.find((e) => e.studentId === user.studentId)?.position : undefined;

  const dirInfo = await getDirectorSignatureInfo(db);
  const availableDirectors = await getAllDirectorsList(db);
  const teacherMap = await getSubjectTeachersMap(db);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const logoUrl = logoKey ? `/api/files/${logoKey}` : null;
  const pubLogoKey = await getSetting(SETTING_PUBLICATION_LOGO, "");
  const publicationLogoUrl = pubLogoKey ? `/api/files/${pubLogoKey}` : null;
  const publicationName = await getSetting(SETTING_PUBLICATION_NAME, DEFAULT_PUBLICATION_NAME);

  const officialSubjects = (report?.subjects ?? []).map((s) => {
    const t = teacherMap.get(s.subjectId);
    const exams = report?.examRowsBySubject?.get(s.subjectId) ?? [];
    const absCount = exams.filter((e) => e.attendance === "ABSENT").length;
    const attendance = absCount > 0 ? (absCount === 1 ? "A1" : `A${absCount}`) : "P";
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      teacherName: t?.name,
      teacherShortName: t?.shortName,
      totalMarks: s.totalMarks,
      classHighest: s.classHighest,
      obtained: s.obtained,
      grade: s.grade,
      gpa: s.gpa,
      isFourth: s.isFourth,
      attendance,
    };
  });

  const overall = report?.overall ?? {
    totalMarks: 0,
    obtained: 0,
    grade: "F",
    gpa: 0,
    percentage: 0,
  };

  return (
    <div className="space-y-4">
      {/* Month/Year Filter (Hidden on Print) */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/student/monthly-result" className="grid grid-cols-2 gap-3 sm:w-96">
            <div className="space-y-1.5">
              <Label className="text-[12px]">ফলাফলের ধরন</Label>
              <Select name="mode" defaultValue={mode}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">মাসিক</SelectItem>
                  <SelectItem value="MODEL">মডেল টেস্ট</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">মাস</Label>
              <Select name="month" defaultValue={String(month)}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_BN.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="col-span-2 flex items-end">
              <Button type="submit" className="h-10 w-full">দেখান</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 100% Pixel to Pixel Official Result Card & Sheet */}
      <OfficialResultCard
        mode={mode}
        month={month}
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
        position={position}
        directorInfo={dirInfo}
        availableDirectors={availableDirectors}
        logoUrl={logoUrl}
        publicationLogoUrl={publicationLogoUrl}
        publicationName={publicationName}
        defaultTab="ALL"
        showPrintButton={true}
      />
    </div>
  );
}
