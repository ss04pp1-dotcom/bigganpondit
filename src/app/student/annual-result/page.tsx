import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
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

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
  const dirInfo = await getDirectorSignatureInfo(db);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">বার্ষিক ফলাফল</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">জানুয়ারি → ডিসেম্বর মাসিক পারফরম্যান্স + গ্রাফ (প্রিন্টে পৃষ্ঠা ২-এ)।</p>
      </div>

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

      <Card className="print-area">
        <CardContent className="pt-4">
          <div className="a4-sheet !max-w-none !border-0 !p-0 !shadow-none">
            <div className="print-page">
              <ReportHeader
                academyName={academyName}
                logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                subtitle={`বার্ষিক ফলাফল — ${bn(year)}`}
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
                      <th className="border border-border px-3 py-2 font-semibold">মাস</th>
                      <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত/মোট</th>
                      <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                      <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report!.annual.months.map((m) => (
                      <tr key={m.month} className={cn(m.percentage !== null && m.percentage < 33 && "bg-red-50/50")}>
                        <td className="border border-border px-3 py-2">{MONTHS_BN[m.month - 1]}</td>
                        <td className="border border-border px-3 py-2 text-right">
                          {m.percentage === null ? "—" : `${bn(m.obtained)} / ${bn(m.totalMarks)}`}
                        </td>
                        <td className="border border-border px-3 py-2 text-right font-semibold">
                          {m.percentage === null ? "N/A" : fmtPct(m.percentage)}
                        </td>
                        <td className="border border-border px-3 py-2 text-center">{m.percentage === null ? "—" : <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{report!.annual.overall.grade ?? ""}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-semibold">
                      <td className="border border-border px-3 py-2">সার্বিক ({bn(year)})</td>
                      <td className="border border-border px-3 py-2 text-right">
                        {report!.annual.overall.percentage === null ? "—" : `${bn(report!.annual.overall.obtained)} / ${bn(report!.annual.overall.totalMarks)}`}
                      </td>
                      <td className="border border-border px-3 py-2 text-right">
                        {report!.annual.overall.percentage === null ? "N/A" : fmtPct(report!.annual.overall.percentage)}
                      </td>
                      <td className="border border-border px-3 py-2 text-center">
                        {report!.annual.overall.grade ?? "—"}
                        {report!.annual.overall.gpa !== null && <span className="ml-1 text-muted-foreground">({fmtGpa(report!.annual.overall.gpa)})</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Point 08: Automatic Director signature on printed annual report */}
              <PrintSignatures
                directorName={dirInfo.name}
                directorSignatureUrl={dirInfo.signatureUrl}
                directorInstitution={dirInfo.institution}
                isSingleTeacher={false}
                showGuardian={true}
              />
            </div>

            <div className="print-page mt-6 print:mt-0">
              <div className="no-print mb-2 rounded-lg bg-muted/60 px-4 py-2 text-[12px] text-muted-foreground">
                প্রিন্টে এই গ্রাফটি আলাদা পৃষ্ঠায় (পৃষ্ঠা ২) আসবে।
              </div>
              <p className="mb-2 text-center text-[15px] font-bold">মাসিক পারফরম্যান্স গ্রাফ — {user.name} ({bn(year)})</p>
              <AnnualChart points={report!.annual.months.map((m) => ({ month: m.month, percentage: m.percentage }))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="no-print flex justify-center">
        <PrintButton label="প্রিন্ট করুন (A4) — গ্রাফ পৃষ্ঠা ২-এ" />
      </div>
    </div>
  );
}
