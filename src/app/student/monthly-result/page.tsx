import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { buildMonthlyClassSummary, buildMonthlyReport } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
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

export const dynamic = "force-dynamic";
export const metadata = { title: "মাসিক ফলাফল" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StudentMonthlyPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();
  const sp = await searchParams;
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  const month = Number(one(sp.month)) || curMonth;
  const year = Number(one(sp.year)) || curYear;

  const report = await buildMonthlyReport(db, { studentId: user.studentId!, month, year, subjectIds: null });

  // cohort-wide position among classmates (all subjects)
  const classRow = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(user.className ?? "10").first<{ id: number }>(undefined as never).catch(() => null);
  const summaryAll = classRow
    ? await buildMonthlyClassSummary(db, { classId: classRow.id, division: user.division ?? null, month, year, subjectIds: null })
    : null;
  const position = summaryAll?.entries.find((e) => e.studentId === user.studentId)?.position;

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">মাসিক ফলাফল</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">বিষয়ভিত্তিক সমষ্টি (প্রাপ্ত/মোট) — এক মাসের সব পরীক্ষা একত্রে।</p>
      </div>

      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/student/monthly-result" className="grid grid-cols-3 gap-3">
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

      <Card className="print-area">
        <CardContent className="pt-4">
          <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
            <ReportHeader
              academyName={academyName}
              logoUrl={logoKey ? `/api/files/${logoKey}` : null}
              subtitle={`মাসিক ফলাফল — ${MONTHS_BN[month - 1]} ${bn(year)}`}
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
                <p className="text-[13px] text-muted-foreground">{MONTHS_BN[month - 1]} • {bn(year)}</p>
              </div>
            </div>

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
                  {(report?.subjects ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-border px-3 py-10 text-center text-muted-foreground">
                        এই মাসে কোনো ফলাফল পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    report!.subjects.map((s) => (
                      <tr key={s.subjectId}>
                        <td className="border border-border px-3 py-2">
                          {s.subjectName}
                          {s.isFourth ? <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">৪র্থ</span> : null}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">{fmtNum(s.totalMarks)}</td>
                        <td className="border border-border px-3 py-2 text-right">{fmtNum(s.classHighest)}</td>
                        <td className="border border-border px-3 py-2 text-right font-semibold">{fmtNum(s.obtained)}</td>
                        <td className="border border-border px-3 py-2 text-center font-semibold">{s.grade}</td>
                        <td className="border border-border px-3 py-2 text-center">{fmtGpa(s.gpa)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report && report.subjects.length > 0 && (
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

            {report && report.subjects.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#bce6ce] bg-[#f0fbf5] p-3.5 shadow-xs">
                <div className="text-[14px] font-bold text-[#142942]">
                  মোট GPA: <span className="text-[#0d6efd] text-[16px] font-extrabold">{fmtGpa(report.overall.gpa)}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#d8f6e5] px-4 py-1.5 text-[12px] font-bold text-[#0e7441] border border-[#b4ecc9] shadow-xs">
                  <span>🎉</span>
                  <span>{report.overall.gpa >= 3.0 ? "অভিনন্দন! আপনি ভালো করেছেন!" : "ভালো হয়েছে, আরো চেষ্টা করুন!"}</span>
                </div>
              </div>
            )}

            <div className="print-avoid-break mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">শতকরা</p>
                <p className="text-xl font-bold">{report ? fmtPct(report.overall.percentage) : "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">গ্রেড</p>
                <p className="text-xl font-bold">{report?.overall.grade ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">GPA</p>
                <p className="text-xl font-bold">{report ? fmtGpa(report.overall.gpa) : "—"}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">মেধা অবস্থান</p>
                <p className="text-xl font-bold text-primary">
                  {position ? `${bn(position)} / ${bn(summaryAll?.entries.length ?? 0)}` : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="no-print flex justify-center">
        <PrintButton label="প্রিন্ট করুন (A4) — PDF সংরক্ষণ করা যায়" />
      </div>
    </div>
  );
}
