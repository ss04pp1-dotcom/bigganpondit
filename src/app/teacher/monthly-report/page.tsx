import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { getTeacherClasses, getTeacherSubjects } from "@/lib/permissions";
import {
  buildMonthlyClassSummary,
  buildMonthlyReport,
  getDirectorSignatureInfo,
  getAllDirectorsList,
  getSubjectTeachersMap,
} from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { PrintSignatures } from "@/components/app/print-signatures";
import { OfficialResultCard } from "@/components/app/official-result-card";
import { CommentBox } from "@/components/reports/comment-box";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ACADEMY_NAME,
  DEFAULT_PUBLICATION_NAME,
  MONTHS_BN,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
  SETTING_PUBLICATION_LOGO,
  SETTING_PUBLICATION_NAME,
  bn,
  classLabel,
  divisionLabel,
  fmtGpa,
  fmtNum,
  fmtPct,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "মাসিক রিপোর্ট" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MonthlyReportPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["TEACHER"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  const allowedClasses = await getTeacherClasses(db, user.teacherId);
  const allDbClasses = (
    await db.prepare("SELECT name FROM classes ORDER BY sort_order DESC").all<{ name: string }>().catch(() => null)
  )?.results.map((r) => r.name) ?? ["10", "9", "8", "7", "6"];
  const activeClasses = allowedClasses.length > 0 ? allowedClasses : allDbClasses;

  const className = one(sp.class) && activeClasses.includes(one(sp.class)!) ? one(sp.class)! : activeClasses.includes("10") ? "10" : activeClasses[0] ?? "10";
  const requiresDiv = className === "9" || className === "10";
  const division = requiresDiv ? (one(sp.division) === "HUMANITIES" ? "HUMANITIES" : "SCIENCE") : null;
  const month = Number(one(sp.month)) || curMonth;
  const year = Number(one(sp.year)) || curYear;
  const mode = one(sp.mode)?.toUpperCase() === "MODEL" ? "MODEL" : "MONTHLY";

  const classRow = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(className).first<{ id: number }>(undefined as never).catch(() => null);
  const classId = classRow?.id ?? 0;

  const students = (
    await db
      .prepare(
        `SELECT st.id, st.name, st.roll FROM students st JOIN classes c ON c.id = st.class_id
         WHERE c.name = ? AND COALESCE(st.division, '') = COALESCE(?, '') ORDER BY st.roll`
      )
      .bind(className, division)
      .all<{ id: number; name: string; roll: number }>()
  ).results;

  const studentRaw = one(sp.student);
  const studentId = studentRaw && studentRaw !== "all" && students.some((s) => String(s.id) === studentRaw) ? Number(studentRaw) : null;

  // teacher-restricted subjects for the subject table (spec 31)
  const allSubjects = await getTeacherSubjects(db, user.teacherId!);
  const restricted = allSubjects.filter((s) => s.class_name === className).map((s) => s.id);

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const pubLogoKey = await getSetting(SETTING_PUBLICATION_LOGO, "");
  const publicationLogoUrl = pubLogoKey ? `/api/files/${pubLogoKey}` : null;
  const publicationName = await getSetting(SETTING_PUBLICATION_NAME, DEFAULT_PUBLICATION_NAME);
  const dirInfo = await getDirectorSignatureInfo(db);
  const availableDirectors = await getAllDirectorsList(db);
  const teacherMap = await getSubjectTeachersMap(db);

  const report = studentId && classId
    ? await buildMonthlyReport(db, { studentId, month, year, subjectIds: restricted, mode })
    : null;

  // cohort-wide position (all subjects, whole class)
  const summaryAll = classId
    ? await buildMonthlyClassSummary(db, { classId, division, month, year, subjectIds: null, mode })
    : null;
  const position = report && summaryAll ? summaryAll.entries.find((e) => e.studentId === studentId)?.position : undefined;

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">মাসিক রিপোর্ট</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          প্রতিটি বিষয়ের সব পরীক্ষা আলাদাভাবে এবং নিচে সমষ্টিগত ফলাফল দেখানো হয়।
        </p>
      </div>

      {/* filters */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/teacher/monthly-report" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-[12px]">শ্রেণি</Label>
              <Select name="class" defaultValue={className}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeClasses.map((c) => (
                    <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiresDiv && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">বিভাগ</Label>
                <Select name="division" defaultValue={division ?? "SCIENCE"}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCIENCE">বিজ্ঞান</SelectItem>
                    <SelectItem value="HUMANITIES">মানবিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[12px]">শিক্ষার্থী</Label>
              <Select name="student" defaultValue={studentId ? String(studentId) : "all"}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">সব শিক্ষার্থী</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} — রোল {bn(s.roll)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">ধরনের রিপোর্ট</Label>
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
            <div className="flex items-end">
              <Button type="submit" className="h-10 w-full">দেখান</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* individual report card (100% pixel-to-pixel copy of Image 1) */}
      {report ? (
        <OfficialResultCard
          mode={mode}
          month={month}
          year={year}
          student={{
            name: report.student.name,
            roll: report.student.roll,
            className: report.student.className,
            division: report.student.division,
            section: report.student.section,
          }}
          subjects={(report.subjects ?? []).map((s) => {
            const t = teacherMap.get(s.subjectId);
            const exams = report.examRowsBySubject?.get(s.subjectId) ?? [];
            const absCount = exams.filter((e) => e.attendance === "ABSENT").length;
            const attendance = absCount > 0 ? (absCount === 1 ? "A1" : `A${absCount}`) : "P";
            return {
              subjectId: s.subjectId,
              subjectName: s.subjectName,
              teacherName: t?.name ?? user.name,
              teacherShortName: t?.shortName ?? user.shortName,
              totalMarks: s.totalMarks,
              classHighest: s.classHighest,
              obtained: s.obtained,
              grade: s.grade,
              gpa: s.gpa,
              isFourth: s.isFourth,
              attendance,
            };
          })}
          overall={report.overall}
          position={position}
          directorInfo={dirInfo}
          availableDirectors={availableDirectors}
          logoUrl={logoKey ? `/api/files/${logoKey}` : null}
          publicationLogoUrl={publicationLogoUrl}
          publicationName={publicationName}
          defaultTab="ALL"
        />
      ) : (
        /* ---- All students class summary ---- */
        <>
          {summaryAll && summaryAll.entries.length > 0 ? (
            <>
              <Card className="print-area">
                <CardContent className="pt-4">
                  <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
                    <ReportHeader
                      academyName={academyName}
                      logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                      teacherName={`${user.name} (${user.shortName ?? ""})`}
                      subtitle={`ক্লাস সারসংক্ষেপ — ${classLabel(className)}${division ? ` — ${divisionLabel(division)}` : ""} • ${MONTHS_BN[month - 1]} ${bn(year)}`}
                    />
                    <div className="print-avoid-break mt-4 overflow-x-auto">
                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-muted/60 text-left text-[12px]">
                            <th className="border border-border px-3 py-2 font-semibold">অবস্থান</th>
                            <th className="border border-border px-3 py-2 font-semibold">রোল</th>
                            <th className="border border-border px-3 py-2 font-semibold">নাম</th>
                            <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত/মোট</th>
                            <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                            <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                            <th className="border border-border px-3 py-2 text-center font-semibold">GPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryAll.entries.map((e) => (
                            <tr key={e.studentId} className={cn(e.position <= 3 && "bg-amber-50/40")}>
                              <td className="border border-border px-3 py-2 font-bold text-primary">{bn(e.position)}</td>
                              <td className="border border-border px-3 py-2">{bn(e.roll)}</td>
                              <td className="border border-border px-3 py-2 font-medium">{e.name}</td>
                              <td className="border border-border px-3 py-2 text-right">
                                {fmtNum(e.totalObtained)} <span className="text-muted-foreground">/ {fmtNum(e.totalMarks)}</span>
                              </td>
                              <td className="border border-border px-3 py-2 text-right font-semibold">{fmtPct(e.percentage)}</td>
                              <td className="border border-border px-3 py-2 text-center font-semibold">{e.grade}</td>
                              <td className="border border-border px-3 py-2 text-center">{fmtGpa(e.gpa)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Point 08: All subjects/teachers summary -> Director signature only */}
                    <PrintSignatures
                      directorName={dirInfo.name}
                      directorSignatureUrl={dirInfo.signatureUrl}
                      directorInstitution={dirInfo.institution}
                      isSingleTeacher={false}
                      showGuardian={false}
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="no-print flex justify-center">
                <PrintButton label="প্রিন্ট করুন (A4)" />
              </div>
            </>
          ) : (
            <div className="no-print rounded-xl border border-dashed border-border bg-white py-16 text-center text-muted-foreground">
              এই মাসে কোনো ফলাফল পাওয়া যায়নি।
            </div>
          )}
        </>
      )}
    </div>
  );
}
