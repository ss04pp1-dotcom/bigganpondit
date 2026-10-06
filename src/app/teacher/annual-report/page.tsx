import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { getTeacherClasses } from "@/lib/permissions";
import { buildStudentAnnualReport, getDirectorSignatureInfo } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { PrintSignatures } from "@/components/app/print-signatures";
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
  classLabel,
  divisionLabel,
  fmtGpa,
  fmtPct,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "বার্ষিক রিপোর্ট" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AnnualReportPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["TEACHER"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();

  const allowedClasses = await getTeacherClasses(db, user.teacherId);
  const allDbClasses = (
    await db.prepare("SELECT name FROM classes ORDER BY sort_order DESC").all<{ name: string }>().catch(() => null)
  )?.results.map((r) => r.name) ?? ["10", "9", "8", "7", "6"];
  const activeClasses = allowedClasses.length > 0 ? allowedClasses : allDbClasses;

  const className = one(sp.class) && activeClasses.includes(one(sp.class)!) ? one(sp.class)! : activeClasses.includes("10") ? "10" : activeClasses[0] ?? "10";
  const requiresDiv = className === "9" || className === "10";
  const division = requiresDiv ? (one(sp.division) === "HUMANITIES" ? "HUMANITIES" : "SCIENCE") : null;
  const year = Number(one(sp.year)) || curYear;

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
  const studentId = studentRaw && students.some((s) => String(s.id) === studentRaw) ? Number(studentRaw) : null;

  const report = studentId ? await buildStudentAnnualReport(db, { studentId, year, subjectIds: null }) : null;

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const dirInfo = await getDirectorSignatureInfo(db);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">বার্ষিক রিপোর্ট</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          জানুয়ারি → ডিসেম্বর মাসিক পারফরম্যান্স + বহুরঙা লাইন গ্রাফ (প্রিন্টে পৃষ্ঠা ২-এ)।
        </p>
      </div>

      {/* filters */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/teacher/annual-report" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
              <Select name="student" defaultValue={studentId ? String(studentId) : students[0] ? String(students[0].id) : ""}>
                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} — রোল {bn(s.roll)}</SelectItem>
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

      {report ? (
        <>
          <Card className="print-area">
            <CardContent className="pt-4">
              <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
                {/* page 1: table */}
                <div className="print-page">
                  <ReportHeader
                    academyName={academyName}
                    logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                    teacherName={`${user.name} (${user.shortName ?? ""})`}
                    subtitle={`বার্ষিক ফলাফল রিপোর্ট — ${bn(year)}`}
                  />
                  <div className="print-avoid-break mt-4 flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                    <StudentAvatar photoKey={report.student.photoKey} name={report.student.name} size="xl" />
                    <div className="min-w-0">
                      <p className="text-lg font-bold">{report.student.name}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {classLabel(report.student.className)}
                        {report.student.division ? ` — ${divisionLabel(report.student.division)}` : ""}
                        {report.student.section ? ` • শাখা ${report.student.section}` : ""} • রোল {bn(report.student.roll)}
                      </p>
                      <p className="text-[13px] text-muted-foreground">বছর: {bn(year)}</p>
                    </div>
                  </div>

                  <div className="print-avoid-break mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-muted/60 text-left text-[12px]">
                          <th className="border border-border px-3 py-2 font-semibold">মাস</th>
                          <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত/মোট</th>
                          <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                          <th className="border border-border px-3 py-2 text-center font-semibold">অবস্থা</th>
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
                              {m.percentage === null ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">N/A</span>
                              ) : m.percentage >= 80 ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">চমৎকার</span>
                              ) : m.percentage >= 33 ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">উত্তীর্ণ</span>
                              ) : (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">ব্যর্থ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold">
                          <td className="border border-border px-3 py-2">সার্বিক ({bn(year)})</td>
                          <td className="border border-border px-3 py-2 text-right">
                            {report.annual.overall.percentage === null ? "—" : `${bn(report.annual.overall.obtained)} / ${bn(report.annual.overall.totalMarks)}`}
                          </td>
                          <td className="border border-border px-3 py-2 text-right">
                            {report.annual.overall.percentage === null ? "N/A" : fmtPct(report.annual.overall.percentage)}
                          </td>
                          <td className="border border-border px-3 py-2 text-center">
                            {report.annual.overall.grade ?? "—"}
                            {report.annual.overall.gpa !== null && <span className="ml-1 text-muted-foreground">({fmtGpa(report.annual.overall.gpa)})</span>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Point 08: Page 1 Marksheet table signatures */}
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

                {/* page 2: graph */}
                <div className="print-page mt-6 print:mt-0">
                  <div className="no-print mb-2 rounded-lg bg-muted/60 px-4 py-2 text-[12px] text-muted-foreground">
                    প্রিন্টে এই গ্রাফটি আলাদা পৃষ্ঠায় (পৃষ্ঠা ২) আসবে।
                  </div>
                  <p className="mb-2 text-center text-[15px] font-bold">মাসিক পারফরম্যান্স গ্রাফ — {report.student.name} ({bn(year)})</p>
                  <AnnualChart points={report.annual.months.map((m) => ({ month: m.month, percentage: m.percentage }))} />
                  {/* Point 08: Single teacher annual report print -> Both Teacher + Director signatures */}
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
              </div>
            </CardContent>
          </Card>
          <div className="no-print flex justify-center">
            <PrintButton label="প্রিন্ট করুন (A4) — গ্রাফ পৃষ্ঠা ২-এ" />
          </div>
        </>
      ) : (
        <div className="no-print rounded-xl border border-dashed border-border bg-white py-16 text-center text-muted-foreground">
          এই শ্রেণি/বিভাগে কোনো শিক্ষার্থী নেই।
        </div>
      )}
    </div>
  );
}
