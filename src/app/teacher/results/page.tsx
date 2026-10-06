import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getTeacherClasses, getTeacherSubjects } from "@/lib/permissions";
import { getStudentExamRows, getStudentInfo, getDirectorSignatureInfo } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { PrintSignatures } from "@/components/app/print-signatures";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSetting } from "@/lib/db";
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
export const metadata = { title: "ফলাফল অনুসন্ধান" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ResultsPage({ searchParams }: { searchParams: SP }) {
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

  const allSubjects = await getTeacherSubjects(db, user.teacherId!);
  const classSubjects = allSubjects.filter((s) => s.class_name === className);

  // students of class+division for the picker
  const students = (
    await db
      .prepare(
        `SELECT st.id, st.name, st.roll FROM students st JOIN classes c ON c.id = st.class_id
         WHERE c.name = ? AND COALESCE(st.division, '') = COALESCE(?, '') ORDER BY st.roll`
      )
      .bind(className, division)
      .all<{ id: number; name: string; roll: number }>()
  ).results;

  const subjectRaw = one(sp.subject);
  const subjectId = subjectRaw && subjectRaw !== "all" && classSubjects.some((s) => String(s.id) === subjectRaw) ? Number(subjectRaw) : null;
  const monthRaw = one(sp.month);
  const month = monthRaw && monthRaw !== "all" ? Number(monthRaw) : null;
  const year = Number(one(sp.year)) || curYear;
  const studentId = Number(one(sp.student)) || null;

  const rows = studentId
    ? await getStudentExamRows(db, {
        studentId,
        subjectIds: subjectId ? [subjectId] : classSubjects.map((s) => s.id),
        month,
        year,
      })
    : [];
  const student = studentId ? await getStudentInfo(db, studentId) : null;

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const dirInfo = await getDirectorSignatureInfo(db);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">ফলাফল অনুসন্ধান</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">শ্রেণি, বিভাগ, শিক্ষার্থী, বিষয়, মাস ও বছর অনুযায়ী খুঁজুন।</p>
      </div>

      {/* filters */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/teacher/results" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
              <Select name="student" defaultValue={studentId ? String(studentId) : ""}>
                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} — রোল {bn(s.roll)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">বিষয়</Label>
              <Select name="subject" defaultValue={subjectId ? String(subjectId) : "all"}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব বিষয়</SelectItem>
                  {classSubjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">মাস</Label>
              <Select name="month" defaultValue={month ? String(month) : "all"}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব মাস</SelectItem>
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
              <Button type="submit" className="h-10 w-full">খুঁজুন</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* result display */}
      {student ? (
        <Card className="print-area">
          <CardContent className="pt-4">
            <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
              <ReportHeader
                academyName={academyName}
                logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                teacherName={`${user.name} (${user.shortName ?? ""})`}
                subtitle={`ফলাফল তালিকা — ${MONTHS_BN[(month ?? 1) - 1] ?? "সব মাস"} ${bn(year)}`}
              />

              {/* student info */}
              <div className="print-avoid-break mt-4 flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <StudentAvatar photoKey={student.photoKey} name={student.name} size="xl" />
                <div className="min-w-0">
                  <p className="text-lg font-bold">{student.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {classLabel(student.className)}
                    {student.division ? ` — ${divisionLabel(student.division)}` : ""}
                    {student.section ? ` • শাখা ${student.section}` : ""} • রোল {bn(student.roll)}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {month ? `${MONTHS_BN[month - 1]}` : "সব মাস"} • {bn(year)} • প্রাপ্ত ফলাফল: {bn(rows.length)} টি পরীক্ষা
                  </p>
                </div>
                <div className="ml-auto hidden print:block"><PrintButton /></div>
              </div>

              {/* table */}
              <div className="print-avoid-break mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-muted/60 text-left text-[12px]">
                      <th className="border border-border px-3 py-2 font-semibold">বিষয়</th>
                      <th className="border border-border px-3 py-2 font-semibold">পরীক্ষার নাম</th>
                      {!month && <th className="border border-border px-3 py-2 font-semibold">মাস</th>}
                      <th className="border border-border px-3 py-2 text-right font-semibold">মোট</th>
                      <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত</th>
                      <th className="border border-border px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                      <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                      <th className="border border-border px-3 py-2 text-center font-semibold">GPA</th>
                      <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={month ? 8 : 9} className="border border-border px-3 py-8 text-center text-muted-foreground">
                          এই তথ্য পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={i} className={cn(r.attendance === "ABSENT" && "bg-red-50/50")}>
                          <td className="border border-border px-3 py-2">{r.subjectName}</td>
                          <td className="border border-border px-3 py-2">{r.title} <span className="text-[11px] text-muted-foreground">({bn(r.examDate)})</span></td>
                          {!month && <td className="border border-border px-3 py-2">{MONTHS_BN[r.month - 1]}</td>}
                          <td className="border border-border px-3 py-2 text-right">{fmtNum(r.total)}</td>
                          <td className={cn("border border-border px-3 py-2 text-right font-semibold", r.attendance === "ABSENT" && "text-red-600")}>
                            {r.attendance === "ABSENT" ? `অনুপস্থিত (${fmtNum(r.obtained)})` : fmtNum(r.obtained)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right">{fmtNum(r.highest)}</td>
                          <td className="border border-border px-3 py-2 text-center font-semibold">{r.grade}</td>
                          <td className="border border-border px-3 py-2 text-center">{fmtGpa(r.gpa)}</td>
                          <td className="border border-border px-3 py-2 text-right">{fmtPct(r.percentage)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Point 08: Single teacher result print -> Both Teacher + Director signatures */}
              <PrintSignatures
                directorName={dirInfo.name}
                directorSignatureUrl={dirInfo.signatureUrl}
                directorInstitution={dirInfo.institution}
                teacherName={user.name}
                teacherSignatureUrl={user.signatureKey ? `/api/files/${user.signatureKey}` : null}
                teacherSubject="বিষয় শিক্ষক"
                isSingleTeacher={true}
                showGuardian={true}
              />

              <p className="mt-3 text-right text-[11px] text-muted-foreground print:block hidden">
                স্বয়ংক্রিয়ভাবে তৈরি — {APP_TITLE_LINE()}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="no-print rounded-xl border border-dashed border-border bg-white py-16 text-center text-muted-foreground">
          শিক্ষার্থী নির্বাচন করে &ldquo;খুঁজুন&rdquo; চাপুন।
        </div>
      )}

      {student && (
        <div className="no-print flex justify-center">
          <PrintButton label="প্রিন্ট করুন (A4) — PDF সংরক্ষণ করা যায়" />
        </div>
      )}
    </div>
  );
}

function APP_TITLE_LINE() {
  return "নম্বর সংগ্রহক ও রিপোর্ট সফটওয়্যার";
}
