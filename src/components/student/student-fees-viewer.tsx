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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bn, classLabel } from "@/lib/constants";
import { FEE_CATEGORY_LABELS, type FeeCategory } from "@/lib/fees/engine";

export function StudentFeesViewer() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [summary, setSummary] = useState<any>({
    totalDue: 0,
    totalPaid: 0,
    totalOriginal: 0,
    pendingItems: [],
    paidItems: [],
    payments: [],
    notifications: [],
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="text-xs font-semibold text-slate-700">{student.name}</div>
              <div className="text-[11px] text-slate-500">
                রোল: {bn(student.roll)} • {classLabel(student.class_name)}
                {student.batch_name ? ` • ${student.batch_name}` : ""}
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

      {/* 3. Summary Cards */}
      {/* 3. Summary Cards: Differentiating Overdue vs Current Month Fee */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overdue Card — Only for items past due date */}
        <Card
          className={`shadow-xs ${
            (summary.overdueDue || 0) > 0
              ? "border-rose-200 bg-gradient-to-br from-rose-50/70 to-white"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">মেয়াদোত্তীর্ণ বকেয়া (Overdue)</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  (summary.overdueDue || 0) > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {(summary.overdueDue || 0) > 0 ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  (summary.overdueDue || 0) > 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {bn(summary.overdueDue || 0)} ৳
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {(summary.overdueDue || 0) > 0
                ? "নির্ধারিত শেষ তারিখ পার হয়ে গেছে"
                : "আলহামদুলিল্লাহ, কোনো বকেয়া নেই!"}
            </p>
          </CardContent>
        </Card>

        {/* Current Month Fee Card — Items before due date */}
        <Card className="border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800">বর্তমান মাসের বেতন / চলতি ফি</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Calendar className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-800">
                {bn(summary.totalCurrentPayable || 0)} ৳
              </span>
            </div>
            <p className="mt-1 text-[11px] text-sky-600">
              {(summary.totalCurrentPayable || 0) > 0
                ? "পরিশোধের শেষ তারিখের মধ্যে প্রদেয়"
                : "চলতি মাসের সব পরিশোধিত"}
            </p>
          </CardContent>
        </Card>

        {/* Total Paid Card */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">পরিশোধিত টাকা (Paid)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800">{bn(summary.totalPaid)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-600">
              মোট ট্রানজাকশন: {bn((summary.payments || []).length)}টি
            </p>
          </CardContent>
        </Card>

        {/* Total Payable Card */}
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">সর্বমোট প্রদেয় (Total Due)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800">{bn(summary.totalDue || 0)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-blue-600">
              বকেয়া + চলতি মাসের বেতন
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Tabs: Pending Dues, Paid Items, and Payment Receipts */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="pending" className="text-xs">
            চলতি ও বকেয়া ফি বিবরণ ({bn((summary.pendingItems || []).length)})
          </TabsTrigger>
          <TabsTrigger value="paid" className="text-xs">
            পরিশোধিত তালিকা ({bn((summary.paidItems || []).length)})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs">
            পেমেন্ট স্লিপ ও রসিদ ({bn((summary.payments || []).length)})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending Dues */}
        <TabsContent value="pending" className="m-0 space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                কিসের জন্য কত টাকা প্রদেয় (Itemized Breakdown)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                শেষ তারিখ পার না হলে &quot;বর্তমান মাসের বেতন&quot; এবং পার হলে &quot;বকেয়া&quot; হিসেবে চিহ্নিত থাকে।
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">ফি / জরিমানার নাম</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">মূল ধার্য</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত</th>
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
                  ) : (summary.pendingItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-emerald-600 font-medium">
                        ✓ আপনার কোনো বকেয়া বা চলতি প্রদেয় ফি নেই! ধন্যবাদ।
                      </td>
                    </tr>
                  ) : (
                    summary.pendingItems.map((item: any) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{item.title}</div>
                            {item.reference_note && (
                              <div className="text-[10px] text-slate-500">{item.reference_note}</div>
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
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                            {bn(item.paid_amount)} ৳
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
                                {item.category === "MONTHLY_FEE" ? "বর্তমান মাসের বেতন" : "চলতি ফি"}
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
          <Card className="border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">ফি বিবরণ</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত টাকা</th>
                    <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500">তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary.paidItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        পরিশোধিত কোনো ফি রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    summary.paidItems.map((item: any) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
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
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            {bn(item.amount)} ৳
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
          <Card className="border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">মানি রিসিট নম্বর</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত টাকা</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ছাড়</th>
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
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                          <div className="flex items-center gap-1.5">
                            <span>{p.invoice_no}</span>
                            {p.receipt_note?.includes("অগ্রিম") && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[8px] font-bold border border-emerald-200">
                                অগ্রিম
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {bn(p.amount_paid)} ৳
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {p.discount > 0 ? `${bn(p.discount)} ৳` : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {p.payment_method}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.payment_date?.split("T")[0] || p.payment_date}
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
            <div className="space-y-4" id="printable-receipt">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-base font-bold text-slate-800">বিজ্ঞান পণ্ডিত একাডেমি</h2>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-slate-500">অফিসিয়াল পেমেন্ট মানি রিসিট</p>
                  {selectedReceipt.receipt_note?.includes("অগ্রিম") && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold border border-emerald-200">
                      অগ্রিম / অতিরিক্ত জমা
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] font-semibold text-blue-700">
                  রসিদ নং: {selectedReceipt.invoice_no}
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">শিক্ষার্থী:</span>
                  <span className="font-semibold">{student?.name || selectedReceipt.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রোল ও শ্রেণি:</span>
                  <span>
                    রোল {bn(student?.roll || selectedReceipt.student_roll)}, {classLabel(student?.class_name || selectedReceipt.class_name)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">তারিখ:</span>
                  <span>{selectedReceipt.payment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                  <span>{selectedReceipt.payment_method}</span>
                </div>
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span>পরিশোধিত টাকা:</span>
                  <span className="font-bold text-emerald-700">{bn(selectedReceipt.amount_paid)} ৳</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>বিশেষ ছাড়:</span>
                    <span>{bn(selectedReceipt.discount)} ৳</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end pt-6 text-[10px] text-slate-400">
                <div>সংগ্রাহক: {selectedReceipt.collector_name || "অফিস"}</div>
                <div className="text-center border-t border-slate-300 pt-1 px-4">
                  অনুমোদিত রিসিট
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  প্রিন্ট
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
    </div>
  );
}
