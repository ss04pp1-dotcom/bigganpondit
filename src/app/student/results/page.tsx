import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { getStudentExamRows, getDirectorSignatureInfo } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { PrintSignatures } from "@/components/app/print-signatures";
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
export const metadata = { title: "ফলাফল" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StudentResultsPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();

  // own subjects for the filter dropdown (IDOR-safe: identity from session)
  const subjects = (
    await db
      .prepare(
        `SELECT DISTINCT s.id, s.name FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
         WHERE m.student_id = ? ORDER BY s.name`
      )
      .bind(user.studentId)
      .all<{ id: number; name: string }>()
  ).results;

  const subjectRaw = one(sp.subject);
  const subjectId = subjectRaw && subjectRaw !== "all" && subjects.some((s) => String(s.id) === subjectRaw) ? Number(subjectRaw) : null;
  const monthRaw = one(sp.month);
  const month = monthRaw && monthRaw !== "all" ? Number(monthRaw) : null;
  const year = Number(one(sp.year)) || curYear;

  const rows = await getStudentExamRows(db, {
    studentId: user.studentId!,
    subjectIds: subjectId ? [subjectId] : null,
    month,
    year,
  });

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const dirInfo = await getDirectorSignatureInfo(db);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">আমার ফলাফল</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">বিষয় ও মাস অনুযায়ী আপনার নম্বর দেখুন।</p>
      </div>

      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/student/results" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">বিষয়</Label>
              <Select name="subject" defaultValue={subjectId ? String(subjectId) : "all"}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব বিষয়</SelectItem>
                  {subjects.map((s) => (
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
              <Button type="submit" className="h-10 w-full">দেখান</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="print-area">
        <CardContent className="pt-4">
          <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
            <ReportHeader
              academyName={academyName}
              logoUrl={logoKey ? `/api/files/${logoKey}` : null}
              subtitle={`ফলাফল তালিকা — ${month ? MONTHS_BN[month - 1] : "সব মাস"} ${bn(year)}`}
            />
            <div className="print-avoid-break mt-4 flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <StudentAvatar photoKey={user.photoKey} name={user.name} size="xl" />
              <div className="min-w-0">
                <p className="text-lg font-bold">{user.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {classLabel(user.className ?? "")}
                  {user.division ? ` — ${divisionLabel(user.division)}` : ""}
                  {user.section ? ` • শাখা ${user.section}` : ""} • রোল {bn(user.roll ?? 0)}
                </p>
              </div>
            </div>
            <div className="print-avoid-break mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[12px]">
                    <th className="border border-border px-3 py-2 font-semibold">বিষয়</th>
                    <th className="border border-border px-3 py-2 font-semibold">পরীক্ষা</th>
                    {!month && <th className="border border-border px-3 py-2 font-semibold">মাস</th>}
                    <th className="border border-border px-3 py-2 text-right font-semibold">মোট</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={month ? 7 : 8} className="border border-border px-3 py-10 text-center text-muted-foreground">
                        এই তথ্য পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={i} className={cn(r.attendance === "ABSENT" && "bg-red-50/50")}>
                        <td className="border border-border px-3 py-2">{r.subjectName}</td>
                        <td className="border border-border px-3 py-2">{r.title}</td>
                        {!month && <td className="border border-border px-3 py-2">{MONTHS_BN[r.month - 1]}</td>}
                        <td className="border border-border px-3 py-2 text-right">{fmtNum(r.total)}</td>
                        <td className={cn("border border-border px-3 py-2 text-right font-semibold", r.attendance === "ABSENT" && "text-red-600")}>
                          {r.attendance === "ABSENT" ? `অনুপস্থিত (${fmtNum(r.obtained)})` : fmtNum(r.obtained)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">{fmtNum(r.highest)}</td>
                        <td className="border border-border px-3 py-2 text-center font-semibold">{r.grade}</td>
                        <td className="border border-border px-3 py-2 text-center">{fmtGpa(r.gpa)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Point 08: Automatic Director signature on printed sheet */}
            <PrintSignatures
              directorName={dirInfo.name}
              directorSignatureUrl={dirInfo.signatureUrl}
              directorInstitution={dirInfo.institution}
              isSingleTeacher={false}
              showGuardian={true}
            />
          </div>
        </CardContent>
      </Card>
      <div className="no-print flex justify-center">
        <PrintButton label="প্রিন্ট করুন (A4)" />
      </div>
    </div>
  );
}
