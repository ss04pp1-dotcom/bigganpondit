import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { DashboardBanner } from "@/components/app/dashboard-banner";
import { RecentResultBox } from "@/components/app/recent-result-box";
import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, ClipboardEdit, Database, Building2 } from "lucide-react";
import { MONTHS_BN, bn, classLabel, divisionLabel, fmtNum } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

async function countOf(db: Awaited<ReturnType<typeof getDb>>, table: string): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) as c FROM ${table}`).first<{ c: number }>(undefined as never).catch(() => null);
  return r?.c ?? 0;
}

export default async function AdminDashboard() {
  const user = await requirePageUser(["ADMIN"]);
  const db = await getDb();

  const [teacherCount, studentCount, subjectCount, examCount, markCount, pendingRequestsCount, pendingPasswordRequestsCount] = await Promise.all([
    countOf(db, "teachers"),
    countOf(db, "students"),
    countOf(db, "subjects"),
    countOf(db, "exams"),
    countOf(db, "marks"),
    (async () => {
      const r = await db.prepare("SELECT COUNT(*) as c FROM student_requests WHERE status = 'PENDING'").first<{ c: number }>().catch(() => null);
      return r?.c ?? 0;
    })(),
    (async () => {
      const r = await db.prepare("SELECT COUNT(*) as c FROM password_change_requests WHERE status = 'PENDING'").first<{ c: number }>().catch(() => null);
      return r?.c ?? 0;
    })(),
  ]);

  const recentExams = (
    await db
      .prepare(
        `SELECT e.id, e.title, e.exam_date, e.month, e.year, e.total_marks, e.division,
                s.name as subject_name, c.name as class_name,
                (SELECT COUNT(*) FROM marks m WHERE m.exam_id = e.id) as mark_count,
                (SELECT MAX(m2.obtained_marks) FROM marks m2 WHERE m2.exam_id = e.id) as highest
         FROM exams e JOIN subjects s ON s.id = e.subject_id JOIN classes c ON c.id = e.class_id
         ORDER BY e.id DESC LIMIT 8`
      )
      .all<{
        id: number;
        title: string;
        exam_date: string;
        month: number;
        year: number;
        total_marks: number;
        division: string | null;
        subject_name: string;
        class_name: string;
        mark_count: number;
        highest: number | null;
      }>()
  ).results;

  const stats = [
    { label: "শিক্ষক", value: bn(teacherCount), href: "/admin/teachers", icon: GraduationCap, tint: "bg-blue-50 text-blue-600" },
    { label: "শিক্ষার্থী", value: bn(studentCount), href: "/admin/students", icon: Users, tint: "bg-emerald-50 text-emerald-600" },
    { label: "বিষয়", value: bn(subjectCount), href: "/admin/subjects", icon: BookOpen, tint: "bg-amber-50 text-amber-600" },
    { label: "পরীক্ষা", value: bn(examCount), href: "/admin/results", icon: ClipboardEdit, tint: "bg-violet-50 text-violet-600" },
    { label: "নম্বর এন্ট্রি", value: bn(markCount), href: "/admin/results", icon: Database, tint: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-5">
      <DashboardBanner
        user={user}
        panelTitle="প্রশাসন প্যানেল"
        panelDesc="সিস্টেমের সব তথ্য ও নিয়ন্ত্রণ এক জায়গায়।"
      />

      {pendingRequestsCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">🔔</span>
            <div>
              <p className="font-bold text-amber-900">
                শিক্ষকের পাঠানো {bn(pendingRequestsCount)} টি নতুন শিক্ষার্থীর আবেদন অনুমোদনের অপেক্ষায় আছে!
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                শিক্ষক কর্তৃক সাবমিট করা শিক্ষার্থীর তথ্য পর্যালোচনা ও অনুমোদন করতে শিক্ষার্থী ব্যবস্থাপনায় যান।
              </p>
            </div>
          </div>
          <Link
            href="/admin/students"
            className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            অনুরোধ দেখুন →
          </Link>
        </div>
      )}

      {pendingPasswordRequestsCount > 0 && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-[13px] text-blue-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">🔑</span>
            <div>
              <p className="font-bold text-blue-900">
                শিক্ষক/শিক্ষার্থীদের পাঠানো {bn(pendingPasswordRequestsCount)} টি পাসওয়ার্ড পরিবর্তনের অনুরোধ অনুমোদনের অপেক্ষায় আছে!
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                ব্যবহারকারীর নতুন পাসওয়ার্ড পর্যালোচনা ও অনুমোদন করতে সেটিংসের পাসওয়ার্ড অনুরোধ তালিকায় যান।
              </p>
            </div>
          </div>
          <Link
            href="/admin/settings#password-requests"
            className="shrink-0 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            অনুরোধ পর্যালোচনা করুন →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="print-avoid-break transition-shadow hover:shadow-md">
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
            </Link>
          );
        })}
      </div>

      {/* Recent Published Result Box with Podium */}
      <RecentResultBox user={user} defaultClass="10" />

      <Card>
        <CardContent className="pt-4">
          <h2 className="mb-3 text-[16px] font-bold">সাম্প্রতিক পরীক্ষা</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/60 text-left text-[12px]">
                  <th className="px-3 py-2 font-semibold">বিষয়</th>
                  <th className="px-3 py-2 font-semibold">পরীক্ষা</th>
                  <th className="px-3 py-2 font-semibold">শ্রেণি</th>
                  <th className="px-3 py-2 text-center font-semibold">মাস</th>
                  <th className="px-3 py-2 text-right font-semibold">মোট</th>
                  <th className="px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                  <th className="px-3 py-2 text-center font-semibold">নম্বর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {recentExams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-medium">{ex.subject_name}</td>
                    <td className="px-3 py-2">{ex.title}</td>
                    <td className="px-3 py-2">
                      {classLabel(ex.class_name)}
                      {ex.division ? ` — ${divisionLabel(ex.division)}` : ""}
                    </td>
                    <td className="px-3 py-2 text-center">{MONTHS_BN[ex.month - 1]} {bn(ex.year)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(ex.total_marks)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(ex.highest ?? 0)}</td>
                    <td className="px-3 py-2 text-center">{bn(ex.mark_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
