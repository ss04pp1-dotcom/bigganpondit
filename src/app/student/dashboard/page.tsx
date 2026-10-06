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
    { href: "/student/results", label: "ফলাফল দেখুন", icon: Search, tint: "bg-blue-50 text-blue-600" },
    { href: "/student/monthly-result", label: "মাসিক ফলাফল", icon: FileText, tint: "bg-emerald-50 text-emerald-600" },
    { href: "/student/annual-result", label: "বার্ষিক ফলাফল", icon: CalendarRange, tint: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="flex items-center gap-4 bg-white px-4 py-4 sm:px-5">
          <StudentAvatar photoKey={user.photoKey} name={user.name} size="xl" className="h-16 w-16 ring-2 ring-[#d8e8f8]" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">শিক্ষার্থী প্রোফাইল</p>
            <h1 className="truncate text-[18px] font-bold text-[#18314d]">{user.name}</h1>
            <p className="text-[12px] text-slate-500">
              {classLabel(user.className ?? "")}
              {user.division ? ` • ${divisionLabel(user.division)}` : ""}
              {user.section ? ` • শাখা ${user.section}` : ""} • রোল {bn(user.roll ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href}>
              <Card className="print-avoid-break transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 py-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${q.tint}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[15px] font-semibold">{q.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
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
