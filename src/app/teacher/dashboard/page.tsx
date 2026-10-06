import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getTeacherClasses } from "@/lib/permissions";
import { buildMonthlyClassSummary } from "@/lib/results/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Layers, CalendarDays, Hash, Trophy, UserPlus, ClipboardEdit, FileText, Search } from "lucide-react";
import { MONTHS_BN, bn, classLabel, divisionLabel, fmtPct } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function TeacherDashboard({ searchParams }: { searchParams: SP }) {
  const user = await requirePageUser(["TEACHER"]);
  const db = await getDb();
  const sp = await searchParams;

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const allowedClasses = await getTeacherClasses(db, user.teacherId!);
  const classNum = one(sp.class) && allowedClasses.includes(one(sp.class)!) ? one(sp.class)! : (allowedClasses.includes("10") ? "10" : allowedClasses[0] ?? "10");
  const requiresDiv = classNum === "9" || classNum === "10";
  const divisionRaw = one(sp.division);
  const division = requiresDiv ? (divisionRaw === "HUMANITIES" ? "HUMANITIES" : "SCIENCE") : null;
  const month = Number(one(sp.month)) || curMonth;
  const year = Number(one(sp.year)) || curYear;

  // stats
  const classIdRow = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(classNum).first<{ id: number }>(undefined as never).catch(() => null);
  const totalStudents = classIdRow
    ? (
        await db
          .prepare(
            `SELECT COUNT(*) as c FROM students WHERE class_id IN (
               SELECT s.class_id FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?
             )`
          )
          .bind(user.teacherId)
          .first<{ c: number }>(undefined as never)
          .catch(() => null)
      )?.c ?? 0
    : 0;

  // merit list (cohort-wide)
  const classId = classIdRow?.id;
  const summary = classId
    ? await buildMonthlyClassSummary(db, { classId, division, month, year, subjectIds: null })
    : { entries: [], subjectNames: new Map() };

  const stats = [
    { label: "মোট শিক্ষার্থী", value: bn(totalStudents), icon: Users, tint: "bg-blue-50 text-blue-600" },
    { label: "মোট শ্রেণি", value: bn(allowedClasses.length), icon: Layers, tint: "bg-emerald-50 text-emerald-600" },
    { label: "চলতি মাস", value: MONTHS_BN[month - 1], icon: CalendarDays, tint: "bg-amber-50 text-amber-600" },
    { label: "চলতি বছর", value: bn(year), icon: Hash, tint: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-5">
      {/* compact page heading — reference style */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-[#18314d]">ড্যাশবোর্ড</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">স্বাগতম, {user.name} ({user.shortName})</p>
        </div>
        <div className="hidden text-right text-[11px] text-slate-500 sm:block">{MONTHS_BN[month - 1]} {bn(year)}</div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="print-avoid-break">
              <CardContent className="flex items-center gap-3 py-4">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[12px] text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* merit list with filters */}
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[17px]">
              <Trophy className="h-5 w-5 text-amber-500" /> মেধা তালিকা
            </CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {classLabel(classNum)}
              {division ? ` — ${divisionLabel(division)}` : ""} • {MONTHS_BN[month - 1]} {bn(year)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* filters (GET form — updates via full server render) */}
          <form method="get" className="no-print grid grid-cols-2 gap-3 sm:grid-cols-5" action="/teacher/dashboard">
            <div className="space-y-1.5">
              <Label className="text-[12px]">শ্রেণি</Label>
              <Select name="class" defaultValue={classNum}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowedClasses.map((c) => (
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

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_245px]">
            <div className="overflow-hidden rounded-md border border-[#dfe7f1]">
              <div className="flex items-center justify-between border-b border-[#dfe7f1] bg-[#f8fafc] px-3 py-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#18314d]"><Trophy className="h-4 w-4 text-[#f2aa22]" /> বর্তমান মাস - {classLabel(classNum)} মেধা তালিকা</div>
                <span className="text-[10px] text-slate-500">সর্বোচ্চ ১০ জন</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead><tr className="bg-[#f2f6fb] text-left">
                    <th className="px-3 py-2">র‍্যাংক</th><th className="px-3 py-2">নাম</th><th className="px-3 py-2">রোল</th><th className="px-3 py-2 text-right">প্রাপ্ত নম্বর</th><th className="px-3 py-2 text-center">গ্রেড</th><th className="px-3 py-2 text-center">ছবি</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#edf1f5] bg-white">
                    {summary.entries.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">এই মাসে কোনো ফলাফল পাওয়া যায়নি।</td></tr> : summary.entries.slice(0,10).map(e => (
                      <tr key={e.studentId} className="reference-merit-row">
                        <td className="px-3 font-bold text-[#087cf5]">{bn(e.position)}</td>
                        <td className="px-3 font-semibold">{e.name}</td>
                        <td className="px-3">{bn(e.roll)}</td>
                        <td className="px-3 text-right font-semibold">{fmtPct(e.percentage)}</td>
                        <td className="px-3 text-center"><span className="rounded bg-[#e9f8f0] px-2 py-0.5 text-[10px] font-bold text-[#128052]">{e.grade}</span></td>
                        <td className="px-3 text-center"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#edf4fc] text-[10px] font-bold text-[#087cf5]">{e.name.slice(0,1)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-md border border-[#dfe7f1] bg-white p-3">
              <div className="mb-2 text-[13px] font-semibold text-[#18314d]">দ্রুত কার্যক্রম</div>
              <div className="space-y-2">
                <Link href="/teacher/students" className="reference-action"><UserPlus /> নতুন শিক্ষার্থী যুক্ত করুন</Link>
                <Link href="/teacher/marks" className="reference-action"><ClipboardEdit /> নতুন নম্বর প্রদান</Link>
                <Link href="/teacher/monthly-report" className="reference-action green"><FileText /> মাসিক/বার্ষিক রিপোর্ট</Link>
                <Link href="/teacher/results" className="reference-action green"><Search /> ফলাফল অনুসন্ধান</Link>
              </div>
            </div>
          </div>
          <div className="no-print pt-1 text-right">
            <Link href="/teacher/merit-list" className="text-[11px] font-medium text-primary hover:underline">সম্পূর্ণ মেধা তালিকা দেখুন →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
