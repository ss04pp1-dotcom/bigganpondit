import { requirePageUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getStudentExamRows } from "@/lib/results/reports";
import { DashboardBanner } from "@/components/app/dashboard-banner";
import { RecentResultBox } from "@/components/app/recent-result-box";
import { StudentAvatar } from "@/components/app/student-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { LogoutButton } from "@/components/app/logout-button";
import Link from "next/link";
import {
  MONTHS_BN,
  bn,
  classLabel,
  divisionLabel,
  fmtNum,
  fmtPct,
  todayYmdDhaka,
  currentMonthDhaka,
  currentYearDhaka,
} from "@/lib/constants";
import { ArrowRight, FileText, CalendarRange, Search, BookMarked, Bell, CalendarDays, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

export default async function StudentDashboard() {
  const user = await requirePageUser(["STUDENT"]);
  const db = await getDb();

  let studentId = user.studentId;
  let className = user.className;
  let roll = user.roll;
  let division = user.division;
  let section = user.section;

  if (!studentId) {
    try {
      const s = await db
        .prepare("SELECT id, class_id, roll, division, section FROM students WHERE user_id = ?")
        .bind(user.id)
        .first<any>()
        .catch(() => null);
      if (s) {
        studentId = s.id;
        roll = s.roll;
        division = s.division;
        section = s.section;
        if (!className && s.class_id) {
          const c = await db
            .prepare("SELECT name FROM classes WHERE id = ?")
            .bind(s.class_id)
            .first<{ name: string }>()
            .catch(() => null);
          className = c?.name || String(s.class_id);
        }
      }
    } catch {
      // ignore
    }
  }

  const userProfile = {
    ...user,
    studentId,
    className,
    roll,
    division,
    section,
  };

  const year = currentYearDhaka();
  const month = currentMonthDhaka();

  let rows: any[] = [];
  try {
    if (studentId) {
      rows = await getStudentExamRows(db, {
        studentId,
        subjectIds: null,
        month: null,
        year,
      });
    }
  } catch (err) {
    console.warn("Failed to get student exam rows:", err);
  }
  const recent = rows.slice(-6).reverse();

  // Calculate Student Result Highlights: Total Marks, GPA, and Rank
  let totalPossible = 0;
  let totalObtained = 0;
  let gpaSum = 0;
  let gpaCount = 0;

  for (const r of rows) {
    totalPossible += Number(r.total) || 0;
    if (r.attendance !== "ABSENT") {
      totalObtained += Number(r.obtained) || 0;
    }
    if (r.gpa !== undefined && r.gpa !== null) {
      gpaSum += Number(r.gpa);
      gpaCount++;
    } else if (r.percentage !== undefined) {
      // Standard BD grading estimate if per-row gpa wasn't precomputed
      const pct = r.percentage;
      const g = pct >= 80 ? 5 : pct >= 70 ? 4 : pct >= 60 ? 3.5 : pct >= 50 ? 3 : pct >= 40 ? 2 : pct >= 33 ? 1 : 0;
      gpaSum += g;
      gpaCount++;
    }
  }

  const avgGpa = gpaCount > 0 ? (gpaSum / gpaCount).toFixed(2) : "৫.০০";

  // Query student pending fees with Overdue vs Current Month breakdown
  let pendingItems: any[] = [];
  try {
    if (studentId) {
      pendingItems = (
        await db
          .prepare(
            `SELECT id, category, title, amount, due_amount, due_date, month, year, status
             FROM fee_items
             WHERE student_id = ? AND status IN ('PENDING', 'PARTIAL') AND due_amount > 0`
          )
          .bind(studentId)
          .all<any>()
      ).results || [];
    }
  } catch {
    pendingItems = [];
  }

  let overdueDue = 0;
  let currentMonthDue = 0;
  let nearestDueDate: string | null = null;

  const todayStr = todayYmdDhaka();
  for (const it of pendingItems) {
    const amt = Number(it.due_amount) || 0;
    let isOver = false;
    if (it.due_date && it.due_date.trim()) {
      isOver = it.due_date.trim().split("T")[0] < todayStr;
      if (!isOver && (!nearestDueDate || it.due_date < nearestDueDate)) {
        nearestDueDate = it.due_date.trim().split("T")[0];
      }
    } else if (it.year && it.month) {
      if (it.year < year || (it.year === year && it.month < month)) {
        isOver = true;
      } else if (it.year === year && it.month === month) {
        isOver = false;
      }
    }

    if (isOver) {
      overdueDue += amt;
    } else {
      currentMonthDue += amt;
    }
  }

  const totalDue = overdueDue + currentMonthDue;
  const dueCount = pendingItems.length;

  const quickLinks = [
    {
      href: "/student/results",
      label: "ফলাফল",
      icon: Search,
      bg: "bg-[#eaf3fe] border-[#cfe2ff] hover:bg-[#e0effe]",
      iconBg: "bg-[#0d6efd] text-white",
      textColor: "text-[#0a58ca]",
    },
    {
      href: "/student/routine",
      label: "রুটিন",
      icon: CalendarDays,
      bg: "bg-[#ecfdf5] border-[#a7f3d0] hover:bg-[#d1fae5]",
      iconBg: "bg-[#059669] text-white",
      textColor: "text-[#065f46]",
    },
    {
      href: "/student/notices",
      label: "নোটিশ",
      icon: Bell,
      bg: "bg-[#fff7ed] border-[#fed7aa] hover:bg-[#ffedd5]",
      iconBg: "bg-[#f97316] text-white",
      textColor: "text-[#c2410c]",
    },
    {
      href: "/student/profile",
      label: "প্রোফাইল",
      icon: BookMarked,
      bg: "bg-[#f5f3ff] border-[#ddd6fe] hover:bg-[#ede9fe]",
      iconBg: "bg-[#7c3aed] text-white",
      textColor: "text-[#5b21b6]",
    },
    {
      href: "/student/fees",
      label: "ফি ও বকেয়া",
      icon: Wallet,
      bg: "bg-[#fef2f2] border-[#fecaca] hover:bg-[#fee2e2]",
      iconBg: "bg-[#ef4444] text-white",
      textColor: "text-[#991b1b]",
    },
    {
      href: "/student/monthly-result",
      label: "মাসিক রেজাল্ট",
      icon: FileText,
      bg: "bg-[#ebf9f1] border-[#d1e7dd] hover:bg-[#dff5e8]",
      iconBg: "bg-[#10b981] text-white",
      textColor: "text-[#0f5132]",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <DashboardBanner
        user={user}
        panelTitle="শিক্ষার্থী প্যানেল"
        panelDesc="তোমার পরীক্ষার ফলাফল, মেধা তালিকা ও বইসমূহ।"
      />

      {/* Overdue Alert Banner — Shown ONLY if last payment date has expired */}
      {overdueDue > 0 && (
        <div className="rounded-xl border border-rose-300 bg-gradient-to-r from-rose-50 via-white to-rose-50/80 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-900">
                    মেয়াদোত্তীর্ণ বকেয়া: {bn(overdueDue)} ৳
                  </span>
                  {currentMonthDue > 0 && (
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                      + বর্তমান মাসের বেতন: {bn(currentMonthDue)} ৳
                    </span>
                  )}
                  <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    {bn(dueCount)}টি আইটেম
                  </span>
                </div>
                <p className="text-xs text-rose-700">
                  নির্ধারিত শেষ তারিখ পার হয়ে গেছে। অনুগ্রহ করে যত দ্রুত সম্ভব বকেয়া পরিশোধ করুন।
                </p>
              </div>
            </div>

            <Link
              href="/student/fees"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors whitespace-nowrap"
            >
              <span>বকেয়ার বিস্তারিত দেখুন</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Current Month Fee Reminder Banner — Shown before last payment date */}
      {overdueDue === 0 && currentMonthDue > 0 && (
        <div className="rounded-xl border border-sky-300 bg-gradient-to-r from-sky-50 via-white to-blue-50/70 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-sky-950">
                    বর্তমান মাসের বেতন: {bn(currentMonthDue)} ৳
                  </span>
                  <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
                    চলতি প্রদেয়
                  </span>
                </div>
                <p className="text-xs text-sky-800">
                  {nearestDueDate
                    ? `পরিশোধের শেষ তারিখ: ${nearestDueDate}। শেষ তারিখের আগে পরিশোধ করুন (তারিখ পার হলে বকেয়ায় যুক্ত হবে)।`
                    : "চলতি মাসের বেতন নির্ধারিত সময়ের মধ্যে একাডেমি অফিসে বা অনলাইনে পরিশোধ করুন।"}
                </p>
              </div>
            </div>

            <Link
              href="/student/fees"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition-colors whitespace-nowrap"
            >
              <span>বেতন ও হিসাব দেখুন</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Student Welcome Header Card */}
      <div className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <StudentAvatar photoKey={user.photoKey} name={user.name} size="xl" className="h-16 w-16 ring-2 ring-[#d8e8f8]" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">শুভেচ্ছা,</span>
                <h1 className="truncate text-[20px] font-bold text-[#142942]">{user.name}</h1>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-slate-600">
                শ্রেণি: {classLabel(user.className ?? "")}
                {user.division ? ` | ${divisionLabel(user.division)}` : ""}
                {user.section ? ` | শাখা: ${user.section}` : ""} | রোল: {bn(user.roll ?? 0)}
              </p>
            </div>
          </div>

          <div className="sm:self-center">
            <LogoutButton
              className="border-[#cfdbe8] bg-[#f8fafd] text-[#0d6efd] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            />
          </div>
        </div>
      </div>

      {/* 2. "আমার ফলাফল" Highlights Card (GPA, Total Marks, Rank) — Exactly matching reference mockup */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            আমার ফলাফল ({bn(year)})
          </h2>
          <Link
            href="/student/results"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>বিস্তারিত দেখুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* GPA Box */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">জিপিএ</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              {rows.length > 0 ? bn(avgGpa) : "৫.০০"}
            </span>
          </div>

          {/* Total Marks Box */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">মোট নম্বর</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
              {totalPossible > 0 ? `${bn(totalObtained)}/${bn(totalPossible)}` : "—"}
            </span>
          </div>

          {/* Rank Box */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">র‍্যাংক / রোল</span>
            <span className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">
              {bn(user.roll ?? 1)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 6 Action Cards in Grid — matching Panel 7 & reference mockup */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href} className="block group">
              <div className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border ${q.bg} shadow-xs transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 text-center`}>
                <span className={`mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl ${q.iconBg} shadow-sm`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className={`text-[14px] font-bold ${q.textColor}`}>{q.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Motivational Quote Banner — matching reference mockup */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-sky-950">
              “শিক্ষাই জীবনের আলো, জ্ঞানই উন্নতির পথ।”
            </p>
            <p className="text-xs text-sky-700 mt-0.5">
              নিয়মিত পড়াশোনা ও অনুশীলনের মাধ্যমে তোমার ভবিষ্যৎকে উজ্জ্বল করো।
            </p>
          </div>
        </div>
      </div>

      {/* 4. Recent Published Result Box with Top 3 Podium (Students only see Top 3 & Self) */}
      <RecentResultBox user={user} defaultClass={user.className || "10"} />

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
