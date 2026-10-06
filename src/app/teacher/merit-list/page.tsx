import { requirePageUser } from "@/lib/auth/guards";
import { getDb, getSetting } from "@/lib/db";
import { getTeacherClasses } from "@/lib/permissions";
import { buildMonthlyClassSummary } from "@/lib/results/reports";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { MeritPodium } from "@/components/app/merit-podium";
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
export const metadata = { title: "মেধা তালিকা" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MeritListPage({ searchParams }: { searchParams: SP }) {
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
  const summary = classRow
    ? await buildMonthlyClassSummary(db, { classId: classRow.id, division, month, year, subjectIds: null })
    : { entries: [], subjectNames: new Map() };

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-xl font-bold">মেধা তালিকা</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          অগ্রাধিকার: শতকরা → মোট প্রাপ্ত → GPA → রোল।
        </p>
      </div>

      <Card className="no-print">
        <CardContent className="pt-4">
          <form method="get" action="/teacher/merit-list" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
            <div className="no-print">
              <MeritPodium top3={summary.entries.slice(0, 3)} />
            </div>
            <div className="print-only">
              <ReportHeader
                academyName={academyName}
                logoUrl={logoKey ? `/api/files/${logoKey}` : null}
                teacherName={`${user.name} (${user.shortName ?? ""})`}
                subtitle={`মেধা তালিকা — ${classLabel(className)}${division ? ` — ${divisionLabel(division)}` : ""} • ${MONTHS_BN[month - 1]} ${bn(year)}`}
              />
            </div>
            <div className="print-avoid-break mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[12px]">
                    <th className="border border-border px-3 py-2 font-semibold">অবস্থান</th>
                    <th className="border border-border px-3 py-2 font-semibold">শিক্ষার্থী</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">রোল</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">প্রাপ্ত/মোট</th>
                    <th className="border border-border px-3 py-2 text-right font-semibold">শতকরা</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">গ্রেড</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">GPA</th>
                </tr>
                </thead>
                <tbody>
                  {summary.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-border px-3 py-10 text-center text-muted-foreground">
                        এই মাসে কোনো ফলাফল পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    summary.entries.map((e) => (
                      <tr key={e.studentId} className={cn(e.position <= 3 && "bg-amber-50/40")}>
                        <td className="border border-border px-3 py-2 font-bold text-primary">{bn(e.position)}</td>
                        <td className="border border-border px-3 py-2">
                          <span className="flex items-center gap-2">
                            <StudentAvatar photoKey={e.photoKey} name={e.name} size="sm" />
                            <span className="font-medium">{e.name}</span>
                          </span>
                        </td>
                        <td className="border border-border px-3 py-2 text-center">{bn(e.roll)}</td>
                        <td className="border border-border px-3 py-2 text-right">{fmtNum(e.totalObtained)} <span className="text-muted-foreground">/ {fmtNum(e.totalMarks)}</span></td>
                        <td className="border border-border px-3 py-2 text-right font-semibold">{fmtPct(e.percentage)}</td>
                        <td className="border border-border px-3 py-2 text-center font-semibold">{e.grade}</td>
                        <td className="border border-border px-3 py-2 text-center">{fmtGpa(e.gpa)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="no-print flex justify-center">
        <PrintButton label="প্রিন্ট করুন (A4)" />
      </div>
    </div>
  );
}
