"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Bell,
  Printer,
  Calendar,
  Sparkles,
  TrendingDown,
  Clock,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { StudentAvatar } from "@/components/app/student-avatar";
import { useToast } from "@/hooks/use-toast";
import { MONTHS_BN, bn, classLabel, monthLabel, fmtDateBnFromUtc, fmtDateTimeBnFromUtc, paymentMethodLabelBn, currentMonthDhaka } from "@/lib/constants";
import { FEE_CATEGORY_LABELS, type FeeCategory } from "@/lib/fees/engine";

export function StudentFeesViewer() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
  const [summary, setSummary] = useState<any>({
    totalDue: 0,
    overdueDue: 0,
    currentMonthDue: 0,
    previousMonthsDue: 0,
    totalCurrentPayable: 0,
    totalPaid: 0,
    totalOriginal: 0,
    pendingItems: [],
    paidItems: [],
    payments: [],
    notifications: [],
    monthlyBreakdown: [],
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("statement");
  const [cardDetailType, setCardDetailType] = useState<"OVERDUE" | "CURRENT" | "PREVIOUS" | "PAID" | null>(null);

  const fetchStudentFees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/fees");
      const data = await res.json();
      if (data.ok) {
        setStudent(data.student);
        setSummary(data.summary || {});
      } else {
        toast({ title: "ত্রুটি", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "ফি তথ্য লোড করা যায়নি।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentFees();
  }, []);

  const markNotificationRead = async (id?: number) => {
    try {
      await fetch("/api/student/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      fetchStudentFees();
    } catch {
      // silent
    }
  };

  const unreadNotifications = (summary.notifications || []).filter((n: any) => n.is_read === 0);

  const displayedPendingItems = (summary.pendingItems || []).filter((it: any) =>
    selectedMonthFilter === "all" ? true : String(it.month) === selectedMonthFilter
  );

  const displayedPaidItems = (summary.paidItems || []).filter((it: any) =>
    selectedMonthFilter === "all" ? true : String(it.month) === selectedMonthFilter
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">আমার ফি ও বকেয়া হিসাব</h1>
              <p className="text-xs text-slate-500">
                মাসিক বেতন, অনুপস্থিতি ও পরীক্ষার জরিমানার হিসাব এবং পেমেন্ট মানি রিসিট।
              </p>
            </div>
          </div>

          {student && (
            <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-4">
              <StudentAvatar
                photoKey={student.photo_key}
                name={student.name}
                roll={student.roll}
                size="lg"
                className="ring-2 ring-blue-500/30"
              />
              <div className="text-left sm:text-right">
                <div className="text-sm font-bold text-slate-800">{student.name}</div>
                <div className="text-[11px] text-slate-500">
                  রোল: {bn(student.roll)} • {classLabel(student.class_name)}
                  {student.batch_name ? ` • ${student.batch_name}` : ""}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Unread Due Notifications Alert Banner */}
      {unreadNotifications.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Bell className="h-4 w-4 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">বকেয়া তাগিদ নোটিফিকেশন</span>
                <button
                  onClick={() => markNotificationRead()}
                  className="text-[10px] text-rose-600 hover:underline"
                >
                  সব পঠিত করুন
                </button>
              </div>
              {unreadNotifications.map((n: any) => (
                <div key={n.id} className="text-xs text-rose-800 flex items-baseline justify-between">
                  <span>{n.message}</span>
                  <span className="text-[10px] text-rose-500 ml-2 whitespace-nowrap">
                    {n.created_at?.split("T")[0] || n.created_at}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Summary Cards: Clickable to view detailed breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Overdue Card — Only for items past due date */}
        <Card
          onClick={() => setCardDetailType("OVERDUE")}
          className={`shadow-xs cursor-pointer transition-all hover:shadow-md active:scale-[0.99] group ${
            (summary.overdueDue || 0) > 0
              ? "border-rose-200 bg-gradient-to-br from-rose-50/70 to-white hover:border-rose-400"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white hover:border-emerald-400"
          }`}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-rose-700 line-clamp-1">মেয়াদোত্তীর্ণ বকেয়া</span>
              <span
                className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full ${
                  (summary.overdueDue || 0) > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {(summary.overdueDue || 0) > 0 ? (
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span
                className={`text-lg sm:text-2xl font-bold ${
                  (summary.overdueDue || 0) > 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {bn(summary.overdueDue || 0)} ৳
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
                {(summary.overdueDue || 0) > 0
                  ? "জমার শেষ তারিখ পার হয়ে গেছে"
                  : "আলহামদুলিল্লাহ, বকেয়া নেই!"}
              </p>
              <span className="text-[10px] font-bold text-rose-700 underline shrink-0">বিবরণ →</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Current Month Fee Card — Items before due date */}
        <Card
          onClick={() => setCardDetailType("CURRENT")}
          className="border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-sky-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-sky-800 line-clamp-1">
                চলতি মাস ({MONTHS_BN[currentMonthDhaka() - 1]}) ও প্রদেয়
              </span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-sky-800">
                {bn(summary.currentMonthDue || summary.totalCurrentPayable || 0)} ৳
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-sky-600 line-clamp-1">
                {(summary.currentMonthDue || summary.totalCurrentPayable || 0) > 0
                  ? "জমার তারিখ বাকি (চলতি ফি)"
                  : "চলতি মাসের সব পরিশোধিত"}
              </p>
              <span className="text-[10px] font-bold text-sky-700 underline shrink-0">বিবরণ →</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Previous Months Due */}
        <Card
          onClick={() => setCardDetailType("PREVIOUS")}
          className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-white shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-amber-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-800 line-clamp-1">পূর্বের মাসের হিসাব</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-amber-800">
                {bn(summary.previousMonthsDue || 0)} ৳
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-amber-700 line-clamp-1">
                {(summary.previousMonthsDue || 0) > 0
                  ? "পূর্ববর্তী মাসের অপরিশোধিত বকেয়া"
                  : "পূর্ববর্তী মাসের হিসাব ক্লিয়ার"}
              </p>
              <span className="text-[10px] font-bold text-amber-800 underline shrink-0">বিবরণ →</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Paid & Discount Card */}
        <Card
          onClick={() => setCardDetailType("PAID")}
          className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-emerald-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 line-clamp-1">সর্বমোট পরিশোধিত (Paid)</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-emerald-800">{bn(summary.totalPaid)} ৳</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-emerald-600 line-clamp-1">
                মোট রসিদ: {bn((summary.payments || []).length)}টি
                {summary.totalDiscount > 0 ? ` • বিশেষ ছাড়: ${bn(summary.totalDiscount)} ৳` : ""}
              </p>
              <span className="text-[10px] font-bold text-emerald-700 underline shrink-0">বিবরণ →</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700">মাস ফিল্টার ও বিবরণী:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
            <SelectTrigger className="h-8 min-w-[200px] text-xs bg-white">
              <SelectValue placeholder="সকল মাস" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল মাস ও বিবরণী</SelectItem>
              {summary.monthlyBreakdown?.map((mb: any) => (
                <SelectItem key={`${mb.year}-${mb.month}`} value={String(mb.month)}>
                  {mb.monthName} ({mb.totalDue > 0 ? `বকেয়া: ${bn(mb.totalDue)}৳` : "পরিশোধিত"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMonthFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonthFilter("all")}
              className="h-8 text-xs text-blue-600 hover:text-blue-800"
            >
              সব মাস দেখান
            </Button>
          )}
        </div>
      </div>

      {/* 4. Tabs: Month-by-Month Statement, Pending Dues, Paid Items, and Payment Receipts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <TabsList className="bg-slate-100 w-max min-w-full flex justify-start p-1">
            <TabsTrigger value="statement" className="text-xs font-semibold shrink-0 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">মাসভিত্তিক বেতন বিবরণী</span>
              <span className="sm:hidden">মাসের বেতন</span> ({bn((summary.monthlyBreakdown || []).length)})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs shrink-0 gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">চলতি ও বকেয়া ফি বিবরণ</span>
              <span className="sm:hidden">বকেয়া ও চলতি</span> (
              {bn(
                (summary.pendingItems || []).filter((it: any) =>
                  selectedMonthFilter === "all" ? true : String(it.month) === selectedMonthFilter
                ).length
              )}
              )
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs shrink-0 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">পরিশোধিত তালিকা</span>
              <span className="sm:hidden">পরিশোধিত</span> (
              {bn(
                (summary.paidItems || []).filter((it: any) =>
                  selectedMonthFilter === "all" ? true : String(it.month) === selectedMonthFilter
                ).length
              )}
              )
            </TabsTrigger>
            <TabsTrigger value="receipts" className="text-xs shrink-0 gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">পেমেন্ট স্লিপ ও রসিদ</span>
              <span className="sm:hidden">মানি রসিদ</span> ({bn((summary.payments || []).length)})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 0: Month-by-Month Statement (Details of which month's fee is how much) */}
        <TabsContent value="statement" className="m-0 space-y-4">
          <Card className="border-blue-100 shadow-xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50/70 to-slate-50 p-4 border-b border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    কোন মাসের বেতন কত টাকা (মাসভিত্তিক পুঙ্খানুপুঙ্খ হিসাব)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রতিটি মাসের বেতন, পরিশোধের তারিখ, জমার শেষ তারিখ ও বকেয়ার স্পষ্ট বিবরণ।
                  </CardDescription>
                </div>
                {summary.previousMonthsDue > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold self-start sm:self-auto text-xs py-1 px-2.5">
                    পূর্বের মাসের অবশিষ্ট বকেয়া: {bn(summary.previousMonthsDue)} ৳
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">তথ্য লোড হচ্ছে...</div>
              ) : (summary.monthlyBreakdown || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  কোনো মাসের বেতনের হিসাব পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-3">
                  {(summary.monthlyBreakdown || [])
                    .filter((mb: any) =>
                      selectedMonthFilter === "all" ? true : String(mb.month) === selectedMonthFilter
                    )
                    .map((mb: any) => {
                      const isFullyPaid = mb.totalDue <= 0;
                      return (
                        <div
                          key={`${mb.year}-${mb.month}`}
                          className={`rounded-xl border p-4 transition-all shadow-xs ${
                            isFullyPaid
                              ? "border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-white to-white"
                              : mb.isOverdue
                              ? "border-rose-200 bg-gradient-to-r from-rose-50/50 via-white to-white"
                              : "border-sky-200 bg-gradient-to-r from-sky-50/50 via-white to-white"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-2xs ${
                                  isFullyPaid
                                    ? "bg-emerald-100 text-emerald-700"
                                    : mb.isOverdue
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-bold text-sm text-slate-900">{mb.monthName} এর বেতন ও ফি</h3>
                                  {mb.isCurrentMonth && (
                                    <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px]">
                                      চলতি মাস ({MONTHS_BN[mb.month - 1]})
                                    </Badge>
                                  )}
                                  {mb.isFutureMonth && (
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px]">
                                      {MONTHS_BN[mb.month - 1]} মাসের অগ্রিম ফি
                                    </Badge>
                                  )}
                                  {!mb.isCurrentMonth && !mb.isFutureMonth && mb.isOverdue && (
                                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                                      পূর্ববর্তী মাস (বকেয়া)
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                  {mb.dueDate ? (
                                    <span className={mb.isOverdue ? "text-rose-600 font-semibold" : "text-slate-600"}>
                                      জমার শেষ তারিখ: {mb.dueDate}
                                    </span>
                                  ) : (
                                    <span>মাস শেষ হওয়ার পূর্বে প্রদেয়</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isFullyPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1 text-xs font-bold gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  পরিশোধিত সম্পন্ন
                                </Badge>
                              ) : mb.isOverdue ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 px-3 py-1 text-xs font-bold gap-1">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  মেয়াদোত্তীর্ণ বকেয়া (সময় শেষ)
                                </Badge>
                              ) : (
                                <Badge className="bg-sky-100 text-sky-800 border-sky-300 px-3 py-1 text-xs font-bold gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {mb.statusLabel || "চলতি ফি (জমার সময় বাকি)"}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* 3 Metric Cards for this Month */}
                          <div className="grid grid-cols-3 gap-2 py-3 text-center">
                            <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                              <span className="text-[10px] text-slate-500 font-medium block">মূল ধার্যকৃত বেতন</span>
                              <span className="text-sm sm:text-base font-bold text-slate-800">
                                {bn(mb.totalCharged)} ৳
                              </span>
                            </div>
                            <div className="rounded-lg bg-emerald-50/60 p-2.5 border border-emerald-100">
                              <span className="text-[10px] text-emerald-600 font-medium block">আদায়কৃত টাকা</span>
                              <span className="text-sm sm:text-base font-bold text-emerald-700">
                                {bn(mb.totalPaid)} ৳
                              </span>
                              {mb.totalDiscount > 0 && (
                                <span className="block text-[9px] font-bold text-amber-700">
                                  বিশেষ ছাড়: -{bn(mb.totalDiscount)} ৳
                                </span>
                              )}
                            </div>
                            <div
                              className={`rounded-lg p-2.5 border ${
                                mb.totalDue > 0
                                  ? mb.isOverdue
                                    ? "bg-rose-50/70 border-rose-200"
                                    : "bg-sky-50/70 border-sky-200"
                                  : "bg-emerald-50/60 border-emerald-100"
                              }`}
                            >
                              <span
                                className={`text-[10px] font-bold block ${
                                  mb.totalDue > 0
                                    ? mb.isOverdue
                                      ? "text-rose-600"
                                      : "text-sky-700"
                                    : "text-emerald-600"
                                }`}
                              >
                                {mb.totalDue > 0
                                  ? mb.isOverdue
                                    ? "মেয়াদোত্তীর্ণ বকেয়া"
                                    : "চলতি প্রদেয়"
                                  : "অবশিষ্ট বকেয়া"}
                              </span>
                              <span
                                className={`text-sm sm:text-base font-extrabold ${
                                  mb.totalDue > 0
                                    ? mb.isOverdue
                                      ? "text-rose-700"
                                      : "text-sky-800"
                                    : "text-emerald-700"
                                }`}
                              >
                                {bn(mb.totalDue)} ৳
                              </span>
                            </div>
                          </div>

                          {/* Items Breakdown inside this month */}
                          {mb.items && mb.items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                              <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                                <span>এই মাসের ফি আইটেমসমূহ:</span>
                                <span className="text-[10px] text-slate-400">{bn(mb.items.length)}টি আইটেম</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {mb.items.map((it: any) => (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between rounded-lg bg-white/80 border border-slate-100 px-2.5 py-1.5 text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <span className="font-semibold text-slate-800 truncate block">{it.title}</span>
                                      <span className="text-[10px] text-slate-400">
                                        ধার্য: {bn(it.amount)}৳ • আদায়: {bn(it.paid_amount)}৳
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span
                                        className={`font-bold ${
                                          it.due_amount > 0 ? "text-rose-600" : "text-emerald-600"
                                        }`}
                                      >
                                        {it.due_amount > 0 ? `বাকি ${bn(it.due_amount)}৳` : "পরিশোধিত"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Pending Dues */}
        <TabsContent value="pending" className="m-0 space-y-4">
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                কিসের জন্য কত টাকা প্রদেয় (Itemized Breakdown)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                শেষ তারিখ পার না হলে &quot;বর্তমান মাসের বেতন&quot; এবং পার হলে &quot;বকেয়া&quot; হিসেবে চিহ্নিত থাকে।
              </CardDescription>
            </CardHeader>

            {/* Mobile Card View for Pending Items */}
            <div className="block sm:hidden divide-y divide-slate-100 border-t border-slate-200">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">তথ্য লোড হচ্ছে...</div>
              ) : displayedPendingItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                  ✓ আপনার কোনো বকেয়া বা চলতি প্রদেয় ফি নেই! ধন্যবাদ।
                </div>
              ) : (
                displayedPendingItems.map((item: any) => {
                  const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                    label: item.category,
                    color: "bg-slate-100 text-slate-800",
                  };
                  return (
                    <div key={item.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.title}</h4>
                          {item.reference_note && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.reference_note}</p>
                          )}
                        </div>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 text-center text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">মূল ধার্য</span>
                          <span className="font-semibold text-slate-700">{bn(item.amount)} ৳</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">পরিশোধিত</span>
                          <span className="font-semibold text-emerald-600">{bn(item.paid_amount)} ৳</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-500 font-bold block">বকেয়া প্রদেয়</span>
                          <span className="font-extrabold text-rose-700">{bn(item.due_amount)} ৳</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div>
                          {item.status === "PARTIAL" ? (
                            item.is_overdue ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                আংশিক বকেয়া
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                আংশিক পরিশোধিত
                              </Badge>
                            )
                          ) : item.is_overdue ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                              বকেয়া (মেয়াদ পার)
                            </Badge>
                          ) : (
                            <Badge className={item.category === "MONTHLY_FEE" ? "bg-sky-100 text-sky-800 border-sky-200 text-[10px]" : "bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]"}>
                              {item.type_label || (item.category === "MONTHLY_FEE" ? "চলতি বেতন" : "চলতি ফি")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right text-[10px]">
                          {item.due_date ? (
                            <span className={item.is_overdue ? "text-rose-600 font-bold" : "text-slate-500"}>
                              শেষ: {item.due_date}
                            </span>
                          ) : (
                            <span className="text-slate-400">অফিস সময়ে</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">ফি / জরিমানার নাম</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">মূল ধার্য</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত ও ছাড়</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-rose-700">অবশিষ্ট প্রদেয়</th>
                    <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-600">পরিশোধের শেষ তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        তথ্য লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : displayedPendingItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-emerald-600 font-medium">
                        ✓ আপনার কোনো বকেয়া বা চলতি প্রদেয় ফি নেই! ধন্যবাদ।
                      </td>
                    </tr>
                  ) : (
                    displayedPendingItems.map((item: any) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{item.title}</div>
                            {item.month && (
                              <div className="text-[10px] text-blue-600 font-medium">
                                মাস: {monthLabel(item.month)} {item.year ? bn(item.year) : ""}
                              </div>
                            )}
                            {item.reference_note && (
                              <div className="text-[10px] text-amber-800 font-medium">{item.reference_note}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {bn(item.amount)} ৳
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="font-medium text-emerald-600">{bn(item.paid_amount)} ৳</div>
                            {itemDisc > 0 && (
                              <div className="text-[10px] font-semibold text-amber-700">ছাড়: -{bn(itemDisc)} ৳</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {bn(item.due_amount)} ৳
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.status === "PARTIAL" ? (
                              item.is_overdue ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-[10px]">
                                  আংশিক বকেয়া
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
                                  আংশিক পরিশোধিত
                                </Badge>
                              )
                            ) : item.is_overdue ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-[10px]">
                                বকেয়া (মেয়াদ পার)
                              </Badge>
                            ) : (
                              <Badge className={item.category === "MONTHLY_FEE" ? "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 text-[10px]" : "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100 text-[10px]"}>
                                {item.type_label || (item.category === "MONTHLY_FEE" ? "চলতি বেতন" : "চলতি ফি")}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.due_date ? (
                              <div>
                                <span className="font-medium text-slate-700">{item.due_date}</span>
                                {item.is_overdue ? (
                                  <span className="block text-[10px] font-bold text-rose-600">তারিখ শেষ হয়েছে</span>
                                ) : (
                                  <span className="block text-[10px] font-semibold text-sky-700">সময় বাকি আছে</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">অফিস সময়ে</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment Help Guide */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-blue-600" />
              বকেয়া ফি পরিশোধের নিয়মাবলী:
            </div>
            <p>
              ১. একাডেমি অফিসে সরাসরি উপস্থিত হয়ে নগদ পেমেন্ট করে মানি রিসিট সংগ্রহ করতে পারেন।
            </p>
            <p>
              ২. বিকাশ বা নগদ-এ পেমেন্ট করার পর ট্রানজাকশন আইডি (TrxID) অফিসে জানালে ডিজিটাল রিসিট প্রদান করা হবে।
            </p>
          </div>
        </TabsContent>

        {/* Tab 2: Paid Items */}
        <TabsContent value="paid" className="m-0">
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card View for Paid Items */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {displayedPaidItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">পরিশোধিত কোনো ফি রেকর্ড নেই।</div>
              ) : (
                displayedPaidItems.map((item: any) => {
                  const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                    label: item.category,
                    color: "bg-slate-100 text-slate-800",
                  };
                  const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));
                  return (
                    <div key={item.id} className="p-3 space-y-1.5 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-800">{item.title}</h4>
                          {item.reference_note && (
                            <p className="text-[10px] font-medium text-amber-800 mt-0.5">{item.reference_note}</p>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {item.created_at?.split("T")[0] || item.created_at}
                          </span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] shrink-0">
                          পরিশোধিত
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-700">নগদ জমা: {bn(item.paid_amount ?? item.amount)} ৳</span>
                          {itemDisc > 0 && (
                            <span className="block text-[10px] font-semibold text-amber-700">ছাড়: {bn(itemDisc)} ৳ (ধার্য: {bn(item.amount)} ৳)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View for Paid Items */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">ফি বিবরণ ও অডিট নোট</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ধার্য টাকা</th>
                    <th className="py-2.5 px-3 font-semibold text-right">নগদ পরিশোধিত ও ছাড়</th>
                    <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500">তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPaidItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        পরিশোধিত কোনো ফি রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    displayedPaidItems.map((item: any) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {(item.title?.includes("অগ্রিম") || item.reference_note?.includes("ADVANCE")) && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold border border-emerald-200">
                                  অগ্রিম জমা
                                </span>
                              )}
                            </div>
                            {item.reference_note && !item.reference_note.startsWith("ADVANCE:") && (
                              <div className="text-[10px] font-medium text-amber-800 mt-0.5">{item.reference_note}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {bn(item.amount)} ৳
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="font-bold text-emerald-700">{bn(item.paid_amount ?? item.amount)} ৳</div>
                            {itemDisc > 0 && (
                              <div className="text-[10px] font-semibold text-amber-700">ছাড়: -{bn(itemDisc)} ৳</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                              পরিশোধিত
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {item.created_at?.split("T")[0] || item.created_at}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Receipts & Payment History */}
        <TabsContent value="receipts" className="m-0">
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card View for Receipts */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {(summary.payments || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">কোনো পেমেন্ট স্লিপ নেই।</div>
              ) : (
                summary.payments.map((p: any) => (
                  <div key={p.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-blue-700">{p.invoice_no}</span>
                        {p.receipt_note && (
                          <div className="text-[10px] font-medium text-amber-800 mt-0.5">{p.receipt_note}</div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          তারিখ: {fmtDateBnFromUtc(p.payment_date)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {paymentMethodLabelBn(p.payment_method)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500">পরিশোধ: </span>
                        <span className="font-bold text-emerald-700">{bn(p.amount_paid)} ৳</span>
                        {p.discount > 0 && (
                          <span className="text-[10px] font-semibold text-amber-700 ml-1.5">(ছাড়: {bn(p.discount)} ৳)</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReceipt(p);
                          setIsReceiptModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        রসিদ প্রিন্ট
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View for Receipts */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">মানি রিসিট নম্বর ও বিবরণ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত টাকা</th>
                    <th className="py-2.5 px-3 font-semibold text-right">বিশেষ ছাড়</th>
                    <th className="py-2.5 px-3 font-semibold">মাধ্যম</th>
                    <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">রসিদ প্রিন্ট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary.payments || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোনো পেমেন্ট স্লিপ নেই।
                      </td>
                    </tr>
                  ) : (
                    summary.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-blue-700">
                            <span>{p.invoice_no}</span>
                            {p.receipt_note?.includes("অগ্রিম") && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[8px] font-bold border border-emerald-200">
                                অগ্রিম
                              </span>
                            )}
                          </div>
                          {p.receipt_note && (
                            <div className="text-[10px] font-medium text-amber-800 mt-0.5 max-w-sm">
                              {p.receipt_note}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {bn(p.amount_paid)} ৳
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                          {p.discount > 0 ? `${bn(p.discount)} ৳` : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {paymentMethodLabelBn(p.payment_method)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {fmtDateBnFromUtc(p.payment_date)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReceipt(p);
                              setIsReceiptModalOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            মানি রিসিট
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 5. Printable Receipt Dialog */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-md p-6">
          {selectedReceipt && (
            <div className="space-y-4 print-area rounded-xl border border-slate-300 bg-white p-4" id="printable-receipt">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <h2 className="text-lg font-black text-slate-900">বিজ্ঞান পণ্ডিত একাডেমি</h2>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <p className="text-[11px] font-bold text-slate-700">অফিসিয়াল মানি রিসিট / পেমেন্ট স্লিপ (Money Receipt)</p>
                  {selectedReceipt.receipt_note?.includes("অগ্রিম") && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold border border-emerald-200">
                      অগ্রিম / অতিরিক্ত জমা
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded border border-slate-300">
                  <span className="font-mono text-blue-800">রসিদ নং: {selectedReceipt.invoice_no}</span>
                  <span>তারিখ: {fmtDateTimeBnFromUtc(selectedReceipt.payment_date)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
                <StudentAvatar
                  photoKey={student?.photo_key || selectedReceipt.photo_key}
                  name={student?.name || selectedReceipt.student_name}
                  roll={student?.roll || selectedReceipt.student_roll}
                  size="md"
                  className="h-11 w-11 shrink-0 ring-2 ring-white shadow-xs no-print"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900">
                    {student?.name || selectedReceipt.student_name}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    রোল: {bn(student?.roll || selectedReceipt.student_roll)} • শ্রেণি: {classLabel(student?.class_name || selectedReceipt.class_name)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-800 border border-slate-200 rounded-lg p-2.5">
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                  <span className="text-slate-600">পেমেন্ট মাধ্যম:</span>
                  <span className="font-semibold">{paymentMethodLabelBn(selectedReceipt.payment_method)}</span>
                </div>
                {selectedReceipt.transaction_id && (
                  <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200 font-mono text-[11px]">
                    <span className="text-slate-600">ট্রানজাকশন আইডি:</span>
                    <span>{selectedReceipt.transaction_id}</span>
                  </div>
                )}
                {selectedReceipt.receipt_note && (
                  <div className="pt-1 text-[11px] text-slate-700">
                    <span className="text-slate-500 font-semibold">বিবরণ ও অডিট নোট: </span>
                    <span className="font-medium text-slate-900">{selectedReceipt.receipt_note}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border-2 border-slate-800 bg-slate-50 p-3 space-y-1.5 text-xs">
                {Number(selectedReceipt.discount) > 0 && (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>মোট নিষ্পত্তিকৃত ফি (ধার্য বকেয়া):</span>
                      <span className="font-bold">{bn((Number(selectedReceipt.amount_paid) || 0) + (Number(selectedReceipt.discount) || 0))} ৳</span>
                    </div>
                    <div className="flex justify-between text-amber-800 font-semibold border-b border-slate-300 pb-1">
                      <span>বাদ: বিশেষ ছাড় (Discount):</span>
                      <span>(-) {bn(selectedReceipt.discount)} ৳</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-sm pt-0.5">
                  <span className="text-slate-900">নগদ পরিশোধিত / জমাকৃত টাকা:</span>
                  <span className="text-emerald-800">{bn(selectedReceipt.amount_paid)} ৳</span>
                </div>
                {Number(selectedReceipt.discount) > 0 && (
                  <div className="mt-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-bold text-amber-900 text-center">
                    ★ বিশেষ ছাড়ের বিবরণী: {bn(selectedReceipt.amount_paid)} ৳ জমার সময় {bn(selectedReceipt.discount)} ৳ ছাড় দেওয়া হয়েছিল।
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end pt-8 text-[10px] text-slate-700">
                <div className="text-center border-t border-slate-400 pt-1 px-3">
                  শিক্ষার্থী / অভিভাবকের স্বাক্ষর
                </div>
                <div className="text-center border-t border-slate-800 pt-1 px-3 font-semibold">
                  আদায়কারীর স্বাক্ষর ({selectedReceipt.collector_name || "অফিস"})
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 no-print print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  প্রিন্ট মানি রিসিট
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="text-xs"
                >
                  বন্ধ করুন
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Summary Card Detail Breakdown Modal */}
      <Dialog open={cardDetailType !== null} onOpenChange={(o) => !o && setCardDetailType(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          <div
            className={`p-4 text-white ${
              cardDetailType === "OVERDUE"
                ? "bg-gradient-to-r from-rose-700 to-rose-800"
                : cardDetailType === "CURRENT"
                ? "bg-gradient-to-r from-sky-700 to-blue-800"
                : cardDetailType === "PREVIOUS"
                ? "bg-gradient-to-r from-amber-700 to-orange-800"
                : "bg-gradient-to-r from-emerald-700 to-teal-800"
            }`}
          >
            <h3 className="text-base font-bold flex items-center gap-2">
              {cardDetailType === "OVERDUE" && `মেয়াদোত্তীর্ণ বকেয়া বিবরণ (${bn(summary.overdueDue || 0)} ৳)`}
              {cardDetailType === "CURRENT" && `চলতি মাসের প্রদেয় ফি বিবরণ (${bn(summary.currentMonthDue || summary.totalCurrentPayable || 0)} ৳)`}
              {cardDetailType === "PREVIOUS" && `পূর্বের মাসের হিসাব বিবরণ (${bn(summary.previousMonthsDue || 0)} ৳)`}
              {cardDetailType === "PAID" && `পরিশোধিত পেমেন্ট ও মানি রিসিট (${bn(summary.totalPaid || 0)} ৳)`}
            </h3>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
            {cardDetailType === "PAID" ? (
              (summary.payments || []).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">কোনো পরিশোধিত পেমেন্ট রসিদ পাওয়া যায়নি।</p>
              ) : (
                (summary.payments || []).map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-blue-700">{p.invoice_no}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{fmtDateBnFromUtc(p.payment_date)}</div>
                      {p.receipt_note && <div className="text-[10px] text-slate-500 mt-0.5">{p.receipt_note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-emerald-700">{bn(p.amount_paid)} ৳</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCardDetailType(null);
                          setSelectedReceipt(p);
                          setIsReceiptModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-[11px] border-blue-200 text-blue-700"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        রসিদ
                      </Button>
                    </div>
                  </div>
                ))
              )
            ) : (
              (() => {
                const itemsList = (summary.pendingItems || []).filter((it: any) => {
                  if (cardDetailType === "OVERDUE") return !!it.is_overdue;
                  if (cardDetailType === "CURRENT") return !it.is_overdue;
                  return true;
                });
                if (itemsList.length === 0) {
                  return <p className="py-8 text-center text-xs text-slate-400">এই ক্যাটাগরিতে কোনো বকেয়া বা ফি নেই।</p>;
                }
                return itemsList.map((it: any) => (
                  <div key={it.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{it.title}</div>
                      {it.due_date && <div className="text-[10px] text-slate-500 mt-0.5">শেষ তারিখ: {it.due_date}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-700">{bn(it.due_amount)} ৳</div>
                      <div className="text-[10px] text-slate-400">ধার্য: {bn(it.amount)} ৳</div>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <Button size="sm" onClick={() => setCardDetailType(null)} className="text-xs">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
