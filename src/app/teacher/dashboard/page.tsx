import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getTeacherClasses } from "@/lib/permissions";
import { buildMonthlyClassSummary } from "@/lib/results/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Layers, CalendarDays, Hash, Trophy, UserPlus, ClipboardEdit, FileText, Search, GraduationCap, ArrowUpRight } from "lucide-react";
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

  const allowedClasses = await getTeacherClasses(db, user.teacherId);
  const allDbClasses = (
    await db.prepare("SELECT name FROM classes ORDER BY sort_order DESC").all<{ name: string }>().catch(() => null)
  )?.results.map((r) => r.name) ?? ["10", "9", "8", "7", "6"];

  const hasSpecificClasses = allowedClasses.length > 0;
  const activeClasses = hasSpecificClasses ? allowedClasses : allDbClasses;

  const reqClass = one(sp.class);
  const classNum = reqClass && activeClasses.includes(reqClass)
    ? reqClass
    : (activeClasses.includes("10") ? "10" : activeClasses[0] ?? "10");

  const requiresDiv = classNum === "9" || classNum === "10";
  const divisionRaw = one(sp.division);
  const division = requiresDiv ? (divisionRaw === "HUMANITIES" ? "HUMANITIES" : "SCIENCE") : null;
  const month = Number(one(sp.month)) || curMonth;
  const year = Number(one(sp.year)) || curYear;
  const view = one(sp.view) === "students" ? "students" : "merit";

  // Class record
  const classIdRow = await db
    .prepare("SELECT id FROM classes WHERE name = ?")
    .bind(classNum)
    .first<{ id: number }>()
    .catch(() => null);
  const classId = classIdRow?.id;

  // 1) Total students across all authorized classes (or academy total)
  let totalStudents = 0;
  if (hasSpecificClasses && user.teacherId) {
    const r = await db
      .prepare(
        `SELECT COUNT(DISTINCT st.id) as c FROM students st WHERE st.class_id IN (
           SELECT s.class_id FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?
         )`
      )
      .bind(user.teacherId)
      .first<{ c: number }>()
      .catch(() => null);
    totalStudents = Number(r?.c ?? 0);
  } else {
    // If teacher has no specific subject restrictions yet, show the total academy student count
    const r = await db
      .prepare("SELECT COUNT(*) as c FROM students")
      .first<{ c: number }>()
      .catch(() => null);
    totalStudents = Number(r?.c ?? 0);
  }

  // 2) Students in the selected class and division
  let currentClassStudentsCount = 0;
  if (classId) {
    if (requiresDiv && division) {
      const r = await db
        .prepare("SELECT COUNT(*) as c FROM students WHERE class_id = ? AND division = ?")
        .bind(classId, division)
        .first<{ c: number }>()
        .catch(() => null);
      currentClassStudentsCount = Number(r?.c ?? 0);
    } else {
      const r = await db
        .prepare("SELECT COUNT(*) as c FROM students WHERE class_id = ?")
        .bind(classId)
        .first<{ c: number }>()
        .catch(() => null);
      currentClassStudentsCount = Number(r?.c ?? 0);
    }
  }

  const totalClassesCount = hasSpecificClasses ? allowedClasses.length : allDbClasses.length;

  // 3) Enrolled students list of this selected class
  const classStudents = classId
    ? (
        await db
          .prepare(
            `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key, st.phone
             FROM students st
             WHERE st.class_id = ? ${requiresDiv && division ? "AND st.division = ?" : ""}
             ORDER BY st.roll ASC LIMIT 30`
          )
          .bind(...(requiresDiv && division ? [classId, division] : [classId]))
          .all<{
            id: number;
            name: string;
            roll: number;
            division: string | null;
            section: string | null;
            photo_key: string | null;
            phone: string | null;
          }>()
          .catch(() => null)
      )?.results ?? []
    : [];

  // 4) Merit list (monthly exam summary)
  const summary = classId
    ? await buildMonthlyClassSummary(db, { classId, division, month, year, subjectIds: null })
    : { entries: [], subjectNames: new Map() };

  const stats = [
    {
      label: "মোট শিক্ষার্থী",
      value: bn(totalStudents),
      subtext: hasSpecificClasses ? "অনুমোদিত শ্রেণিসমূহ" : "একাডেমির মোট",
      href: "/teacher/students",
      icon: Users,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: `${classLabel(classNum)} শিক্ষার্থী`,
      value: `${bn(currentClassStudentsCount)} জন`,
      subtext: division ? divisionLabel(division) : "এই শ্রেণিতে মোট",
      href: `/teacher/students?class=${classNum}${division ? `&division=${division}` : ""}`,
      icon: GraduationCap,
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "চলতি মাস ও বছর",
      value: `${MONTHS_BN[month - 1]} ${bn(year)}`,
      subtext: "মূল্যায়ন সেশন",
      href: "/teacher/marks",
      icon: CalendarDays,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "মেধা তালিকায় এন্ট্রি",
      value: `${bn(summary.entries.length)} জন`,
      subtext: summary.entries.length > 0 ? "ফলাফল পাওয়া গেছে" : "ফলাফল অনির্ধারিত",
      href: `/teacher/merit-list?class=${classNum}${division ? `&division=${division}` : ""}&month=${month}&year=${year}`,
      icon: Trophy,
      tint: "bg-violet-50 text-violet-600",
    },
  ];

  const showStudentsView = view === "students" || (summary.entries.length === 0 && classStudents.length > 0);

  return (
    <div className="space-y-5">
      {/* compact page heading */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-[#18314d]">ড্যাশবোর্ড</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            স্বাগতম, {user.name} {user.shortName ? `(${user.shortName})` : ""}
          </p>
        </div>
        <div className="hidden text-right text-[11px] text-slate-500 sm:block">
          {MONTHS_BN[month - 1]} {bn(year)}
        </div>
      </div>

      {/* notice if unassigned */}
      {!hasSpecificClasses && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-[12px] text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold text-amber-800">নোটিশ: </span>
              <span>
                আপনার শিক্ষক অ্যাকাউন্টে এখনও কোনো সুনির্দিষ্ট বিষয় যুক্ত করা হয়নি। অ্যাডমিন প্যানেলে 'শিক্ষক ব্যবস্থাপনা' থেকে আপনার বিষয় নির্ধারণ না করা পর্যন্ত একাডেমির সামগ্রিক তালিকা প্রদর্শিত হচ্ছে।
              </span>
            </div>
          </div>
        </div>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="block group">
              <Card className="print-avoid-break transition-all group-hover:border-blue-300 group-hover:shadow-sm">
                <CardContent className="flex items-center gap-3 py-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted-foreground truncate">{s.label}</p>
                    <p className="text-lg font-bold leading-tight">{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.subtext}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* main view with filters */}
      <Card>
        <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[17px]">
              <Trophy className="h-5 w-5 text-amber-500" /> {classLabel(classNum)}
              {division ? ` (${divisionLabel(division)})` : ""} — ড্যাশবোর্ড ওভারভিউ
            </CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              শ্রেণির মোট শিক্ষার্থী: <span className="font-semibold text-slate-800">{bn(currentClassStudentsCount)} জন</span> • সেশন: {MONTHS_BN[month - 1]} {bn(year)}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <Link
              href={`/teacher/dashboard?class=${classNum}${division ? `&division=${division}` : ""}&month=${month}&year=${year}&view=merit`}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                !showStudentsView ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              মেধা তালিকা ({bn(summary.entries.length)})
            </Link>
            <Link
              href={`/teacher/dashboard?class=${classNum}${division ? `&division=${division}` : ""}&month=${month}&year=${year}&view=students`}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                showStudentsView ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              শিক্ষার্থী তালিকা ({bn(classStudents.length)})
            </Link>
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

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_245px]">
            {/* Table display */}
            <div className="overflow-hidden rounded-md border border-[#dfe7f1]">
              {!showStudentsView ? (
                // MERIT LIST VIEW
                <>
                  <div className="flex items-center justify-between border-b border-[#dfe7f1] bg-[#f8fafc] px-3 py-2">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#18314d]">
                      <Trophy className="h-4 w-4 text-[#f2aa22]" /> वर्तमान মাস - {classLabel(classNum)} মেধা তালিকা
                    </div>
                    <span className="text-[10px] text-slate-500">সর্বোচ্চ ১০ জন</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#f2f6fb] text-left">
                          <th className="px-3 py-2">র‍্যাংক</th>
                          <th className="px-3 py-2">নাম</th>
                          <th className="px-3 py-2">রোল</th>
                          <th className="px-3 py-2 text-right">প্রাপ্ত নম্বর</th>
                          <th className="px-3 py-2 text-center">গ্রেড</th>
                          <th className="px-3 py-2 text-center">ছবি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f5] bg-white">
                        {summary.entries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                              <p className="font-semibold text-slate-700">এই মাসে কোনো ফলাফল পাওয়া যায়নি।</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                এই শ্রেণির মোট শিক্ষার্থী সংখ্যা: {bn(currentClassStudentsCount)} জন। নম্বর ইনপুট করতে নিচের বোতামে ক্লিক করুন।
                              </p>
                              <div className="mt-3 flex items-center justify-center gap-2">
                                <Link
                                  href={`/teacher/marks?class=${classNum}${division ? `&division=${division}` : ""}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                >
                                  <ClipboardEdit className="h-3.5 w-3.5" /> নম্বর এন্ট্রি করুন
                                </Link>
                                <Link
                                  href={`/teacher/dashboard?class=${classNum}${division ? `&division=${division}` : ""}&view=students`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
                                >
                                  <Users className="h-3.5 w-3.5" /> শিক্ষার্থী তালিকা দেখুন
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          summary.entries.slice(0, 10).map((e) => (
                            <tr key={e.studentId} className="reference-merit-row">
                              <td className="px-3 font-bold text-[#087cf5]">{bn(e.position)}</td>
                              <td className="px-3 font-semibold">{e.name}</td>
                              <td className="px-3">{bn(e.roll)}</td>
                              <td className="px-3 text-right font-semibold">{fmtPct(e.percentage)}</td>
                              <td className="px-3 text-center">
                                <span className="rounded bg-[#e9f8f0] px-2 py-0.5 text-[10px] font-bold text-[#128052]">
                                  {e.grade}
                                </span>
                              </td>
                              <td className="px-3 text-center">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#edf4fc] text-[10px] font-bold text-[#087cf5]">
                                  {e.name.slice(0, 1)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                // CLASS STUDENTS LIST VIEW
                <>
                  <div className="flex items-center justify-between border-b border-[#dfe7f1] bg-[#f8fafc] px-3 py-2">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#18314d]">
                      <Users className="h-4 w-4 text-blue-600" /> {classLabel(classNum)} — শিক্ষার্থী তালিকা
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600">{bn(classStudents.length)} জন শিক্ষার্থী</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#f2f6fb] text-left">
                          <th className="px-3 py-2">রোল</th>
                          <th className="px-3 py-2">শিক্ষার্থীর নাম</th>
                          <th className="px-3 py-2 text-center">শাখা/বিভাগ</th>
                          <th className="px-3 py-2">যোগাযোগ</th>
                          <th className="px-3 py-2 text-center">কার্যক্রম</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf1f5] bg-white">
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                              এই শ্রেণিতে কোনো শিক্ষার্থী তালিকাভুক্ত নেই।
                            </td>
                          </tr>
                        ) : (
                          classStudents.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="px-3 font-bold text-[#087cf5]">{bn(st.roll)}</td>
                              <td className="px-3 font-semibold text-slate-800">{st.name}</td>
                              <td className="px-3 text-center">
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                                  {st.division ? divisionLabel(st.division) : ""} {st.section ? `শাখা: ${st.section}` : ""}
                                </span>
                              </td>
                              <td className="px-3 text-slate-500 text-[11px]">{st.phone ? bn(st.phone) : "—"}</td>
                              <td className="px-3 text-center">
                                <Link
                                  href={`/teacher/monthly-report?class=${classNum}${st.division ? `&division=${st.division}` : ""}&student=${st.id}&month=${month}&year=${year}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
                                >
                                  রিপোর্ট <ArrowUpRight className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-xl border border-[#dfe7f1] bg-white p-4 shadow-xs">
              <div className="mb-3 text-[14px] font-bold text-[#18314d]">দ্রুত কার্যক্রম</div>
              <div className="space-y-2.5">
                <Link
                  href="/teacher/students"
                  className="flex items-center gap-2.5 rounded-lg border border-[#e2e8f0] p-2.5 hover:border-blue-400 hover:bg-blue-50/50 transition-all font-semibold text-[13px] text-slate-700"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d6efd] text-white shadow-xs">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <span>শিক্ষার্থী ব্যবস্থাপনা</span>
                </Link>
                <Link
                  href={`/teacher/marks?class=${classNum}${division ? `&division=${division}` : ""}`}
                  className="flex items-center gap-2.5 rounded-lg border border-[#e2e8f0] p-2.5 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all font-semibold text-[13px] text-slate-700"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4f46e5] text-white shadow-xs">
                    <ClipboardEdit className="h-4 w-4" />
                  </span>
                  <span>নম্বর ইনপুট করুন</span>
                </Link>
                <Link
                  href={`/teacher/monthly-report?class=${classNum}${division ? `&division=${division}` : ""}&month=${month}&year=${year}`}
                  className="flex items-center gap-2.5 rounded-lg border border-[#e2e8f0] p-2.5 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all font-semibold text-[13px] text-slate-700"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#10b981] text-white shadow-xs">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span>মাসিক/বার্ষিক রিপোর্ট</span>
                </Link>
                <Link
                  href="/teacher/results"
                  className="flex items-center gap-2.5 rounded-lg border border-[#e2e8f0] p-2.5 hover:border-teal-400 hover:bg-teal-50/50 transition-all font-semibold text-[13px] text-slate-700"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#059669] text-white shadow-xs">
                    <Search className="h-4 w-4" />
                  </span>
                  <span>ফলাফল অনুসন্ধান</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="no-print pt-1 flex items-center justify-between text-[11px]">
            <Link href="/teacher/students" className="font-medium text-slate-600 hover:underline">
              ← সম্পূর্ণ শিক্ষার্থী ডিরেক্টরি
            </Link>
            <Link href={`/teacher/merit-list?class=${classNum}${division ? `&division=${division}` : ""}&month=${month}&year=${year}`} className="font-medium text-primary hover:underline">
              সম্পূর্ণ মেধা তালিকা দেখুন →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
