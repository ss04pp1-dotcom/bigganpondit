"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Receipt,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Bell,
  Printer,
  Trash2,
  Sparkles,
  BookOpen,
  DollarSign,
  Calendar,
  Layers,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  X,
  FileText,
  UserCheck,
  PiggyBank,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MONTHS_BN, bn, classLabel } from "@/lib/constants";
import { FEE_CATEGORY_LABELS, type FeeCategory } from "@/lib/fees/engine";

export function AdminFeesManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalCharged: 0,
    totalPaid: 0,
    totalDue: 0,
    absentFineDue: 0,
    failFineDue: 0,
    monthlyFeeDue: 0,
    noteDue: 0,
    defaultersCount: 0,
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCustomFeeModalOpen, setIsCustomFeeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("items");

  // Bulk form state
  const [bulkClassId, setBulkClassId] = useState("all");
  const [bulkBatchId, setBulkBatchId] = useState("all");
  const [bulkMonth, setBulkMonth] = useState(String(new Date().getMonth() + 1));
  const [bulkYear, setBulkYear] = useState(String(new Date().getFullYear()));
  const [bulkAmount, setBulkAmount] = useState("500");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkCustomTitle, setBulkCustomTitle] = useState("");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Custom fee form state
  const [customStudentId, setCustomStudentId] = useState("");
  const [customCategory, setCustomCategory] = useState<FeeCategory>("NOTE_MATERIAL");
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customDueDate, setCustomDueDate] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Payment & Advance form state
  const [paymentMode, setPaymentMode] = useState<"DUE" | "ADVANCE">("DUE");
  const [payStudentId, setPayStudentId] = useState("");
  const [payFeeItemId, setPayFeeItemId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDiscount, setPayDiscount] = useState("0");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payTrxId, setPayTrxId] = useState("");
  const [payNote, setPayNote] = useState("");
  const [advancePurposeType, setAdvancePurposeType] = useState("advance_monthly");
  const [customAdvancePurpose, setCustomAdvancePurpose] = useState("");
  const [advanceMonth, setAdvanceMonth] = useState(String(new Date().getMonth() + 1));
  const [advanceYear, setAdvanceYear] = useState(String(new Date().getFullYear()));
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass !== "all") params.append("classId", filterClass);
      if (filterBatch !== "all") params.append("batchId", filterBatch);
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/admin/fees?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
        setPayments(data.payments || []);
        if (data.stats) setStats(data.stats);
        if (data.classes) setClasses(data.classes);
        if (data.batches) setBatches(data.batches);
        if (data.students) setStudents(data.students);
      } else {
        toast({ title: "ত্রুটি", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "ত্রুটি", description: "ডেটা লোড করতে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterClass, filterBatch, filterCategory, filterStatus]);

  // Sync absent & fail fines
  const handleSyncFines = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/admin/fees/sync-fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "জরিমানা অটো সিঙ্ক সম্পন্ন!",
          description: data.message,
        });
        fetchData();
      } else {
        toast({ title: "সিঙ্ক ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "সিঙ্ক করার সময় সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Send due notifications
  const handleSendDueNotifications = async () => {
    if (!confirm("আপনি কি বকেয়া থাকা সকল শিক্ষার্থীর কাছে তাগিদ নোটিফিকেশন পাঠাতে চান?")) return;
    try {
      setIsNotifying(true);
      const res = await fetch("/api/admin/fees/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: filterClass !== "all" ? filterClass : undefined,
          batchId: filterBatch !== "all" ? filterBatch : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "নোটিফিকেশন পাঠানো হয়েছে!",
          description: data.message,
        });
      } else {
        toast({ title: "ত্রুটি", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "নোটিফিকেশন পাঠানো যায়নি।", variant: "destructive" });
    } finally {
      setIsNotifying(false);
    }
  };

  // Submit bulk monthly fee
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingBulk(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_MONTHLY",
          classId: bulkClassId !== "all" ? bulkClassId : undefined,
          batchId: bulkBatchId !== "all" ? bulkBatchId : undefined,
          month: bulkMonth,
          year: bulkYear,
          amount: bulkAmount,
          dueDate: bulkDueDate,
          customTitle: bulkCustomTitle,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "সফল", description: data.message });
        setIsBulkModalOpen(false);
        fetchData();
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "সংরক্ষণ করা যায়নি।", variant: "destructive" });
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Submit custom fee or fine
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStudentId) {
      toast({ title: "সতর্কতা", description: "শিক্ষার্থী নির্বাচন করুন।", variant: "destructive" });
      return;
    }
    try {
      setIsSubmittingCustom(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_ITEM",
          studentId: customStudentId,
          category: customCategory,
          title: customTitle,
          amount: customAmount,
          dueDate: customDueDate,
          referenceNote: customNote,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "সফল", description: data.message });
        setIsCustomFeeModalOpen(false);
        setCustomStudentId("");
        setCustomTitle("");
        setCustomAmount("");
        fetchData();
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "সংরক্ষণ করা যায়নি।", variant: "destructive" });
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Resolved advance purpose
  const getResolvedAdvancePurpose = () => {
    if (advancePurposeType === "advance_monthly") return "অগ্রিম মাসিক বেতন";
    if (advancePurposeType === "excess_deposit") return "অতিরিক্ত জমা আমানত";
    if (advancePurposeType === "exam_fee") return "ভবিষ্যৎ পরীক্ষার ফি বাবদ অগ্রিম";
    if (advancePurposeType === "notes_sheet") return "নোটস ও শিটের অগ্রিম জমা";
    return customAdvancePurpose.trim() || "অগ্রিম / অতিরিক্ত জমা";
  };

  // Submit payment or advance deposit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudentId || !payAmount) {
      toast({ title: "সতর্কতা", description: "শিক্ষার্থী ও টাকার পরিমাণ দিন।", variant: "destructive" });
      return;
    }

    const isAdv = paymentMode === "ADVANCE";
    const resolvedPurpose = isAdv ? getResolvedAdvancePurpose() : null;

    try {
      setIsSubmittingPay(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          studentId: payStudentId,
          feeItemId: !isAdv && payFeeItemId ? payFeeItemId : undefined,
          amountPaid: payAmount,
          discount: !isAdv ? payDiscount : 0,
          paymentMethod: payMethod,
          transactionId: payTrxId,
          receiptNote: payNote,
          isAdvance: isAdv,
          advancePurpose: resolvedPurpose,
          advanceMonth: isAdv && advanceMonth ? Number(advanceMonth) : undefined,
          advanceYear: isAdv && advanceYear ? Number(advanceYear) : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: isAdv ? "অগ্রিম জমা সম্পন্ন!" : "পেমেন্ট সফল!",
          description: data.message,
        });
        setIsPaymentModalOpen(false);
        const paidStudent = students.find((s) => String(s.id) === String(payStudentId));
        const invoiceNo = data.invoiceNo;
        const currentPayAmount = payAmount;
        const currentDiscount = payDiscount;
        const currentMethod = payMethod;
        const currentNote = payNote;

        setPayStudentId("");
        setPayFeeItemId("");
        setPayAmount("");
        setPayDiscount("0");
        setPayNote("");
        setPayTrxId("");
        setCustomAdvancePurpose("");
        await fetchData();

        // Switch to payments tab so user sees the newly recorded payment immediately
        setActiveTab("payments");

        // Automatically open the printable money receipt modal
        if (invoiceNo) {
          setSelectedReceipt({
            invoice_no: invoiceNo,
            student_name: paidStudent?.name || "শিক্ষার্থী",
            student_roll: paidStudent?.roll || "",
            class_name: paidStudent?.class_name || "",
            amount_paid: Number(currentPayAmount),
            discount: Number(currentDiscount) || 0,
            payment_method: currentMethod,
            payment_date: new Date().toISOString(),
            collector_name: "অ্যাডমিন",
            receipt_note: currentNote,
            is_advance: isAdv || data.isAdvance,
            advance_purpose: resolvedPurpose,
            advance_surplus: data.advanceSurplus || 0,
          });
          setIsReceiptModalOpen(true);
        }
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "পেমেন্ট রেকর্ড করা যায়নি।", variant: "destructive" });
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Delete fee item (supports deleting mistakenly added or paid fee items)
  const handleDeleteItem = async (item: any) => {
    const isPaid = (Number(item.paid_amount) || 0) > 0;
    const confirmMsg = isPaid
      ? `আপনি কি নিশ্চিত যে এই ফি রেকর্ডটি (${item.title}, ${bn(item.amount)} ৳) মুছে ফেলতে চান?\n\nসতর্কতা: এতে ইতিমধ্যে আদায়কৃত পেমেন্ট (${bn(item.paid_amount)} ৳) এবং সংশ্লিষ্ট মানি রিসিটও স্বয়ংক্রিয়ভাবে মুছে যাবে।`
      : `আপনি কি নিশ্চিত যে এই ফি রেকর্ডটি (${item.title}) মুছে ফেলতে চান?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/fees?id=${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "মুছে ফেলা হয়েছে", description: data.message });
        fetchData();
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "মুছতে সমস্যা হয়েছে।", variant: "destructive" });
    }
  };

  // Delete / Cancel wrongly recorded payment
  const handleDeletePayment = async (payment: any) => {
    const confirmMsg = `আপনি কি নিশ্চিত যে মানি রিসিট নং ${payment.invoice_no} (${bn(payment.amount_paid)} ৳)-এর পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?\n\nভুলবশত জমা হয়ে থাকলে এটি বাতিল করলে বকেয়া পুনর্নির্ধারণ করা হবে।`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/fees?type=payment&paymentId=${payment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "পেমেন্ট বাতিল সম্পন্ন", description: data.message });
        fetchData();
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "পেমেন্ট বাতিল করতে সমস্যা হয়েছে।", variant: "destructive" });
    }
  };

  // Open payment for specific student item
  const openPayForItem = (item: any) => {
    setPaymentMode("DUE");
    setPayStudentId(String(item.student_id));
    setPayFeeItemId(String(item.id));
    setPayAmount(String(item.due_amount));
    setPayDiscount("0");
    setIsPaymentModalOpen(true);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.student_name?.toLowerCase().includes(q) ||
        String(it.student_roll).includes(q) ||
        it.title?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Selected student dues in payment modal
  const selectedStudentPendingItems = useMemo(() => {
    if (!payStudentId) return [];
    return items.filter(
      (it) => String(it.student_id) === payStudentId && it.status !== "PAID"
    );
  }, [items, payStudentId]);

  const totalSelectedStudentDue = useMemo(() => {
    return selectedStudentPendingItems.reduce((acc, it) => acc + (Number(it.due_amount) || 0), 0);
  }, [selectedStudentPendingItems]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">ফি ও বকেয়া ব্যবস্থাপনা</h1>
              <p className="text-xs text-slate-500">
                মাসিক বেতন, অনুপস্থিতি ও ফেল জরিমানা (অটো-সিঙ্ক), নোটস বিক্রি এবং পেমেন্ট রিসিট।
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Fine Sync Button */}
          <Button
            onClick={handleSyncFines}
            disabled={isSyncing}
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium text-xs h-9 shadow-xs"
          >
            <Sparkles className={`mr-1.5 h-3.5 w-3.5 text-amber-600 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "সিঙ্ক হচ্ছে..." : "অটো জরিমানা সিঙ্ক (Absent & Fail)"}
          </Button>

          {/* Bulk Monthly Fee Generator Button */}
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs h-9 shadow-xs"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
            মাসিক বেতন জেনারেটর
          </Button>

          {/* Add Custom Fee/Fine/Notes Button */}
          <Button
            onClick={() => setIsCustomFeeModalOpen(true)}
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs h-9 shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            জরিমানা / নোটস যোগ
          </Button>

          {/* Receive Due Payment Button */}
          <Button
            onClick={() => {
              setPaymentMode("DUE");
              setPayStudentId("");
              setPayFeeItemId("");
              setPayAmount("");
              setIsPaymentModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 shadow-xs"
          >
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            পেমেন্ট গ্রহণ / বকেয়া আদায়
          </Button>

          {/* Advance Deposit Option Button */}
          <Button
            onClick={() => {
              setPaymentMode("ADVANCE");
              setPayStudentId("");
              setPayFeeItemId("");
              setPayAmount("");
              setAdvancePurposeType("advance_monthly");
              setIsPaymentModalOpen(true);
            }}
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium text-xs h-9 shadow-xs"
          >
            <PiggyBank className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
            অগ্রিম / অতিরিক্ত জমা
          </Button>

          {/* Send Due Notification Reminder Button */}
          <Button
            onClick={handleSendDueNotifications}
            disabled={isNotifying}
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-xs h-9 shadow-xs"
          >
            <Bell className={`mr-1.5 h-3.5 w-3.5 text-purple-600 ${isNotifying ? "animate-pulse" : ""}`} />
            {isNotifying ? "পাঠানো হচ্ছে..." : "বকেয়া তাগিদ নোটিফিকেশন"}
          </Button>
        </div>
      </div>

      {/* 2. Top Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-rose-100 bg-gradient-to-br from-rose-50/60 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700">সর্বমোট বকেয়া (Due)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-800">{bn(stats.totalDue)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-rose-600">
              বকেয়া শিক্ষার্থী: <span className="font-bold">{bn(stats.defaultersCount)}</span> জন
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">সর্বমোট আদায় (Paid)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800">{bn(stats.totalPaid)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-600">
              মোট ধার্য: {bn(stats.totalCharged)} ৳
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/60 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">অনুপস্থিতি জরিমানা (২০৳)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800">{bn(stats.absentFineDue)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-600">পরীক্ষায় অনুপস্থিতির বকেয়া জরিমানা</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-purple-50/60 to-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">ফেল জরিমানা (৫০৳)</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-800">{bn(stats.failFineDue)} ৳</span>
            </div>
            <p className="mt-1 text-[11px] text-purple-600">পরীক্ষায় ফেল সংক্রান্ত বকেয়া জরিমানা</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="items" className="text-xs">
              বকেয়া ও ধার্যকৃত ফি তালিকা ({bn(items.length)})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">
              পেমেন্ট হিস্ট্রি ও মানি রিসিট ({bn(payments.length)})
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="শিক্ষার্থী বা বিবরণ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>

          {/* Class Filter */}
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="সকল শ্রেণি" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল শ্রেণি</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {classLabel(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Batch Filter */}
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="সকল ব্যাচ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল ব্যাচ</SelectItem>
              {batches
                .filter((b) => filterClass === "all" || String(b.class_id) === filterClass)
                .map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name} ({classLabel(b.class_name)})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="সকল ক্যাটাগরি" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
              {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="সকল স্ট্যাটাস" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
              <SelectItem value="PENDING">সম্পূর্ণ বকেয়া (PENDING)</SelectItem>
              <SelectItem value="PARTIAL">আংশিক বকেয়া (PARTIAL)</SelectItem>
              <SelectItem value="PAID">পরিশোধিত (PAID)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tab 1: Fee Items Table */}
        <TabsContent value="items" className="m-0">
          <Card className="border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">শিক্ষার্থী</th>
                    <th className="py-2.5 px-3 font-semibold">শ্রেণি / ব্যাচ</th>
                    <th className="py-2.5 px-3 font-semibold">ফি-এর বিবরণ</th>
                    <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ধার্য</th>
                    <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-rose-700">বকেয়া</th>
                    <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        তথ্য লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        কোনো ফি রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{item.student_name}</div>
                            <div className="text-[10px] text-slate-400">রোল: {bn(item.student_roll)}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{classLabel(item.class_name)}</div>
                            {item.batch_name && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-200 text-blue-700">
                                {item.batch_name}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">{item.title}</div>
                            {item.reference_note && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {item.reference_note}
                              </div>
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
                            {item.status === "PAID" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                                পরিশোধিত
                              </Badge>
                            ) : item.status === "PARTIAL" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
                                আংশিক
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-[10px]">
                                বকেয়া
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            {item.status !== "PAID" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPayForItem(item)}
                                className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              >
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                গ্রহণ
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="ফি রেকর্ডটি মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

        {/* Tab 2: Payments Ledger Table */}
        <TabsContent value="payments" className="m-0">
          <Card className="border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">রসিদ নম্বর</th>
                    <th className="py-2.5 px-3 font-semibold">শিক্ষার্থী</th>
                    <th className="py-2.5 px-3 font-semibold">শ্রেণি</th>
                    <th className="py-2.5 px-3 font-semibold text-right">আদায়কৃত টাকা</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ছাড়</th>
                    <th className="py-2.5 px-3 font-semibold">পেমেন্ট মাধ্যম</th>
                    <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-3 font-semibold">সংগ্রাহক</th>
                    <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        কোনো পেমেন্ট রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                          {p.invoice_no}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{p.student_name}</div>
                          <div className="text-[10px] text-slate-400">রোল: {bn(p.student_roll)}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {classLabel(p.class_name)}
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
                          {p.transaction_id && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              Trx: {p.transaction_id}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.payment_date?.split("T")[0] || p.payment_date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.collector_name || "অ্যাডমিন"}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReceipt(p);
                              setIsReceiptModalOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="রসিদ প্রিন্ট করুন"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            রসিদ
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePayment(p)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="ভুলবশত গৃহীত পেমেন্ট বাতিল / মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* 4. MODAL: Bulk Monthly Fee Generator */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              মাসিক টিউশন ফি জেনারেটর
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              নির্দিষ্ট শ্রেণি বা ব্যাচের সকল শিক্ষার্থীর অ্যাকাউন্টে এক ক্লিকে মাসিক বেতন ধার্য করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBulkSubmit} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">শ্রেণি নির্বাচন</Label>
                <Select value={bulkClassId} onValueChange={setBulkClassId}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="সকল শ্রেণি" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল শ্রেণি</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {classLabel(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">নির্দিষ্ট ব্যাচ (ঐচ্ছিক)</Label>
                <Select value={bulkBatchId} onValueChange={setBulkBatchId}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="সকল ব্যাচ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল ব্যাচ</SelectItem>
                    {batches
                      .filter((b) => bulkClassId === "all" || String(b.class_id) === bulkClassId)
                      .map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">মাস</Label>
                <Select value={bulkMonth} onValueChange={setBulkMonth}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="মাস" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_BN.map((m, idx) => {
                      if (!m) return null;
                      return (
                        <SelectItem key={idx} value={String(idx)}>
                          {m}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">বছর</Label>
                <Input
                  value={bulkYear}
                  onChange={(e) => setBulkYear(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">টাকার পরিমাণ (৳)</Label>
                <Input
                  type="number"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">পরিশোধের শেষ তারিখ</Label>
                <Input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">কাস্টম শিরোনাম (ঐচ্ছিক)</Label>
              <Input
                placeholder="যেমন: এপ্রিল ২০২৫ — মাসিক বেতন"
                value={bulkCustomTitle}
                onChange={(e) => setBulkCustomTitle(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBulkModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingBulk}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSubmittingBulk ? "জেনারেট হচ্ছে..." : "ফি জেনারেট করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL: Custom Fee / Fine / Notes Selling */}
      <Dialog open={isCustomFeeModalOpen} onOpenChange={setIsCustomFeeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              জরিমানা বা নোটস বিক্রির ফি যোগ করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              নির্দিষ্ট শিক্ষার্থীর অ্যাকাউন্টে নোটস বিক্রির মূল্য বা জরিমানা যুক্ত করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCustomSubmit} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">শিক্ষার্থী নির্বাচন</Label>
              <Select value={customStudentId} onValueChange={setCustomStudentId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="শিক্ষার্থী খুঁজুন..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {students.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name} (রোল: {bn(st.roll)}, {classLabel(st.class_name)}
                      {st.batch_name ? ` • ${st.batch_name}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ফি-এর ক্যাটাগরি</Label>
                <Select
                  value={customCategory}
                  onValueChange={(v) => setCustomCategory(v as FeeCategory)}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE_MATERIAL">নোটস ও শিট বিক্রি</SelectItem>
                    <SelectItem value="OTHER_FINE">দেরিতে আসার/অন্যান্য জরিমানা</SelectItem>
                    <SelectItem value="EXAM_FEE">পরীক্ষার ফি</SelectItem>
                    <SelectItem value="ADMISSION_FEE">ভর্তি/সেশন ফি</SelectItem>
                    <SelectItem value="MONTHLY_FEE">মাসিক বেতন</SelectItem>
                    <SelectItem value="OTHER_FEE">বিবিধ ফি</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">টাকার পরিমাণ (৳)</Label>
                <Input
                  type="number"
                  placeholder="যেমন: ৫০ বা ১০০"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">ফি বা নোটসের নাম / বিবরণ</Label>
              <Input
                placeholder="যেমন: পদার্থবিজ্ঞান অধ্যায় ৩ স্পেশাল নোটস বা দেরিতে আসার জরিমানা"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs">রেফারেন্স বা মন্তব্য (ঐচ্ছিক)</Label>
              <Input
                placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomFeeModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCustom}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isSubmittingCustom ? "সংরক্ষণ হচ্ছে..." : "ফি যুক্ত করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL: Payment Collection & Advance Deposit */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              {paymentMode === "ADVANCE" ? (
                <>
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                  অগ্রিম / অতিরিক্ত জমা ও রসিদ
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 text-blue-600" />
                  পেমেন্ট গ্রহণ ও বকেয়া আদায়
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {paymentMode === "ADVANCE"
                ? "বকেয়া ছাড়া আগেই পরিশোধিত টাকা বা ভবিষ্যতের জন্য অতিরিক্ত জমা আমানত হিসেবে রেকর্ড করুন।"
                : "শিক্ষার্থীর বকেয়া ফি পরিশোধ গ্রহণ করে ডিজিটাল মানি রিসিট তৈরি করুন।"}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setPaymentMode("DUE");
                setPayFeeItemId("");
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                paymentMode === "DUE"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              বকেয়া আদায়
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMode("ADVANCE");
                setPayFeeItemId("");
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                paymentMode === "ADVANCE"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PiggyBank className="h-3.5 w-3.5" />
              অগ্রিম / অতিরিক্ত জমা
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-3 py-1 text-xs">
            {/* Advance Mode Helper Banner */}
            {paymentMode === "ADVANCE" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-900 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <Coins className="h-3.5 w-3.5 text-emerald-600" />
                  আলাদা অগ্রিম বা অতিরিক্ত জমা অপশন
                </div>
                <p className="text-[11px] text-emerald-700">
                  শিক্ষার্থী বকেয়া ছাড়াই আগেই জমা দিয়ে থাকলে কিংবা অতিরিক্ত টাকা জমা রাখতে চাইলে এই স্লিপ ব্যবহার করুন।
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">শিক্ষার্থী নির্বাচন</Label>
              <Select value={payStudentId} onValueChange={setPayStudentId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {students.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name} (রোল: {bn(st.roll)}, {classLabel(st.class_name)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DUE MODE: If student selected, show pending dues or FALLBACK */}
            {paymentMode === "DUE" && payStudentId && (
              <>
                {selectedStudentPendingItems.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
                      <span>এই শিক্ষার্থীর বকেয়া ফি সমূহ ({bn(selectedStudentPendingItems.length)}টি):</span>
                      <span className="font-bold text-rose-700">মোট বকেয়া: {bn(totalSelectedStudentDue)} ৳</span>
                    </div>

                    <div className="flex items-center justify-end pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPayFeeItemId("");
                          setPayAmount(String(totalSelectedStudentDue));
                        }}
                        className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 font-semibold"
                      >
                        সম্পূর্ণ বকেয়া পরিশোধ ({bn(totalSelectedStudentDue)} ৳)
                      </button>
                    </div>

                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {selectedStudentPendingItems.map((pi) => (
                        <div
                          key={pi.id}
                          onClick={() => {
                            setPayFeeItemId(String(pi.id));
                            setPayAmount(String(pi.due_amount));
                          }}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-[10px] ${
                            payFeeItemId === String(pi.id)
                              ? "bg-blue-100 border border-blue-300 font-semibold text-blue-900"
                              : "bg-white hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="truncate pr-2">{pi.title}</span>
                          <span className="font-bold text-rose-600 whitespace-nowrap">
                            {bn(pi.due_amount)} ৳
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Extra money notice if payAmount exceeds total due */}
                    {Number(payAmount) > totalSelectedStudentDue && (
                      <div className="rounded bg-indigo-50 border border-indigo-200 p-2 text-[10px] text-indigo-800 font-medium">
                        ✓ বকেয়া {bn(totalSelectedStudentDue)} ৳ পরিশোধের পর অবশিষ্ট {bn(Number(payAmount) - totalSelectedStudentDue)} ৳ স্বয়ংক্রিয়ভাবে অতিরিক্ত অগ্রিম জমা হিসেবে অ্যাকাউন্টে সংরক্ষিত থাকবে।
                      </div>
                    )}
                  </div>
                ) : (
                  /* FALLBACK: No dues for this student */
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-emerald-950">কোনো বকেয়া নেই! (সব পরিশোধিত)</div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          এই শিক্ষার্থীর বর্তমানে কোনো অপরিশোধিত ফি বা জরিমানা বকেয়া নেই।
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-900">
                        শিক্ষার্থী যদি আগেই জমা দিয়ে থাকে বা অতিরিক্ত টাকা জমা রাখতে চান:
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setPaymentMode("ADVANCE");
                          setAdvancePurposeType("advance_monthly");
                        }}
                        className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0"
                      >
                        <PiggyBank className="h-3.5 w-3.5 mr-1" />
                        অগ্রিম জমার অপশনে যান
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ADVANCE MODE: Advance Purpose & Month/Year */}
            {paymentMode === "ADVANCE" && (
              <>
                <div>
                  <Label className="text-xs">জমার উদ্দেশ্য / খাত</Label>
                  <Select value={advancePurposeType} onValueChange={setAdvancePurposeType}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance_monthly">অগ্রিম মাসিক বেতন</SelectItem>
                      <SelectItem value="excess_deposit">অতিরিক্ত টাকা জমা আমানত</SelectItem>
                      <SelectItem value="exam_fee">ভবিষ্যৎ পরীক্ষার ফি বাবদ অগ্রিম</SelectItem>
                      <SelectItem value="notes_sheet">নোটস ও শিটের অগ্রিম জমা</SelectItem>
                      <SelectItem value="custom">অন্যান্য উদ্দেশ্য (কাস্টম)</SelectItem>
                    </SelectContent>
                  </Select>

                  {advancePurposeType === "custom" && (
                    <Input
                      placeholder="উদ্দেশ্য লিখুন (যেমন: বিশেষ অগ্রিম ফি)"
                      value={customAdvancePurpose}
                      onChange={(e) => setCustomAdvancePurpose(e.target.value)}
                      className="h-8 text-xs mt-1.5"
                      required
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">অগ্রিম মাস (ঐচ্ছিক)</Label>
                    <Select value={advanceMonth} onValueChange={setAdvanceMonth}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_BN.map((m, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">বছর</Label>
                    <Input
                      type="number"
                      value={advanceYear}
                      onChange={(e) => setAdvanceYear(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </>
            )}

            <div className={`grid ${paymentMode === "ADVANCE" ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
              <div>
                <Label className="text-xs">
                  {paymentMode === "ADVANCE" ? "অগ্রিম জমার পরিমাণ (৳)" : "পরিশোধিত টাকা (৳)"}
                </Label>
                <Input
                  type="number"
                  placeholder="টাকার পরিমাণ"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-8 text-xs mt-1 font-bold text-emerald-700"
                  required
                />
              </div>

              {paymentMode === "DUE" && (
                <div>
                  <Label className="text-xs">ছাড় / ডিসকাউন্ট (৳)</Label>
                  <Input
                    type="number"
                    value={payDiscount}
                    onChange={(e) => setPayDiscount(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">পেমেন্ট মাধ্যম</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">নগদ (Cash)</SelectItem>
                    <SelectItem value="BKASH">বিকাশ (bKash)</SelectItem>
                    <SelectItem value="NAGAD">নগদ (Nagad)</SelectItem>
                    <SelectItem value="ROCKET">রকেট (Rocket)</SelectItem>
                    <SelectItem value="BANK">ব্যাংক ট্রান্সফার</SelectItem>
                    <SelectItem value="OTHER">অন্যান্য</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">ট্রানজাকশন আইডি (ঐচ্ছিক)</Label>
                <Input
                  placeholder="bKash/Nagad TrxID"
                  value={payTrxId}
                  onChange={(e) => setPayTrxId(e.target.value)}
                  className="h-8 text-xs mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">রসিদ নোট / মন্তব্য (ঐচ্ছিক)</Label>
              <Input
                placeholder="যেমন: অভিভাবকের মাধ্যমে পরিশোধ / অগ্রিম জমা"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmittingPay ||
                  (paymentMode === "DUE" && payStudentId !== "" && selectedStudentPendingItems.length === 0)
                }
                className={
                  paymentMode === "ADVANCE"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }
              >
                {isSubmittingPay
                  ? "সংরক্ষণ হচ্ছে..."
                  : paymentMode === "DUE" && payStudentId && selectedStudentPendingItems.length === 0
                  ? "বকেয়া নেই (অগ্রিম অপশনে যান)"
                  : paymentMode === "ADVANCE"
                  ? "অগ্রিম জমা নিশ্চিত করুন"
                  : "পেমেন্ট নিশ্চিত করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL: Printable Money Receipt */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-md p-6">
          {selectedReceipt && (
            <div className="space-y-4" id="printable-receipt">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-base font-bold text-slate-800">বিজ্ঞান পণ্ডিত একাডেমি</h2>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-slate-500">অফিসিয়াল মানি রিসিট / পেমেন্ট স্লিপ</p>
                  {(selectedReceipt.is_advance || selectedReceipt.receipt_note?.includes("অগ্রিম")) && (
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
                  <span className="text-slate-500">শিক্ষার্থীর নাম:</span>
                  <span className="font-semibold">{selectedReceipt.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">রোল ও শ্রেণি:</span>
                  <span>
                    রোল {bn(selectedReceipt.student_roll)}, {classLabel(selectedReceipt.class_name)}
                  </span>
                </div>
                {selectedReceipt.advance_purpose && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">জমার উদ্দেশ্য:</span>
                    <span className="font-semibold text-emerald-700">{selectedReceipt.advance_purpose}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">তারিখ:</span>
                  <span>{selectedReceipt.payment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                  <span>{selectedReceipt.payment_method}</span>
                </div>
                {selectedReceipt.transaction_id && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">ট্রানজাকশন আইডি:</span>
                    <span>{selectedReceipt.transaction_id}</span>
                  </div>
                )}
                {selectedReceipt.receipt_note && (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span className="text-slate-500">মন্তব্য:</span>
                    <span>{selectedReceipt.receipt_note}</span>
                  </div>
                )}
              </div>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span>পরিশোধিত / জমাকৃত টাকা:</span>
                  <span className="font-bold text-emerald-700">{bn(selectedReceipt.amount_paid)} ৳</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>বিশেষ ছাড়:</span>
                    <span>{bn(selectedReceipt.discount)} ৳</span>
                  </div>
                )}
                {selectedReceipt.advance_surplus > 0 && (
                  <div className="flex justify-between text-indigo-700 bg-indigo-50/80 p-1 rounded text-[11px]">
                    <span>উদ্বৃত্ত অতিরিক্ত জমা হিসেবে সংরক্ষিত:</span>
                    <span className="font-bold">{bn(selectedReceipt.advance_surplus)} ৳</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end pt-6 text-[10px] text-slate-400">
                <div>সংগ্রাহক: {selectedReceipt.collector_name || "অ্যাডমিন"}</div>
                <div className="text-center border-t border-slate-300 pt-1 px-4">
                  অনুমোদিত স্বাক্ষর
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
                  প্রিন্ট স্লিপ
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
