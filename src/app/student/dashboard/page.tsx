import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getStudentExamRows } from "@/lib/results/reports";
import { StudentAvatar } from "@/components/app/student-avatar";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  MONTHS_BN,
  bn,
  classLabel,
  divisionLabel,
  fmtNum,
  fmtPct,
} from "@/lib/constants";
import { ArrowRight, FileText, CalendarRange, Search } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

export default async function StudentDashboard() {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();
  if (!user.studentId) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const rows = await getStudentExamRows(db, {
    studentId: user.studentId,
    subjectIds: null,
    month: null,
    year,
  });
  const recent = rows.slice(-6).reverse();

  const quickLinks = [
    {
      href: "/student/results",
      label: "আমার ফলাফল দেখুন",
      icon: Search,
      bg: "bg-[#eaf3fe] border-[#cfe2ff] hover:bg-[#e0effe]",
      iconBg: "bg-[#0d6efd] text-white",
      textColor: "text-[#0a58ca]",
    },
    {
      href: "/student/monthly-result",
      label: "মাসিক রেজাল্ট",
      icon: FileText,
      bg: "bg-[#ebf9f1] border-[#d1e7dd] hover:bg-[#dff5e8]",
      iconBg: "bg-[#10b981] text-white",
      textColor: "text-[#0f5132]",
    },
    {
      href: "/student/annual-result",
      label: "বাৎসরিক রেজাল্ট",
      icon: CalendarRange,
      bg: "bg-[#fef6e9] border-[#ffe8cc] hover:bg-[#fdedd3]",
      iconBg: "bg-[#f59e0b] text-white",
      textColor: "text-[#854d0e]",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Student Welcome Card — Panel 7 */}
      <div className="rounded-xl border border-[#dce6f2] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <StudentAvatar photoKey={user.photoKey} name={user.name} size="xl" className="h-16 w-16 ring-2 ring-[#d8e8f8]" />
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-bold text-[#142942]">স্বাগতম, {user.name}</h1>
              <p className="mt-1 text-[13px] font-semibold text-slate-600">
                {classLabel(user.className ?? "")}
                {user.division ? ` | ${divisionLabel(user.division)}` : ""}
                {user.section ? ` | শাখা: ${user.section}` : ""} | রোল: {bn(user.roll ?? 0)}
              </p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="sm:self-center">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfdbe8] bg-[#f8fafd] px-3.5 py-1.5 text-[12px] font-semibold text-[#0d6efd] hover:bg-[#edf4fc] transition-colors"
            >
              <span>লগআউট</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3 Colorful Action Cards — Panel 7 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href} className="block group">
              <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${q.bg} shadow-xs transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 text-center`}>
                <span className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${q.iconBg} shadow-md`}>
                  <Icon className="h-7 w-7" />
                </span>
                <span className={`text-[16px] font-bold ${q.textColor}`}>{q.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-4">
          <h2 className="mb-3 text-[16px] font-bold">সাম্প্রতিক ফলাফল ({bn(year)})</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/60 text-left text-[12px]">
                  <th className="px-3 py-2 font-semibold">বিষয়</th>
                  <th className="px-3 py-2 font-semibold">পরীক্ষা</th>
                  <th className="px-3 py-2 text-center font-semibold">মাস</th>
                  <th className="px-3 py-2 text-right font-semibold">মোট</th>
                  <th className="px-3 py-2 text-right font-semibold">প্রাপ্ত</th>
                  <th className="px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                  <th className="px-3 py-2 text-center font-semibold">গ্রেড</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                      এখনো কোনো ফলাফল প্রকাশিত হয়নি।
                    </td>
                  </tr>
                ) : (
                  recent.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.subjectName}</td>
                      <td className="px-3 py-2">{r.title}</td>
                      <td className="px-3 py-2 text-center">{MONTHS_BN[r.month - 1]}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.total)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${r.attendance === "ABSENT" ? "text-red-600" : ""}`}>
                        {r.attendance === "ABSENT" ? "অনুপস্থিত" : fmtNum(r.obtained)}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.highest)}</td>
                      <td className="px-3 py-2 text-center font-semibold">{r.grade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {recent.length > 0 && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              সর্বশেষ পরীক্ষায় শতকরা: {fmtPct(recent[0].percentage)} • এ বছরে মোট পরীক্ষা: {bn(rows.length)} টি
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
