import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { getTeacherClasses, getTeacherSubjects } from "@/lib/permissions";
import { buildMonthlyClassSummary, buildMonthlyReport, getDirectorSignatureInfo } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { PrintSignatures } from "@/components/app/print-signatures";
import { CommentBox } from "@/components/reports/comment-box";
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
  const dirInfo = await getDirectorSignatureInfo(db);

  const report = studentId && classId
    ? await buildMonthlyReport(db, { studentId, month, year, subjectIds: restricted })
    : null;

  // cohort-wide position (all subjects, whole class)
  const summaryAll = classId
    ? await buildMonthlyClassSummary(db, { classId, division, month, year, subjectIds: null })
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

      {/* individual report card */}
      {report ? (
        <>
          <Card className="print-area">
            <CardContent className="pt-4">
              <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
                <ReportHeader
                  academyName={academyName}
                  logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                  teacherName={`${user.name} (${user.shortName ?? ""})`}
                  subtitle={`মাসিক ফলাফল রিপোর্ট — ${MONTHS_BN[month - 1]} ${bn(year)}`}
                />

                <div className="print-avoid-break mt-4 flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                  <StudentAvatar photoKey={report.student.photoKey} name={report.student.name} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{report.student.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {classLabel(report.student.className)}
                      {report.student.division ? ` — ${divisionLabel(report.student.division)}` : ""}
                      {report.student.section ? ` • শাখা ${report.student.section}` : ""} • রোল {bn(report.student.roll)}
                    </p>
                    <p className="text-[13px] text-muted-foreground">{MONTHS_BN[month - 1]} • {bn(year)}</p>
                  </div>
                </div>

                {/* subject table (spec 33) */}
                <div className="print-avoid-break mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-muted/60 text-left text-[12px]">
                        <th className="border border-border px-3 py-2 font-semibold">বিষয়</th>
                        <th className="border border-border px-3 py-2 text-right font-semibold">মোট নম্বর</th>
                        <th className="border border-border px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                        <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত</th>
                        <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                        <th className="border border-border px-3 py-2 text-center font-semibold">GPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.subjects.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-border px-3 py-8 text-center text-muted-foreground">
                            এই মাসে কোনো ফলাফল পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        report.subjects.flatMap((s) => {
                          const rows = report.examRowsBySubject.get(s.subjectId) ?? [];
                          return [
                            <tr key={`summary-${s.subjectId}`} className="bg-primary/5">
                              <td className="border border-border px-3 py-2 font-semibold">
                                {s.subjectName}
                                {s.isFourth ? <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">৪র্থ</span> : null}
                              </td>
                              <td className="border border-border px-3 py-2 text-right">{fmtNum(s.totalMarks)}</td>
                              <td className="border border-border px-3 py-2 text-right">{fmtNum(s.classHighest)}</td>
                              <td className="border border-border px-3 py-2 text-right font-semibold">{fmtNum(s.obtained)}</td>
                              <td className="border border-border px-3 py-2 text-center font-semibold">{s.grade}</td>
                              <td className="border border-border px-3 py-2 text-center">{fmtGpa(s.gpa)}</td>
                            </tr>,
                            ...rows.map((r) => (
                              <tr key={`exam-${r.examId}`} className="text-[12px] text-muted-foreground">
                                <td className="border border-border px-3 py-1.5 pl-7">↳ {r.title}</td>
                                <td className="border border-border px-3 py-1.5 text-right">{fmtNum(r.total)}</td>
                                <td className="border border-border px-3 py-1.5 text-right">{fmtNum(r.highest)}</td>
                                <td className="border border-border px-3 py-1.5 text-right">{fmtNum(r.obtained)}</td>
                                <td className="border border-border px-3 py-1.5 text-center">{r.grade}</td>
                                <td className="border border-border px-3 py-1.5 text-center">{fmtGpa(r.gpa)}</td>
                              </tr>
                            )),
                          ];
                        })
                      )}
                    </tbody>
                    {report.subjects.length > 0 && (
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold">
                          <td className="border border-border px-3 py-2">সর্বমোট</td>
                          <td className="border border-border px-3 py-2 text-right">{fmtNum(report.overall.totalMarks)}</td>
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2 text-right">{fmtNum(report.overall.obtained)}</td>
                          <td className="border border-border px-3 py-2 text-center">{report.overall.grade}</td>
                          <td className="border border-border px-3 py-2 text-center">{fmtGpa(report.overall.gpa)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* summary strip */}
                <div className="print-avoid-break mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">সার্বিক শতকরা</p>
                    <p className="text-xl font-bold">{fmtPct(report.overall.percentage)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">গ্রেড</p>
                    <p className="text-xl font-bold">{report.overall.grade}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">GPA</p>
                    <p className="text-xl font-bold">{fmtGpa(report.overall.gpa)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">মেধা অবস্থান</p>
                    <p className="text-xl font-bold text-primary">
                      {position ? `${bn(position)} / ${bn(summaryAll?.entries.length ?? 0)}` : "—"}
                    </p>
                  </div>
                </div>

                <CommentBox />

                {/* Point 08: Single teacher result print -> Both Teacher + Director signatures */}
                <PrintSignatures
                  directorName={dirInfo.name}
                  directorSignatureUrl={dirInfo.signatureUrl}
                  directorInstitution={dirInfo.institution}
                  teacherName={user.name}
                  teacherSignatureUrl={user.signatureKey ? `/api/files/${user.signatureKey}` : null}
                  teacherSubject={`${classLabel(className)} ${division ? divisionLabel(division) : ""}`}
                  isSingleTeacher={true}
                  showGuardian={true}
                />
              </div>
            </CardContent>
          </Card>
          <div className="no-print flex justify-center">
            <PrintButton label="প্রিন্ট করুন (A4) — PDF সংরক্ষণ করা যায়" />
          </div>
        </>
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
