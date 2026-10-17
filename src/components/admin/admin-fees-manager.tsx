"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Users,
  User,
  Info,
  ChevronLeft,
  ChevronRight,
  Phone,
  CheckSquare,
  Square,
  Check,
  RotateCcw,
  Clock,
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
import { MONTHS_BN, bn, classLabel, monthLabel, currentMonthDhaka, currentYearDhaka, currentMonthNameBn, fmtDateBnFromUtc, fmtDateTimeBnFromUtc, paymentMethodLabelBn } from "@/lib/constants";
import { FEE_CATEGORY_LABELS, type FeeCategory } from "@/lib/fees/engine";
import { StudentAvatar } from "@/components/app/student-avatar";

export function AdminFeesManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalCharged: 0,
    totalPaid: 0,
    totalDue: 0,
    overdueDue: 0,
    currentMonthDue: 0,
    previousMonthsDue: 0,
    absentFineDue: 0,
    failFineDue: 0,
    monthlyFeeDue: 0,
    noteDue: 0,
    defaultersCount: 0,
    currentDueStudentsCount: 0,
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
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCustomFeeModalOpen, setIsCustomFeeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("items");
  const [cardDetailType, setCardDetailType] = useState<"OVERDUE" | "CURRENT" | "PREVIOUS" | "PAID" | null>(null);

  // Dedicated Student Ledger View State (Filtering without search: Class -> Batch -> Student)
  const [ledgerClassId, setLedgerClassId] = useState("all");
  const [ledgerBatchId, setLedgerBatchId] = useState("all");
  const [ledgerStudentId, setLedgerStudentId] = useState("");
  const [selectedLedgerFeeIds, setSelectedLedgerFeeIds] = useState<number[]>([]);
  const [ledgerPayAmount, setLedgerPayAmount] = useState("");
  const [ledgerPayDiscount, setLedgerPayDiscount] = useState("0");
  const [ledgerPayMethod, setLedgerPayMethod] = useState("CASH");
  const [ledgerPayTrxId, setLedgerPayTrxId] = useState("");
  const [ledgerPayNote, setLedgerPayNote] = useState("");
  const [isSubmittingLedgerPay, setIsSubmittingLedgerPay] = useState(false);

  // Cascading filters inside payment popup modal
  const [payClassId, setPayClassId] = useState("all");
  const [payBatchId, setPayBatchId] = useState("all");

  // Unified Fee Assignment form state (both ALL students in batch/class and INDIVIDUAL student)
  const [feeTarget, setFeeTarget] = useState<"ALL" | "STUDENT">("ALL");
  const [assignClassId, setAssignClassId] = useState("all");
  const [assignBatchId, setAssignBatchId] = useState("all");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignCategory, setAssignCategory] = useState<FeeCategory>("MONTHLY_FEE");
  const [assignMonth, setAssignMonth] = useState(String(currentMonthDhaka()));
  const [assignYear, setAssignYear] = useState(String(currentYearDhaka()));
  const [assignAmount, setAssignAmount] = useState("500");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Bulk form state (backward compatible)
  const [bulkClassId, setBulkClassId] = useState("all");
  const [bulkBatchId, setBulkBatchId] = useState("all");
  const [bulkMonth, setBulkMonth] = useState(String(currentMonthDhaka()));
  const [bulkYear, setBulkYear] = useState(String(currentYearDhaka()));
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
  const [advanceMonth, setAdvanceMonth] = useState(String(currentMonthDhaka()));
  const [advanceYear, setAdvanceYear] = useState(String(currentYearDhaka()));
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
      if (filterMonth !== "all") params.append("month", filterMonth);
      if (filterYear !== "all") params.append("year", filterYear);
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
  }, [filterClass, filterBatch, filterCategory, filterStatus, filterMonth, filterYear]);

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

  // Auto-generate default title based on category, month and year
  const getDefaultTitle = (cat: FeeCategory, m: string, y: string) => {
    const monthName = monthLabel(m);
    switch (cat) {
      case "MONTHLY_FEE":
        return `${monthName} ${y} — মাসিক বেতন`;
      case "EXAM_FEE":
        return `${monthName} ${y} — পরীক্ষার ফি`;
      case "NOTE_MATERIAL":
        return "নোটস ও শিট বিক্রি";
      case "ADMISSION_FEE":
        return "ভর্তি ও সেশন ফি";
      case "OTHER_FINE":
        return "দেরিতে আসার জরিমানা";
      case "OTHER_FEE":
      default:
        return "বিবিধ ফি";
    }
  };

  // Submit Unified Fee Assignment (Both ALL students in class/batch and SINGLE student)
  const handleAssignFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feeTarget === "STUDENT" && !assignStudentId) {
      toast({ title: "সতর্কতা", description: "শিক্ষার্থী নির্বাচন করুন।", variant: "destructive" });
      return;
    }
    if (!assignAmount || Number(assignAmount) <= 0) {
      toast({ title: "সতর্কতা", description: "সঠিক টাকার পরিমাণ দিন।", variant: "destructive" });
      return;
    }

    const finalTitle = assignTitle.trim() || getDefaultTitle(assignCategory, assignMonth, assignYear);

    try {
      setIsSubmittingAssign(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_FEE",
          target: feeTarget,
          classId: assignClassId !== "all" ? assignClassId : undefined,
          batchId: assignBatchId !== "all" ? assignBatchId : undefined,
          studentId: feeTarget === "STUDENT" ? assignStudentId : undefined,
          category: assignCategory,
          title: finalTitle,
          amount: assignAmount,
          month: assignMonth,
          year: assignYear,
          dueDate: assignDueDate || undefined,
          referenceNote: assignNote,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "ফি নির্ধারণ সফল!", description: data.message });
        setIsCustomFeeModalOpen(false);
        setIsBulkModalOpen(false);
        setAssignTitle("");
        setAssignNote("");
        fetchData();
      } else {
        toast({ title: "ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "সংরক্ষণ করা যায়নি।", variant: "destructive" });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Submit bulk monthly fee (re-uses unified flow)
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingBulk(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_FEE",
          target: "ALL",
          classId: bulkClassId !== "all" ? bulkClassId : undefined,
          batchId: bulkBatchId !== "all" ? bulkBatchId : undefined,
          category: "MONTHLY_FEE",
          title: bulkCustomTitle.trim() || `${monthLabel(bulkMonth)} ${bulkYear} — মাসিক বেতন`,
          amount: bulkAmount,
          month: bulkMonth,
          year: bulkYear,
          dueDate: bulkDueDate || undefined,
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
    return handleAssignFeeSubmit(e);
  };

  // Resolved advance purpose
  const getResolvedAdvancePurpose = () => {
    if (advancePurposeType === "advance_monthly") return "অগ্রিম মাসিক বেতন";
    if (advancePurposeType === "excess_deposit") return "অতিরিক্ত জমা আমানত";
    if (advancePurposeType === "exam_fee") return "ভবিষ্যৎ পরীক্ষার ফি বাবদ অগ্রিম";
    if (advancePurposeType === "notes_sheet") return "নোটস ও শিটের অগ্রিম জমা";
    return customAdvancePurpose.trim() || "অগ্রিম / অতিরিক্ত জমা";
  };

  // Auto-calculation for Quick Pay Modal discount
  const handleQuickPayDiscountChange = (val: string) => {
    setPayDiscount(val);
    const disc = Math.max(0, Number(val) || 0);
    const baseDue = payFeeItemId
      ? (selectedStudentPendingItems.find((i) => String(i.id) === payFeeItemId)?.due_amount || totalSelectedStudentDue)
      : totalSelectedStudentDue;
    if (baseDue > 0) {
      setPayAmount(String(Math.max(0, baseDue - disc)));
    }
  };

  // Submit payment or advance deposit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAdv = paymentMode === "ADVANCE";
    const disc = !isAdv ? Math.max(0, Number(payDiscount) || 0) : 0;
    const paidNum = Math.max(0, Number(payAmount) || 0);

    if (!payStudentId || (paidNum <= 0 && disc <= 0)) {
      toast({ title: "সতর্কতা", description: "শিক্ষার্থী ও টাকার পরিমাণ দিন।", variant: "destructive" });
      return;
    }

    const resolvedPurpose = isAdv ? getResolvedAdvancePurpose() : null;
    const discountAudit = disc > 0 ? ` (${bn(paidNum)} ৳ জমার সময় ${bn(disc)} ৳ ছাড় দেওয়া হয়েছিল)` : "";
    const baseNote = payNote.trim() || (isAdv ? "অগ্রিম জমা" : "ফি আদায়");
    const finalNoteWithAudit = baseNote.includes("ছাড় দেওয়া হয়েছিল") ? baseNote : `${baseNote}${discountAudit}`;

    try {
      setIsSubmittingPay(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          studentId: payStudentId,
          feeItemId: !isAdv && payFeeItemId ? payFeeItemId : undefined,
          amountPaid: paidNum,
          discount: disc,
          paymentMethod: payMethod,
          transactionId: payTrxId,
          receiptNote: finalNoteWithAudit,
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
        const currentMethod = payMethod;

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
            amount_paid: paidNum,
            discount: disc,
            payment_method: currentMethod,
            payment_date: new Date().toISOString(),
            collector_name: "অ্যাডমিন",
            receipt_note: finalNoteWithAudit,
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

  // Matching students count for bulk fee assignment
  const matchingStudentsCount = useMemo(() => {
    return students.filter((s) => {
      if (assignClassId !== "all" && String(s.class_id) !== assignClassId) return false;
      if (assignBatchId !== "all" && String(s.batch_id) !== assignBatchId) return false;
      return true;
    }).length;
  }, [students, assignClassId, assignBatchId]);

  // Students available for individual selection (filtered by class & batch if chosen)
  const assignAvailableStudents = useMemo(() => {
    return students.filter((s) => {
      if (assignClassId !== "all" && String(s.class_id) !== assignClassId) return false;
      if (assignBatchId !== "all" && String(s.batch_id) !== assignBatchId) return false;
      return true;
    });
  }, [students, assignClassId, assignBatchId]);

  // Filtered items (supports search and Overdue vs Current status)
  const filteredItems = useMemo(() => {
    let list = items;
    if (filterStatus === "CURRENT") {
      list = list.filter((it) => it.status !== "PAID" && !it.is_overdue);
    } else if (filterStatus === "OVERDUE") {
      list = list.filter((it) => it.status !== "PAID" && it.is_overdue);
    } else if (filterStatus === "PARTIAL") {
      list = list.filter((it) => it.status === "PARTIAL");
    } else if (filterStatus === "PAID") {
      list = list.filter((it) => it.status === "PAID");
    }

    if (filterMonth !== "all") {
      list = list.filter((it) => String(it.month) === filterMonth);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (it) =>
        it.student_name?.toLowerCase().includes(q) ||
        String(it.student_roll).includes(q) ||
        it.title?.toLowerCase().includes(q)
    );
  }, [items, searchQuery, filterStatus, filterMonth]);

  // Selected student dues in payment modal — plain derivation
  const selectedStudentPendingItems = payStudentId
    ? items.filter(
        (it) => String(it.student_id) === payStudentId && it.status !== "PAID"
      )
    : [];

  const totalSelectedStudentDue = selectedStudentPendingItems.reduce(
    (acc, it) => acc + (Number(it.due_amount) || 0),
    0
  );

  // Students filtered for ledger selector
  const ledgerAvailableStudents = useMemo(() => {
    return students.filter((st) => {
      if (ledgerClassId !== "all" && String(st.class_id) !== ledgerClassId) return false;
      if (ledgerBatchId !== "all" && String(st.batch_id) !== ledgerBatchId) return false;
      return true;
    });
  }, [students, ledgerClassId, ledgerBatchId]);

  // Students filtered for payment modal selector
  const payAvailableStudents = useMemo(() => {
    return students.filter((st) => {
      if (payClassId !== "all" && String(st.class_id) !== payClassId) return false;
      if (payBatchId !== "all" && String(st.batch_id) !== payBatchId) return false;
      return true;
    });
  }, [students, payClassId, payBatchId]);

  // Selected student in ledger
  const selectedLedgerStudent = useMemo(() => {
    if (!ledgerStudentId) return null;
    return students.find((st) => String(st.id) === ledgerStudentId) || null;
  }, [students, ledgerStudentId]);

  // Dedicated fetch for selected student ledger to guarantee all records show even if filtered out globally
  const [dedicatedLedgerItems, setDedicatedLedgerItems] = useState<any[] | null>(null);
  const [dedicatedLedgerPayments, setDedicatedLedgerPayments] = useState<any[] | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchDedicatedStudentLedger = useCallback(async (stId: string) => {
    if (!stId) return;
    try {
      setLoadingLedger(true);
      const res = await fetch(`/api/admin/fees?studentId=${stId}`);
      const data = await res.json();
      if (data?.ok) {
        setDedicatedLedgerItems(data.items || []);
        setDedicatedLedgerPayments(data.payments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    if (!ledgerStudentId) {
      setDedicatedLedgerItems(null);
      setDedicatedLedgerPayments(null);
      return;
    }
    fetchDedicatedStudentLedger(ledgerStudentId);
  }, [ledgerStudentId, fetchDedicatedStudentLedger]);

  // All fee items for this selected student
  const studentLedgerItems = useMemo(() => {
    if (!ledgerStudentId) return [];
    if (dedicatedLedgerItems !== null) return dedicatedLedgerItems;
    return items.filter((it) => String(it.student_id) === ledgerStudentId);
  }, [items, ledgerStudentId, dedicatedLedgerItems]);

  // All payments for this selected student
  const studentLedgerPayments = useMemo(() => {
    if (!ledgerStudentId) return [];
    if (dedicatedLedgerPayments !== null) return dedicatedLedgerPayments;
    return payments.filter((p) => String(p.student_id) === ledgerStudentId);
  }, [payments, ledgerStudentId, dedicatedLedgerPayments]);

  const studentPendingDues = useMemo(() => {
    return studentLedgerItems.filter((it) => it.due_amount > 0);
  }, [studentLedgerItems]);

  const studentTotalCharged = useMemo(() => {
    return studentLedgerItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  }, [studentLedgerItems]);

  const studentTotalPaid = useMemo(() => {
    return studentLedgerItems.reduce((acc, it) => acc + (Number(it.paid_amount) || 0), 0);
  }, [studentLedgerItems]);

  const studentTotalDiscount = useMemo(() => {
    const fromPayments = studentLedgerPayments.reduce((acc, p) => acc + (Number(p.discount) || 0), 0);
    const fromItems = studentLedgerItems.reduce((acc, it) => {
      const ch = Number(it.amount) || 0;
      const pd = Number(it.paid_amount) || 0;
      const du = Number(it.due_amount) || 0;
      return acc + Math.max(0, ch - pd - du);
    }, 0);
    return Math.max(fromPayments, fromItems);
  }, [studentLedgerPayments, studentLedgerItems]);

  const studentTotalDue = useMemo(() => {
    return studentLedgerItems.reduce((acc, it) => acc + (Number(it.due_amount) || 0), 0);
  }, [studentLedgerItems]);

  const studentAdvanceSurplus = useMemo(() => {
    return studentLedgerItems
      .filter((it) => it.title?.includes("অগ্রিম") || it.reference_note?.includes("ADVANCE_"))
      .reduce((acc, it) => acc + (Number(it.paid_amount) || 0), 0);
  }, [studentLedgerItems]);

  // Selected fee items sum in ledger
  const selectedFeesSum = useMemo(() => {
    if (selectedLedgerFeeIds.length === 0) return 0;
    return studentLedgerItems
      .filter((it) => selectedLedgerFeeIds.includes(it.id))
      .reduce((acc, it) => acc + (Number(it.due_amount) || 0), 0);
  }, [studentLedgerItems, selectedLedgerFeeIds]);

  // Students with pending dues in the filtered class/batch (for quick pick)
  const studentsWithDues = useMemo(() => {
    const dueMap = new Map<number, { count: number; totalDue: number }>();
    items.forEach((it) => {
      if (it.due_amount > 0) {
        const cur = dueMap.get(it.student_id) || { count: 0, totalDue: 0 };
        cur.count += 1;
        cur.totalDue += Number(it.due_amount) || 0;
        dueMap.set(it.student_id, cur);
      }
    });

    return ledgerAvailableStudents
      .map((st) => {
        const d = dueMap.get(st.id) || { count: 0, totalDue: 0 };
        return {
          ...st,
          dueCount: d.count,
          totalDue: d.totalDue,
        };
      })
      .filter((st) => st.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [ledgerAvailableStudents, items]);

  // Auto-sync ledgerPayAmount when selected fees or discount change
  useEffect(() => {
    const targetDue = selectedLedgerFeeIds.length > 0 ? selectedFeesSum : studentTotalDue;
    const disc = Math.max(0, Number(ledgerPayDiscount) || 0);
    if (targetDue > 0) {
      const netPayable = Math.max(0, targetDue - disc);
      setLedgerPayAmount(String(netPayable));
    } else {
      setLedgerPayAmount("");
    }
  }, [selectedLedgerFeeIds.length, selectedFeesSum, studentTotalDue, ledgerPayDiscount]);

  // Handler for discount change with instant auto-calculation
  const handleLedgerDiscountChange = (val: string) => {
    setLedgerPayDiscount(val);
    const disc = Math.max(0, Number(val) || 0);
    const targetDue = selectedLedgerFeeIds.length > 0 ? selectedFeesSum : studentTotalDue;
    if (targetDue > 0) {
      setLedgerPayAmount(String(Math.max(0, targetDue - disc)));
    }
  };

  // Quick toggle a fee item in ledger
  const toggleLedgerFeeItem = (feeId: number) => {
    setSelectedLedgerFeeIds((prev) => {
      if (prev.includes(feeId)) {
        return prev.filter((id) => id !== feeId);
      } else {
        return [...prev, feeId];
      }
    });
  };

  // Select all pending dues for this student
  const handleSelectAllStudentDues = () => {
    const allPendingIds = studentPendingDues.map((it) => it.id);
    setSelectedLedgerFeeIds(allPendingIds);
  };

  // Clear fee selection
  const handleClearSelectedFees = () => {
    setSelectedLedgerFeeIds([]);
  };

  // Submit quick payment directly from Student Ledger
  const handleLedgerPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerStudentId) {
      toast({ title: "সতর্কতা", description: "শিক্ষার্থী নির্বাচন করুন।", variant: "destructive" });
      return;
    }
    const amt = Math.max(0, Number(ledgerPayAmount) || 0);
    const disc = Math.max(0, Number(ledgerPayDiscount) || 0);
    if (amt <= 0 && disc <= 0) {
      toast({ title: "সতর্কতা", description: "পরিশোধিত টাকার পরিমাণ বা ছাড় দিন।", variant: "destructive" });
      return;
    }

    const discountAudit = disc > 0 ? ` (${bn(amt)} ৳ জমার সময় ${bn(disc)} ৳ ছাড় দেওয়া হয়েছিল)` : "";
    const baseNote = ledgerPayNote.trim() || (selectedLedgerFeeIds.length > 0 ? `${selectedLedgerFeeIds.length}টি ফি পরিশোধ` : "বকেয়া আদায়");
    const finalNoteWithAudit = baseNote.includes("ছাড় দেওয়া হয়েছিল") ? baseNote : `${baseNote}${discountAudit}`;

    try {
      setIsSubmittingLedgerPay(true);
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          studentId: Number(ledgerStudentId),
          feeItemIds: selectedLedgerFeeIds.length > 0 ? selectedLedgerFeeIds : undefined,
          amountPaid: amt,
          discount: disc,
          paymentMethod: ledgerPayMethod,
          transactionId: ledgerPayTrxId.trim() || undefined,
          receiptNote: finalNoteWithAudit,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast({
          title: "পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে!",
          description: data.message,
        });

        // Set receipt modal data so user can print instantly
        if (data.invoiceNo && selectedLedgerStudent) {
          setSelectedReceipt({
            invoice_no: data.invoiceNo,
            student_name: selectedLedgerStudent.name || "শিক্ষার্থী",
            student_roll: selectedLedgerStudent.roll || "",
            class_name: selectedLedgerStudent.class_name || "",
            amount_paid: amt,
            discount: disc,
            payment_method: ledgerPayMethod,
            payment_date: new Date().toISOString(),
            collector_name: "অ্যাডমিন",
            receipt_note: finalNoteWithAudit,
            is_advance: data.isAdvance,
            advance_surplus: data.advanceSurplus || 0,
          });
          setIsReceiptModalOpen(true);
        }

        setSelectedLedgerFeeIds([]);
        setLedgerPayDiscount("0");
        setLedgerPayTrxId("");
        setLedgerPayNote("");
        fetchData();
        if (ledgerStudentId) fetchDedicatedStudentLedger(ledgerStudentId);
      } else {
        toast({ title: "পেমেন্ট ব্যর্থ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "ত্রুটি", description: "পেমেন্ট প্রসেস করতে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setIsSubmittingLedgerPay(false);
    }
  };

  // Step through students in the selected class/batch
  const handlePrevStudent = () => {
    if (!ledgerAvailableStudents.length || !ledgerStudentId) return;
    const currentIndex = ledgerAvailableStudents.findIndex((st) => String(st.id) === ledgerStudentId);
    if (currentIndex > 0) {
      setLedgerStudentId(String(ledgerAvailableStudents[currentIndex - 1].id));
      setSelectedLedgerFeeIds([]);
    }
  };

  const handleNextStudent = () => {
    if (!ledgerAvailableStudents.length) return;
    if (!ledgerStudentId) {
      setLedgerStudentId(String(ledgerAvailableStudents[0].id));
      return;
    }
    const currentIndex = ledgerAvailableStudents.findIndex((st) => String(st.id) === ledgerStudentId);
    if (currentIndex < ledgerAvailableStudents.length - 1) {
      setLedgerStudentId(String(ledgerAvailableStudents[currentIndex + 1].id));
      setSelectedLedgerFeeIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 p-5 shadow-xs no-print">
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
          {/* Primary Unified Fee Assignment Button */}
          <Button
            onClick={() => {
              setFeeTarget("ALL");
              setAssignCategory("MONTHLY_FEE");
              setAssignAmount("500");
              setAssignTitle("");
              setAssignDueDate("");
              setIsCustomFeeModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            ফি নির্ধারণ (সকল বা আলাদা)
          </Button>

          {/* Quick Bulk Monthly Tuition Generator Button */}
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs h-9 shadow-xs"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
            মাসিক বেতন তৈরি (সকল)
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

          {/* Auto Fine Sync Button */}
          <Button
            onClick={handleSyncFines}
            disabled={isSyncing}
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium text-xs h-9 shadow-xs"
          >
            <Sparkles className={`mr-1.5 h-3.5 w-3.5 text-amber-600 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "সিঙ্ক হচ্ছে..." : "অটো জরিমানা সিঙ্ক"}
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

      {/* 2. Top Month & Period Filter Bar (উপরে মাস ফিল্টার ও পূর্বের মাসের পুঙ্খানুপুঙ্খ হিসাব) */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/70 p-3 sm:p-4 shadow-2xs no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>মাস নির্বাচন ও ফিল্টার</span>
                {filterMonth !== "all" && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                    {MONTHS_BN[Number(filterMonth) - 1]} {filterYear}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {filterMonth === "all"
                  ? "সকল মাসের সামগ্রিক হিসাব ও বকেয়া তালিকা প্রদর্শিত হচ্ছে"
                  : `${MONTHS_BN[Number(filterMonth) - 1]} ${filterYear} এর বেতন এবং পূর্বের সকল মাসের বকেয়া হিসাব`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <Button
                type="button"
                size="sm"
                variant={filterMonth === "all" ? "default" : "ghost"}
                onClick={() => setFilterMonth("all")}
                className={`h-7 px-2.5 text-xs font-medium ${
                  filterMonth === "all" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                সকল মাস
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filterMonth === String(currentMonthDhaka()) ? "default" : "ghost"}
                onClick={() => setFilterMonth(String(currentMonthDhaka()))}
                className={`h-7 px-2.5 text-xs font-medium ${
                  filterMonth === String(currentMonthDhaka())
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                চলতি মাস ({currentMonthNameBn()})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  filterMonth === String(currentMonthDhaka() === 1 ? 12 : currentMonthDhaka() - 1)
                    ? "default"
                    : "ghost"
                }
                onClick={() =>
                  setFilterMonth(String(currentMonthDhaka() === 1 ? 12 : currentMonthDhaka() - 1))
                }
                className={`h-7 px-2.5 text-xs font-medium ${
                  filterMonth === String(currentMonthDhaka() === 1 ? 12 : currentMonthDhaka() - 1)
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                গত মাস ({monthLabel(currentMonthDhaka() === 1 ? 12 : currentMonthDhaka() - 1)})
              </Button>
            </div>

            {/* Select 12 Months Dropdown */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 min-w-[130px] text-xs bg-white border-blue-200">
                <SelectValue placeholder="নির্দিষ্ট মাস" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল মাস</SelectItem>
                {MONTHS_BN.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-8 w-24 text-xs bg-white border-blue-200 font-medium">
                <SelectValue placeholder="বছর" />
              </SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026", "2027"].map((y) => (
                  <SelectItem key={y} value={y}>
                    {bn(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset button if filtered */}
            {(filterMonth !== "all" || filterYear !== String(currentYearDhaka())) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMonth("all");
                  setFilterYear(String(currentYearDhaka()));
                }}
                className="h-8 text-xs text-rose-600 hover:bg-rose-50 px-2"
                title="ফিল্টার রিসেট"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                রিসেট
              </Button>
            )}
          </div>
        </div>

        {/* Previous Months' Statement Banner if Filtered by Month */}
        {filterMonth !== "all" && (
          <div className="mt-3 pt-3 border-t border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <span className="font-semibold text-blue-900">
                {MONTHS_BN[Number(filterMonth) - 1]} {filterYear} এর হিসাব:
              </span>
              <span className="font-medium text-slate-800">ধার্য {bn(stats.totalCharged || 0)} ৳</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-semibold">আদায় {bn(stats.totalPaid || 0)} ৳</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-bold">এই মাসের বাকি {bn(stats.totalDue || 0)} ৳</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-semibold text-[11px] py-0.5">
                <Clock className="h-3 w-3 mr-1 text-amber-600" />
                পূর্ববর্তী মাসের অপরিশোধিত বকেয়া: {bn(stats.previousMonthsDue || 0)} ৳
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* 3. Statistics Cards: Clickable to view detailed breakdown of students/accounts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 no-print">
        {/* Card 1: Overdue Due (Past Due Date) */}
        <Card
          onClick={() => setCardDetailType("OVERDUE")}
          className="border-rose-200 bg-gradient-to-br from-rose-50/70 to-white shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-rose-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-rose-700 line-clamp-1">মেয়াদোত্তীর্ণ বকেয়া</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-rose-800">{bn(stats.overdueDue || 0)} ৳</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-rose-600 line-clamp-1">
                তারিখ শেষ • <span className="font-bold">{bn(stats.defaultersCount || 0)}</span> জন শিক্ষার্থী
              </p>
              <span className="text-[10px] font-bold text-rose-700 underline shrink-0">বিবরণ দেখুন →</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Current Month Fee (Before Due Date) */}
        <Card
          onClick={() => setCardDetailType("CURRENT")}
          className="border-sky-200 bg-gradient-to-br from-sky-50/70 to-white shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-sky-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-sky-800 line-clamp-1">চলতি মাসের বেতন</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-sky-800">{bn(stats.currentMonthDue || 0)} ৳</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-sky-600 line-clamp-1">
                তারিখ বাকি (চলতি ফি) • <span className="font-bold">{bn(stats.currentDueStudentsCount || 0)}</span> জন
              </p>
              <span className="text-[10px] font-bold text-sky-700 underline shrink-0">বিবরণ দেখুন →</span>
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
              <span className="text-[11px] sm:text-xs font-semibold text-amber-800 line-clamp-1">পূর্বের মাসের বকেয়া</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-amber-800">{bn(stats.previousMonthsDue || 0)} ৳</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-amber-700 line-clamp-1">
                পূর্ববর্তী মাসের অপরিশোধিত হিসাব
              </p>
              <span className="text-[10px] font-bold text-amber-800 underline shrink-0">বিবরণ দেখুন →</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Collected */}
        <Card
          onClick={() => setCardDetailType("PAID")}
          className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-emerald-400 active:scale-[0.99] group"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 line-clamp-1">সর্বমোট আদায় (Paid)</span>
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-emerald-800">{bn(stats.totalPaid || 0)} ৳</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] text-emerald-600 line-clamp-1">
                ধার্য: {bn(stats.totalCharged || 0)} ৳ • মোট বাকি: {bn(stats.totalDue || 0)} ৳
              </p>
              <span className="text-[10px] font-bold text-emerald-700 underline shrink-0">বিবরণ দেখুন →</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 no-print">
          <div className="w-full overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            <TabsList className="bg-slate-100 p-1 w-max min-w-full flex justify-start">
              <TabsTrigger
                value="items"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs shrink-0"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">চলতি ও বকেয়া ফি তালিকা</span>
                <span className="sm:hidden">ফি তালিকা</span> ({bn(items.length)})
              </TabsTrigger>
              <TabsTrigger
                value="student_account"
                className="text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs shrink-0"
              >
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">শিক্ষার্থীর সব হিসাব এক সাথে (অল-ইন-ওয়ান লেজার)</span>
                <span className="sm:hidden">একক লেজার</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs font-medium shrink-0 gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">পেমেন্ট হিস্ট্রি ও মানি রিসিট</span>
                <span className="sm:hidden">পেমেন্ট রসিদ</span> ({bn(payments.length)})
              </TabsTrigger>
            </TabsList>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-xs text-slate-500 hover:text-slate-800 self-end sm:self-auto shrink-0"
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </Button>
        </div>

        {/* Tab 0: Student Account / All-in-One Ledger & Quick Multi-Fee Collection */}
        <TabsContent value="student_account" className="m-0 space-y-4">
          {/* Cascading Filter Section: Class -> Batch -> Student (No typing search required!) */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/60 shadow-xs no-print">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      শিক্ষার্থীর একক হিসাব ও লেজার (All-in-One Fee Center)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      শ্রেণি ও ব্যাচ সিলেক্ট করে শিক্ষার্থী নির্বাচন করুন। এক স্ক্রিনেই মাসিক বেতন, পরীক্ষার ফি, জরিমানা এবং পূর্বের পেমেন্ট রসিদ পাওয়া যাবে।
                    </p>
                  </div>
                </div>

                {ledgerStudentId && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePrevStudent}
                      disabled={!ledgerAvailableStudents.length || ledgerAvailableStudents.findIndex((st) => String(st.id) === ledgerStudentId) <= 0}
                      className="h-7 text-xs px-2 border-slate-300"
                      title="পূর্ববর্তী শিক্ষার্থী"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                      পূর্ববর্তী
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleNextStudent}
                      disabled={!ledgerAvailableStudents.length || ledgerAvailableStudents.findIndex((st) => String(st.id) === ledgerStudentId) >= ledgerAvailableStudents.length - 1}
                      className="h-7 text-xs px-2 border-slate-300"
                      title="পরবর্তী শিক্ষার্থী"
                    >
                      পরবর্তী
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLedgerStudentId("");
                        setSelectedLedgerFeeIds([]);
                      }}
                      className="h-7 text-xs px-2 text-slate-500 hover:text-rose-600"
                      title="রিসেট"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      রিসেট
                    </Button>
                  </div>
                )}
              </div>

              {/* 3 Cascading Selectors: 1. Class -> 2. Batch -> 3. Student */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Class Select */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    ০১। শ্রেণি সিলেক্ট
                  </Label>
                  <Select
                    value={ledgerClassId}
                    onValueChange={(val) => {
                      setLedgerClassId(val);
                      setLedgerBatchId("all");
                      setLedgerStudentId("");
                      setSelectedLedgerFeeIds([]);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white mt-1 border-slate-200">
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

                {/* 2. Batch Select */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    ০২। ব্যাচ সিলেক্ট
                  </Label>
                  <Select
                    value={ledgerBatchId}
                    onValueChange={(val) => {
                      setLedgerBatchId(val);
                      setLedgerStudentId("");
                      setSelectedLedgerFeeIds([]);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white mt-1 border-slate-200">
                      <SelectValue placeholder="সকল ব্যাচ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ব্যাচ</SelectItem>
                      {batches
                        .filter((b) => ledgerClassId === "all" || String(b.class_id) === ledgerClassId)
                        .map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name} ({classLabel(b.class_name)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Student Select */}
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    ০৩। শিক্ষার্থী নির্বাচন করুন <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={ledgerStudentId}
                    onValueChange={(val) => {
                      setLedgerStudentId(val);
                      setSelectedLedgerFeeIds([]);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white mt-1 border-indigo-300 font-medium">
                      <SelectValue
                        placeholder={
                          ledgerAvailableStudents.length > 0
                            ? `শিক্ষার্থী বেছে নিন (${bn(ledgerAvailableStudents.length)} জন)...`
                            : "নির্বাচিত ফিল্টারে কোনো শিক্ষার্থী নেই"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {ledgerAvailableStudents.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          রোল {bn(st.roll)} — {st.name} ({classLabel(st.class_name)}{st.batch_name ? ` • ${st.batch_name}` : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* If NO student is selected, show instructions & quick-pick list of defaulters */}
          {!ledgerStudentId && (
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-xs">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-base font-bold text-slate-800">
                    শিক্ষার্থী নির্বাচন করে সম্পূর্ণ হিসাব এক নজরে দেখুন
                  </h4>
                  <p className="text-xs text-slate-500">
                    ওপরের ড্রপডাউন থেকে শ্রেণি ও ব্যাচ সিলেক্ট করে শিক্ষার্থী বেছে নিন। শিক্ষার্থীর মাসিক বেতন, পরীক্ষার ফি, অনুপস্থিতি বা ফেল জরিমানার সম্পূর্ণ হিসাব এক জায়গায় এসে যাবে এবং একসাথে একাধিক ফি পরিশোধ করা যাবে।
                  </p>
                </div>

                {/* Quick Pick: Students with pending dues in this class/batch */}
                {studentsWithDues.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 max-w-2xl mx-auto text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        বকেয়া থাকা শিক্ষার্থীগণ ({bn(studentsWithDues.length)} জন) — এক ক্লিকে হিসাব খুলুন:
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {studentsWithDues.slice(0, 10).map((st) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setLedgerClassId(String(st.class_id || "all"));
                            setLedgerBatchId(String(st.batch_id || "all"));
                            setLedgerStudentId(String(st.id));
                            setSelectedLedgerFeeIds([]);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <StudentAvatar
                              photoKey={st.photo_key}
                              name={st.name}
                              roll={st.roll}
                              size="sm"
                              className="h-8 w-8 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">
                                {st.name} <span className="text-slate-400 font-normal">(রোল {bn(st.roll)})</span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {classLabel(st.class_name)} {st.batch_name ? `• ${st.batch_name}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-rose-700">{bn(st.totalDue)} ৳</div>
                            <div className="text-[9px] text-slate-400">{bn(st.dueCount)}টি বকেয়া</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* If Student IS selected: Show Student Profile + Stats + Unified Items + Quick Payment Form + Receipts */}
          {ledgerStudentId && selectedLedgerStudent && (
            <div
              className={`space-y-4 print-ledger-wrapper ${isReceiptModalOpen ? "no-print" : "print-area"}`}
              id={isReceiptModalOpen ? "background-ledger" : "printable-ledger"}
            >
              {/* Formal Institutional Print Header (Only visible when printing Ledger) */}
              <div className="print-only mb-4 border-b-2 border-slate-900 pb-3 text-center">
                <h1 className="text-xl font-black text-slate-900">বিজ্ঞান পণ্ডিত একাডেমি</h1>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  শিক্ষার্থীর অফিসিয়াল ফি ও বকেয়া লেজার স্টেটমেন্ট (Official Fee Ledger)
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-800 border-t border-slate-300 pt-2">
                  <span><strong>শিক্ষার্থীর নাম:</strong> {selectedLedgerStudent.name}</span>
                  <span><strong>রোল:</strong> {bn(selectedLedgerStudent.roll)}</span>
                  <span><strong>শ্রেণি:</strong> {classLabel(selectedLedgerStudent.class_name)}</span>
                  {selectedLedgerStudent.batch_name && <span><strong>ব্যাচ:</strong> {selectedLedgerStudent.batch_name}</span>}
                  <span><strong>প্রিন্টের তারিখ:</strong> {fmtDateBnFromUtc(new Date().toISOString())}</span>
                </div>
              </div>

              {/* Student Profile Card */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/70 p-4 shadow-2xs no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      photoKey={selectedLedgerStudent.photo_key}
                      name={selectedLedgerStudent.name}
                      roll={selectedLedgerStudent.roll}
                      size="lg"
                      className="h-12 w-12 shrink-0 ring-2 ring-indigo-200 shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{selectedLedgerStudent.name}</h2>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-semibold">
                          রোল: {bn(selectedLedgerStudent.roll)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        শ্রেণি: <strong className="text-slate-800">{classLabel(selectedLedgerStudent.class_name)}</strong>
                        {selectedLedgerStudent.batch_name ? ` • ব্যাচ: ${selectedLedgerStudent.batch_name}` : ""}
                        {selectedLedgerStudent.division ? ` • বিভাগ: ${selectedLedgerStudent.division}` : ""}
                        {selectedLedgerStudent.section ? ` • শাখা: ${selectedLedgerStudent.section}` : ""}
                        {selectedLedgerStudent.parent_phone ? (
                          <>
                            {" • "}
                            <a
                              href={`tel:${selectedLedgerStudent.parent_phone}`}
                              className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                            >
                              <Phone className="h-3 w-3" />
                              {selectedLedgerStudent.parent_phone}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this specific student */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto no-print">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setFeeTarget("STUDENT");
                        setAssignClassId(String(selectedLedgerStudent.class_id || "all"));
                        setAssignBatchId(String(selectedLedgerStudent.batch_id || "all"));
                        setAssignStudentId(String(selectedLedgerStudent.id));
                        setIsCustomFeeModalOpen(true);
                      }}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      এই শিক্ষার্থীর জন্য ফি নির্ধারণ
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPaymentMode("ADVANCE");
                        setPayClassId(String(selectedLedgerStudent.class_id || "all"));
                        setPayBatchId(String(selectedLedgerStudent.batch_id || "all"));
                        setPayStudentId(String(selectedLedgerStudent.id));
                        setIsPaymentModalOpen(true);
                      }}
                      className="h-8 text-xs border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 font-medium"
                    >
                      <PiggyBank className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      অগ্রিম / অতিরিক্ত জমা
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      প্রিন্ট লেজার
                    </Button>
                  </div>
                </div>
              </div>

              {/* 5 KPI Summary Cards for this student */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="border-slate-200 bg-white shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] font-semibold text-slate-500">সর্বমোট ধার্য ফি</span>
                    <div className="text-xl font-bold text-slate-800 mt-1">{bn(studentTotalCharged)} ৳</div>
                    <span className="text-[10px] text-slate-400">মোট ধার্যকৃত হিসাব</span>
                  </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-emerald-50/40 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] font-semibold text-emerald-700">নগদ পরিশোধিত (Paid)</span>
                    <div className="text-xl font-bold text-emerald-800 mt-1">{bn(studentTotalPaid)} ৳</div>
                    <span className="text-[10px] text-emerald-600">নগদ জমার মোট</span>
                  </CardContent>
                </Card>

                <Card className="border-amber-100 bg-amber-50/50 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] font-semibold text-amber-800">প্রদত্ত ছাড় (Discount)</span>
                    <div className="text-xl font-bold text-amber-700 mt-1">{bn(studentTotalDiscount)} ৳</div>
                    <span className="text-[10px] text-amber-700">মোট মওকুফকৃত টাকা</span>
                  </CardContent>
                </Card>

                <Card className="border-rose-100 bg-rose-50/50 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] font-semibold text-rose-700">বর্তমান বকেয়া (Due)</span>
                    <div className="text-xl font-bold text-rose-700 mt-1">{bn(studentTotalDue)} ৳</div>
                    <span className="text-[10px] text-rose-600">
                      {studentPendingDues.length > 0 ? `${bn(studentPendingDues.length)}টি ফি অপরিশোধিত` : "কোনো বকেয়া নেই"}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-indigo-100 bg-indigo-50/40 shadow-2xs">
                  <CardContent className="p-3">
                    <span className="text-[11px] font-semibold text-indigo-700">অগ্রিম জমা ক্রেডিট</span>
                    <div className="text-xl font-bold text-indigo-800 mt-1">{bn(studentAdvanceSurplus)} ৳</div>
                    <span className="text-[10px] text-indigo-600">অতিরিক্ত জমা ব্যালেন্স</span>
                  </CardContent>
                </Card>
              </div>

              {/* Unified Fee Items Table for this Student */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-indigo-600 no-print" />
                        এই শিক্ষার্থীর সকল ফি ও জরিমানার তালিকা ({bn(studentLedgerItems.length)}টি)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 no-print">
                        মাসিক বেতন, পরীক্ষার ফি বা জরিমানা আলাদা না খুঁজে এখান থেকেই টিকচিহ্ন দিয়ে এক বা একাধিক ফি একসাথে পরিশোধ করুন।
                      </CardDescription>
                    </div>

                    {studentPendingDues.length > 0 && (
                      <div className="flex items-center gap-2 no-print">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleSelectAllStudentDues}
                          className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <CheckSquare className="h-3.5 w-3.5 mr-1" />
                          সব বকেয়া নির্বাচন ({bn(studentPendingDues.length)}টি)
                        </Button>
                        {selectedLedgerFeeIds.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleClearSelectedFees}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800"
                          >
                            বাতিল
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Mobile Card View for Student Ledger Items */}
                <div className="block sm:hidden divide-y divide-slate-100 border-t border-slate-100 no-print">
                  {studentLedgerItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      এই শিক্ষার্থীর নামে কোনো ফি বা জরিমানার রেকর্ড নেই।
                    </div>
                  ) : (
                    studentLedgerItems.map((item) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      const isSelected = selectedLedgerFeeIds.includes(item.id);
                      const isPaid = item.status === "PAID";
                      const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));

                      return (
                        <div
                          key={item.id}
                          className={`p-3 space-y-2 transition-colors ${
                            isSelected ? "bg-indigo-50/80" : isPaid ? "bg-slate-50/40 text-slate-500" : "hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {!isPaid && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLedgerFeeItem(item.id)}
                                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.title}</h4>
                                <Badge variant="outline" className={`text-[9px] py-0 px-1.5 shrink-0 ${catInfo.color}`}>
                                  {catInfo.label}
                                </Badge>
                              </div>
                              {item.reference_note && (
                                <p className="text-[10px] text-amber-800 font-medium mt-0.5">{item.reference_note}</p>
                              )}
                              {item.due_date && (
                                <p className="text-[10px] text-slate-500 mt-0.5">শেষ তারিখ: {item.due_date}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 text-center text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-400 block">ধার্য</span>
                              <span className="font-semibold text-slate-700">{bn(item.amount)} ৳</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">পরিশোধিত</span>
                              <span className="font-semibold text-emerald-600">{bn(item.paid_amount)} ৳</span>
                              {itemDisc > 0 && (
                                <span className="block text-[9px] font-bold text-amber-700">ছাড়: {bn(itemDisc)} ৳</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-rose-500 font-bold block">বকেয়া</span>
                              <span className="font-extrabold text-rose-700">{bn(item.due_amount)} ৳</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <div>
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                  পরিশোধিত
                                </Badge>
                              ) : item.due_amount < item.amount ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                  আংশিক
                                </Badge>
                              ) : item.is_overdue ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                  বকেয়া
                                </Badge>
                              ) : (
                                <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">
                                  {item.type_label || "চলতি ফি"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLedgerFeeIds([item.id]);
                                    setLedgerPayAmount(String(item.due_amount));
                                  }}
                                  className="h-7 px-2.5 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                  আদায়
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop & Print Table View for Student Ledger Items */}
                <div className="hidden sm:block print:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8 no-print">
                          <span className="sr-only">সিলেক্ট</span>
                        </th>
                        <th className="py-2.5 px-3 font-semibold">ফি-এর বিবরণ</th>
                        <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                        <th className="py-2.5 px-3 font-semibold text-right">ধার্য টাকা</th>
                        <th className="py-2.5 px-3 font-semibold text-right">নগদ পরিশোধিত ও ছাড়</th>
                        <th className="py-2.5 px-3 font-semibold text-right text-rose-700">বকেয়া</th>
                        <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3 font-semibold text-right no-print">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentLedgerItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            এই শিক্ষার্থীর নামে কোনো ফি বা জরিমানার রেকর্ড নেই।
                          </td>
                        </tr>
                      ) : (
                        studentLedgerItems.map((item) => {
                          const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                            label: item.category,
                            color: "bg-slate-100 text-slate-800",
                          };
                          const isSelected = selectedLedgerFeeIds.includes(item.id);
                          const isPaid = item.status === "PAID";
                          const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/70"
                                  : isPaid
                                  ? "bg-slate-50/30 text-slate-500"
                                  : "hover:bg-slate-50/60"
                              }`}
                            >
                              <td className="py-2.5 px-3 no-print">
                                {!isPaid && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleLedgerFeeItem(item.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{item.title}</div>
                                {item.reference_note && (
                                  <div className="text-[10px] text-amber-800 font-medium mt-0.5 max-w-md">
                                    {item.reference_note}
                                  </div>
                                )}
                                {item.due_date && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    শেষ তারিখ: {item.due_date}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className={`text-[10px] py-0 px-2 font-normal ${catInfo.color}`}>
                                  {catInfo.label}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {bn(item.amount)} ৳
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="font-medium text-emerald-700">{bn(item.paid_amount)} ৳</div>
                                {itemDisc > 0 && (
                                  <div className="text-[10px] font-semibold text-amber-700">
                                    ছাড়: -{bn(itemDisc)} ৳
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                                {bn(item.due_amount)} ৳
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                    পরিশোধিত
                                  </Badge>
                                ) : item.due_amount < item.amount ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                    আংশিক পরিশোধিত
                                  </Badge>
                                ) : item.is_overdue ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                    বকেয়া
                                  </Badge>
                                ) : (
                                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">
                                    {item.type_label || "চলতি ফি"}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1 no-print">
                                {!isPaid && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedLedgerFeeIds([item.id]);
                                      setLedgerPayAmount(String(item.due_amount));
                                    }}
                                    className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    আদায়
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                  title="মুছে ফেলুন"
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

              {/* Direct Quick Payment Form right below the table (Hidden in Print) */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-indigo-50/40 shadow-xs no-print">
                <CardHeader className="p-4 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-emerald-700" />
                        এক ক্লিকে বকেয়া পরিশোধ ও মানি রিসিট গ্রহণ
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {selectedLedgerFeeIds.length > 0
                          ? `নির্বাচিত ${bn(selectedLedgerFeeIds.length)}টি ফি পরিশোধ করা হবে (মোট: ${bn(selectedFeesSum)} ৳)।`
                          : studentTotalDue > 0
                          ? `সকল বকেয়া একসাথে পরিশোধ করা হবে (সর্বমোট বকেয়া: ${bn(studentTotalDue)} ৳)।`
                          : "বর্তমানে এই শিক্ষার্থীর কোনো বকেয়া নেই। অতিরিক্ত জমা রাখতে চাইলে অগ্রিম বাটনে ক্লিক করুন।"}
                      </CardDescription>
                    </div>

                    {studentTotalDue > 0 && selectedLedgerFeeIds.length === 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAllStudentDues}
                        className="h-7 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      >
                        সব বকেয়া একসাথে সিলেক্ট করুন
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  {/* Auto-Calculation Banner for Discount */}
                  {((selectedLedgerFeeIds.length > 0 ? selectedFeesSum : studentTotalDue) > 0) && (
                    <div className="mb-3 p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                      <div className="flex flex-wrap items-center gap-2.5 text-slate-800">
                        <span className="font-semibold text-slate-700">
                          মোট ধার্য ফি: <strong>{bn(selectedLedgerFeeIds.length > 0 ? selectedFeesSum : studentTotalDue)} ৳</strong>
                        </span>
                        {Number(ledgerPayDiscount) > 0 && (
                          <>
                            <span className="text-amber-700 font-bold">
                              (-) বিশেষ ছাড়: {bn(Number(ledgerPayDiscount))} ৳
                            </span>
                            <span className="text-emerald-800 font-black">
                              (=) প্রদেয় নগদ: {bn(Math.max(0, (selectedLedgerFeeIds.length > 0 ? selectedFeesSum : studentTotalDue) - (Number(ledgerPayDiscount) || 0)))} ৳
                            </span>
                          </>
                        )}
                      </div>
                      {Number(ledgerPayDiscount) > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          ✓ ছাড় স্বয়ংক্রিয়ভাবে মোট ফি থেকে বিয়োগ হয়েছে
                        </span>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleLedgerPaymentSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          পরিশোধিত টাকা (৳) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={ledgerPayAmount}
                          onChange={(e) => setLedgerPayAmount(e.target.value)}
                          placeholder="টাকার পরিমাণ..."
                          className="h-9 text-xs bg-white mt-1 border-slate-300 font-bold text-emerald-800"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">বিশেষ ছাড় / Discount (৳)</Label>
                        <Input
                          type="number"
                          value={ledgerPayDiscount}
                          onChange={(e) => handleLedgerDiscountChange(e.target.value)}
                          placeholder="০"
                          className="h-9 text-xs bg-white mt-1 border-slate-300 font-semibold text-amber-800"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">পরিশোধ মাধ্যম</Label>
                        <Select value={ledgerPayMethod} onValueChange={setLedgerPayMethod}>
                          <SelectTrigger className="h-9 text-xs bg-white mt-1 border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">নগদ (CASH)</SelectItem>
                            <SelectItem value="BKASH">বিকাশ (bKash)</SelectItem>
                            <SelectItem value="NAGAD">নগদ (Nagad)</SelectItem>
                            <SelectItem value="ROCKET">রকেট (Rocket)</SelectItem>
                            <SelectItem value="BANK">ব্যাংক ট্রান্সফার</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">ট্রানজেকশন আইডি / রসিদ নোট</Label>
                        <Input
                          type="text"
                          value={ledgerPayTrxId}
                          onChange={(e) => setLedgerPayTrxId(e.target.value)}
                          placeholder="যেমন: TrxID বা মন্তব্য..."
                          className="h-9 text-xs bg-white mt-1 border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-100">
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>পেমেন্ট নিশ্চিত করলে সাথে সাথেই ডিজিটাল মানি রিসিট প্রস্তুত হবে এবং প্রিন্ট করা যাবে।</span>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmittingLedgerPay || !ledgerPayAmount || Number(ledgerPayAmount) <= 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shadow-xs"
                      >
                        {isSubmittingLedgerPay ? (
                          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Receipt className="mr-2 h-3.5 w-3.5" />
                        )}
                        টাকা গ্রহণ করুন ও মানি রিসিট তৈরি করুন
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Payment History & Money Receipts for this Student */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    এই শিক্ষার্থীর মানি রিসিট ও জমার ইতিহাস ({bn(studentLedgerPayments.length)}টি)
                  </CardTitle>
                </CardHeader>
                {/* Mobile Card View for Student Payments */}
                <div className="block sm:hidden divide-y divide-slate-100 no-print">
                  {studentLedgerPayments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      এই শিক্ষার্থীর নামে এখনও কোনো পেমেন্ট জমা হয়নি।
                    </div>
                  ) : (
                    studentLedgerPayments.map((p) => (
                      <div key={p.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-xs text-blue-700">{p.invoice_no}</span>
                            {p.receipt_note && (
                              <div className="text-[10px] font-medium text-amber-800 mt-0.5">{p.receipt_note}</div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {fmtDateBnFromUtc(p.payment_date)} • {p.collector_name || "অ্যাডমিন"}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200">
                            {paymentMethodLabelBn(p.payment_method)}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500">আদায়: </span>
                            <span className="font-bold text-emerald-700">{bn(p.amount_paid)} ৳</span>
                            {p.discount ? (
                              <span className="text-[10px] font-semibold text-amber-700 ml-1">(ছাড়: {bn(p.discount)} ৳)</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5">
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
                              রসিদ
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePayment(p)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                              title="পেমেন্ট বাতিল করুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop & Print Table View for Student Payments */}
                <div className="hidden sm:block print:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">রসিদ নম্বর ও বিবরণ</th>
                        <th className="py-2.5 px-3 font-semibold">তারিখ ও সময়</th>
                        <th className="py-2.5 px-3 font-semibold text-right">আদায়কৃত টাকা</th>
                        <th className="py-2.5 px-3 font-semibold text-right">বিশেষ ছাড়</th>
                        <th className="py-2.5 px-3 font-semibold">মাধ্যম</th>
                        <th className="py-2.5 px-3 font-semibold">গ্রহণকারী</th>
                        <th className="py-2.5 px-3 font-semibold text-right no-print">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentLedgerPayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            এই শিক্ষার্থীর নামে এখনও কোনো পেমেন্ট জমা হয়নি।
                          </td>
                        </tr>
                      ) : (
                        studentLedgerPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-blue-700">{p.invoice_no}</div>
                              {p.receipt_note && (
                                <div className="text-[10px] font-medium text-amber-800 mt-0.5 max-w-sm">
                                  {p.receipt_note}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {fmtDateBnFromUtc(p.payment_date)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {bn(p.amount_paid)} ৳
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                              {p.discount ? `${bn(p.discount)} ৳` : "—"}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-200">
                                {paymentMethodLabelBn(p.payment_method)}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {p.collector_name || "অ্যাডমিন"}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1 no-print">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReceipt(p);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="h-7 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                রসিদ দেখুন
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePayment(p)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                title="পেমেন্ট বাতিল করুন"
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

              {/* Official Signature Footer for Printed Ledger */}
              <div className="print-only pt-10 pb-2">
                <div className="flex justify-between items-end text-xs text-slate-800 px-4">
                  <div className="text-center border-t border-slate-500 pt-1 px-6">
                    শিক্ষার্থী / অভিভাবকের স্বাক্ষর
                  </div>
                  <div className="text-center border-t border-slate-500 pt-1 px-6">
                    হিসাবরক্ষক / ক্যাশিয়ারের স্বাক্ষর
                  </div>
                  <div className="text-center border-t border-slate-900 pt-1 px-6 font-bold">
                    পরিচালক / অধ্যক্ষের স্বাক্ষর
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 1: Fee Items Table */}
        <TabsContent value="items" className="m-0 space-y-4">
          {/* Previous Months Summary Banner */}
          {(stats.previousMonthsDue > 0 || filterMonth !== "all") && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/50 p-3.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    পূর্ববর্তী মাসসমূহের বকেয়া ও হিসাব বিবরণী
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    চলতি মাসের পূর্বের সকল অপরিশোধিত বকেয়া ও হিসাব এখানে সমন্বিত রয়েছে।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-amber-600 block">পূর্বের মোট বকেয়া</span>
                  <span className="text-sm font-extrabold text-amber-800">
                    {bn(stats.previousMonthsDue || 0)} ৳
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilterStatus("OVERDUE");
                  }}
                  className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100/60"
                >
                  বকেয়া তালিকা দেখুন
                </Button>
              </div>
            </div>
          )}

          {/* Filters Bar for Items Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
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

            {/* Month Filter */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <Calendar className="mr-1 h-3.5 w-3.5 text-blue-600 shrink-0" />
                <SelectValue placeholder="সকল মাস" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল মাস</SelectItem>
                {MONTHS_BN.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {name} {filterYear ? `(${bn(filterYear)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <SelectItem value="CURRENT">বর্তমান মাসের বেতন / চলতি ফি (সময় বাকি)</SelectItem>
                <SelectItem value="OVERDUE">মেয়াদোত্তীর্ণ বকেয়া (Overdue)</SelectItem>
                <SelectItem value="PARTIAL">আংশিক পরিশোধিত (PARTIAL)</SelectItem>
                <SelectItem value="PAID">পরিশোধিত (PAID)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card View for Fee Items */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">তথ্য লোড হচ্ছে...</div>
              ) : filteredItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">কোনো ফি রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                filteredItems.map((item) => {
                  const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                    label: item.category,
                    color: "bg-slate-100 text-slate-800",
                  };
                  return (
                    <div key={item.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StudentAvatar
                            photoKey={item.photo_key}
                            name={item.student_name}
                            roll={item.student_roll}
                            size="sm"
                            className="h-9 w-9 shrink-0 ring-1 ring-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">{item.student_name}</div>
                            <div className="text-[10px] text-slate-500">
                              রোল: {bn(item.student_roll)} • {classLabel(item.class_name)}
                              {item.batch_name ? ` • ${item.batch_name}` : ""}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[9px] py-0 px-1.5 shrink-0 ${catInfo.color}`}>
                          {catInfo.label}
                        </Badge>
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-800">{item.title}</div>
                        {item.reference_note && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.reference_note}</p>
                        )}
                        {item.due_date && (
                          <p className="text-[10px] text-slate-500 mt-0.5">শেষ তারিখ: {item.due_date}</p>
                        )}
                      </div>

                          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 text-center text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-400 block">ধার্য</span>
                              <span className="font-semibold text-slate-700">{bn(item.amount)} ৳</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">পরিশোধিত</span>
                              <span className="font-semibold text-emerald-600">{bn(item.paid_amount)} ৳</span>
                              {Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0)) > 0 && (
                                <span className="block text-[9px] font-bold text-amber-700">
                                  ছাড়: -{bn(Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0)))} ৳
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-rose-500 font-bold block">বকেয়া</span>
                              <span className="font-extrabold text-rose-700">{bn(item.due_amount)} ৳</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <div>
                              {item.status === "PAID" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                  পরিশোধিত
                                </Badge>
                              ) : item.status === "PARTIAL" ? (
                                item.is_overdue ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                    আংশিক বকেয়া
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                                    আংশিক
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
                            <div className="flex items-center gap-1.5">
                              {item.status !== "PAID" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPayForItem(item)}
                                  className="h-7 px-2.5 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <DollarSign className="h-3 w-3 mr-0.5" />
                                  গ্রহণ
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table View for Fee Items */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">শিক্ষার্থী</th>
                        <th className="py-2.5 px-3 font-semibold">শ্রেণি / ব্যাচ</th>
                        <th className="py-2.5 px-3 font-semibold">ফি-এর বিবরণ</th>
                        <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                        <th className="py-2.5 px-3 font-semibold text-right">ধার্য</th>
                        <th className="py-2.5 px-3 font-semibold text-right">পরিশোধিত ও ছাড়</th>
                        <th className="py-2.5 px-3 font-semibold text-right text-rose-700">বকেয়া / প্রদেয়</th>
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
                          const itemDisc = Math.max(0, (Number(item.amount) || 0) - (Number(item.paid_amount) || 0) - (Number(item.due_amount) || 0));
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar
                                    photoKey={item.photo_key}
                                    name={item.student_name}
                                    roll={item.student_roll}
                                    size="sm"
                                    className="h-8 w-8 shrink-0 ring-1 ring-slate-200"
                                  />
                                  <div>
                                    <div className="font-semibold text-slate-800">{item.student_name}</div>
                                    <div className="text-[10px] text-slate-400">রোল: {bn(item.student_roll)}</div>
                                  </div>
                                </div>
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
                                  <div className="text-[10px] text-amber-800 font-medium max-w-xs">
                                    {item.reference_note}
                                  </div>
                                )}
                                {item.due_date && (
                                  <div className="text-[10px] flex items-center gap-1 mt-0.5">
                                    <span className="text-slate-500">শেষ তারিখ: {item.due_date}</span>
                                    {item.status !== "PAID" && (
                                      item.is_overdue ? (
                                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                                          মেয়াদ শেষ
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-medium text-sky-700 bg-sky-50 px-1 rounded border border-sky-200">
                                          সময় বাকি
                                        </span>
                                      )
                                    )}
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
                                {item.status === "PAID" ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                                    পরিশোধিত
                                  </Badge>
                                ) : item.status === "PARTIAL" ? (
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
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card View for All Payments */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {payments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">কোনো পেমেন্ট রেকর্ড নেই।</div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar
                          photoKey={p.photo_key}
                          name={p.student_name}
                          roll={p.student_roll}
                          size="sm"
                          className="h-9 w-9 shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs text-blue-700">{p.invoice_no}</span>
                          <div className="font-bold text-xs text-slate-800 mt-0.5 truncate">{p.student_name}</div>
                          <div className="text-[10px] text-slate-400">
                            রোল: {bn(p.student_roll)} • {classLabel(p.class_name)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 shrink-0">
                        {paymentMethodLabelBn(p.payment_method)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <div>
                        <span className="text-[10px] text-slate-500">আদায়: </span>
                        <span className="font-bold text-emerald-700">{bn(p.amount_paid)} ৳</span>
                        {p.discount > 0 ? (
                          <span className="text-[10px] text-slate-400 ml-1">(ছাড়: {bn(p.discount)} ৳)</span>
                        ) : null}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {fmtDateBnFromUtc(p.payment_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
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
                          রসিদ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePayment(p)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="পেমেন্ট বাতিল / মুছে ফেলুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View for All Payments */}
            <div className="hidden sm:block overflow-x-auto">
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
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar
                              photoKey={p.photo_key}
                              name={p.student_name}
                              roll={p.student_roll}
                              size="sm"
                              className="h-8 w-8 shrink-0 ring-1 ring-slate-200"
                            />
                            <div>
                              <div className="font-semibold text-slate-800">{p.student_name}</div>
                              <div className="text-[10px] text-slate-400">রোল: {bn(p.student_roll)}</div>
                            </div>
                          </div>
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
                            {paymentMethodLabelBn(p.payment_method)}
                          </Badge>
                          {p.transaction_id && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              Trx: {p.transaction_id}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {fmtDateBnFromUtc(p.payment_date)}
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

      {/* 5. MODAL: Unified Fee Assignment (ALL students in class/batch OR Individual student) */}
      <Dialog open={isCustomFeeModalOpen} onOpenChange={setIsCustomFeeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              বেতন ও ফি নির্ধারণ (সকল বা আলাদা শিক্ষার্থী)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              শ্রেণি বা ব্যাচের সকল শিক্ষার্থীর জন্য একবারে কিংবা নির্দিষ্ট আলাদা শিক্ষার্থীর জন্য বেতন, পরীক্ষার ফি ও অন্যান্য ফি ধার্য করুন।
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher: ALL students vs Individual student */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFeeTarget("ALL")}
              className={`py-1.5 px-3 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                feeTarget === "ALL"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              সকল শিক্ষার্থী (শ্রেণি/ব্যাচ)
            </button>
            <button
              type="button"
              onClick={() => setFeeTarget("STUDENT")}
              className={`py-1.5 px-3 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                feeTarget === "STUDENT"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              আলাদা শিক্ষার্থী (একক)
            </button>
          </div>

          <form onSubmit={handleAssignFeeSubmit} className="space-y-3 py-1 text-xs">
            {/* Target Helper Notice */}
            {feeTarget === "ALL" ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5 text-indigo-900 flex items-start gap-2">
                <Users className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px]">
                  <span className="font-bold text-indigo-950">এক ক্লিকে সকল শিক্ষার্থীকে ধার্য: </span>
                  <span>
                    নির্ধারিত শ্রেণি বা ব্যাচের মোট <strong>{matchingStudentsCount}</strong> জন শিক্ষার্থীর হিসাবে এই ফি স্বয়ংক্রিয়ভাবে ধার্য হবে।
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-900 flex items-start gap-2">
                <User className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px]">
                  <span className="font-bold text-emerald-950">আলাদা শিক্ষার্থী নির্বাচন: </span>
                  <span>শুধুমাত্র নির্বাচিত শিক্ষার্থীর হিসাবে এই ফি বা জরিমানা যুক্ত হবে।</span>
                </div>
              </div>
            )}

            {/* Class & Batch filter */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">শ্রেণি নির্বাচন</Label>
                <Select
                  value={assignClassId}
                  onValueChange={(val) => {
                    setAssignClassId(val);
                    setAssignBatchId("all");
                    setAssignStudentId("");
                  }}
                >
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
                <Select
                  value={assignBatchId}
                  onValueChange={(val) => {
                    setAssignBatchId(val);
                    setAssignStudentId("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="সকল ব্যাচ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল ব্যাচ</SelectItem>
                    {batches
                      .filter((b) => assignClassId === "all" || String(b.class_id) === assignClassId)
                      .map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* If Single Student mode, show student select */}
            {feeTarget === "STUDENT" && (
              <div>
                <Label className="text-xs">নির্দিষ্ট শিক্ষার্থী নির্বাচন *</Label>
                <Select value={assignStudentId} onValueChange={setAssignStudentId}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {assignAvailableStudents.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name} (রোল: {bn(st.roll)}, {classLabel(st.class_name)}
                        {st.batch_name ? ` • ${st.batch_name}` : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignAvailableStudents.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    নির্বাচিত শ্রেণি বা ব্যাচে কোনো শিক্ষার্থী পাওয়া যায়নি।
                  </p>
                )}
              </div>
            )}

            {/* Category & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ফি-এর ক্যাটাগরি</Label>
                <Select
                  value={assignCategory}
                  onValueChange={(v) => {
                    const cat = v as FeeCategory;
                    setAssignCategory(cat);
                    setAssignTitle(getDefaultTitle(cat, assignMonth, assignYear));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY_FEE">মাসিক বেতন</SelectItem>
                    <SelectItem value="EXAM_FEE">পরীক্ষার ফি</SelectItem>
                    <SelectItem value="NOTE_MATERIAL">নোটস ও শিট বিক্রি</SelectItem>
                    <SelectItem value="ADMISSION_FEE">ভর্তি ও সেশন ফি</SelectItem>
                    <SelectItem value="OTHER_FINE">দেরিতে আসার / শৃঙ্খলা জরিমানা</SelectItem>
                    <SelectItem value="OTHER_FEE">বিবিধ ফি</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">টাকার পরিমাণ (৳) *</Label>
                <Input
                  type="number"
                  placeholder="যেমন: ৫০০"
                  value={assignAmount}
                  onChange={(e) => setAssignAmount(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>

            {/* Month & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">মাস</Label>
                <Select
                  value={assignMonth}
                  onValueChange={(val) => {
                    setAssignMonth(val);
                    setAssignTitle(getDefaultTitle(assignCategory, val, assignYear));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="মাস" />
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
                  value={assignYear}
                  onChange={(e) => {
                    setAssignYear(e.target.value);
                    setAssignTitle(getDefaultTitle(assignCategory, assignMonth, e.target.value));
                  }}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Due Date with Bengali Explanatory Notice */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">পরিশোধের শেষ তারিখ (Due Date)</Label>
                {assignDueDate && (
                  <button
                    type="button"
                    onClick={() => setAssignDueDate("")}
                    className="text-[10px] text-slate-400 hover:text-rose-500"
                  >
                    তারিখ মুছুন
                  </button>
                )}
              </div>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="h-8 text-xs mt-1"
              />
              <div className="mt-1 rounded border border-blue-100 bg-blue-50/70 p-1.5 text-[11px] text-blue-900 leading-tight">
                <span className="font-semibold text-blue-950">📌 নিয়ম: </span>
                পরিশোধের শেষ তারিখের আগে পর্যন্ত এটি শিক্ষার্থীর কাছে <strong>"বর্তমান মাসের বেতন"</strong> বা <strong>"চলতি ফি"</strong> হিসেবে থাকবে। শেষ তারিখ পার হলে তবেই এটি <strong>"বকেয়া"</strong>-তে যোগ হবে।
              </div>
            </div>

            {/* Title / Description */}
            <div>
              <Label className="text-xs">ফি-এর শিরোনাম / বিবরণ</Label>
              <Input
                placeholder="যেমন: মার্চ ২০২৫ — মাসিক বেতন বা প্রথম সাময়িক পরীক্ষার ফি"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Reference Note */}
            <div>
              <Label className="text-xs">রেফারেন্স বা মন্তব্য (ঐচ্ছিক)</Label>
              <Input
                placeholder="অতিরিক্ত কোনো নোট বা নির্দেশনা থাকলে লিখুন"
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
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
                disabled={isSubmittingAssign}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isSubmittingAssign
                  ? "ধার্য হচ্ছে..."
                  : feeTarget === "ALL"
                  ? `সকল শিক্ষার্থীকে ধার্য করুন (${matchingStudentsCount} জন)`
                  : "শিক্ষার্থীকে ফি ধার্য করুন"}
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

            {/* Cascading Class & Batch Filter for Student Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-600">শ্রেণি ফিল্টার</Label>
                <Select
                  value={payClassId}
                  onValueChange={(val) => {
                    setPayClassId(val);
                    setPayBatchId("all");
                    setPayStudentId("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
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
                <Label className="text-[11px] text-slate-600">ব্যাচ ফিল্টার</Label>
                <Select
                  value={payBatchId}
                  onValueChange={(val) => {
                    setPayBatchId(val);
                    setPayStudentId("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-0.5">
                    <SelectValue placeholder="সকল ব্যাচ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল ব্যাচ</SelectItem>
                    {batches
                      .filter((b) => payClassId === "all" || String(b.class_id) === payClassId)
                      .map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">শিক্ষার্থী নির্বাচন *</Label>
              <Select value={payStudentId} onValueChange={setPayStudentId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder={payAvailableStudents.length > 0 ? "শিক্ষার্থী নির্বাচন করুন..." : "কোনো শিক্ষার্থী পাওয়া যায়নি"} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {payAvailableStudents.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      রোল {bn(st.roll)} — {st.name} ({classLabel(st.class_name)}{st.batch_name ? ` • ${st.batch_name}` : ""})
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

            {paymentMode === "DUE" && Number(payDiscount) > 0 && (
              <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-slate-700">
                  মূল ফি থেকে <strong>{bn(Number(payDiscount))} ৳</strong> বিশেষ ছাড় বিয়োগ করে নগদ প্রদেয় নির্ধারণ করা হয়েছে।
                </span>
                <span className="font-bold text-emerald-800">
                  নিট প্রদেয়: {bn(payAmount || 0)} ৳
                </span>
              </div>
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
                    onChange={(e) => handleQuickPayDiscountChange(e.target.value)}
                    className="h-8 text-xs mt-1 font-semibold text-amber-800"
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
            <div className="space-y-4 print-area rounded-xl border border-slate-300 bg-white p-4" id="printable-receipt">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <h2 className="text-lg font-black text-slate-900">বিজ্ঞান পণ্ডিত একাডেমি</h2>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <p className="text-[11px] font-bold text-slate-700">অফিসিয়াল মানি রিসিট / পেমেন্ট স্লিপ (Money Receipt)</p>
                  {(selectedReceipt.is_advance || selectedReceipt.receipt_note?.includes("অগ্রিম")) && (
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
                  photoKey={selectedReceipt.photo_key}
                  name={selectedReceipt.student_name}
                  roll={selectedReceipt.student_roll}
                  size="md"
                  className="h-11 w-11 shrink-0 ring-2 ring-white shadow-xs no-print"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-900">{selectedReceipt.student_name}</div>
                  <div className="text-xs text-slate-700 font-medium">
                    রোল: {bn(selectedReceipt.student_roll)} • শ্রেণি: {classLabel(selectedReceipt.class_name)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-800 border border-slate-200 rounded-lg p-2.5">
                {selectedReceipt.advance_purpose && (
                  <div className="flex justify-between py-0.5 border-b border-dashed border-slate-200">
                    <span className="text-slate-600">জমার উদ্দেশ্য:</span>
                    <span className="font-semibold text-emerald-700">{selectedReceipt.advance_purpose}</span>
                  </div>
                )}
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
                {selectedReceipt.advance_surplus > 0 && (
                  <div className="flex justify-between text-indigo-700 bg-indigo-50/80 p-1 rounded text-[11px]">
                    <span>উদ্বৃত্ত অতিরিক্ত জমা হিসেবে সংরক্ষিত:</span>
                    <span className="font-bold">{bn(selectedReceipt.advance_surplus)} ৳</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end pt-8 text-[10px] text-slate-700">
                <div className="text-center border-t border-slate-400 pt-1 px-3">
                  শিক্ষার্থী / অভিভাবকের স্বাক্ষর
                </div>
                <div className="text-center border-t border-slate-800 pt-1 px-3 font-semibold">
                  আদায়কারীর স্বাক্ষর ({selectedReceipt.collector_name || "অ্যাডমিন"})
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

      {/* 8. MODAL: Summary Card Detailed Breakdown (Overdue, Current, Previous Months, Paid) */}
      <Dialog open={cardDetailType !== null} onOpenChange={(o) => !o && setCardDetailType(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader
            className={`p-4 sm:p-5 text-white ${
              cardDetailType === "OVERDUE"
                ? "bg-gradient-to-r from-rose-700 to-rose-800"
                : cardDetailType === "CURRENT"
                ? "bg-gradient-to-r from-sky-700 to-blue-800"
                : cardDetailType === "PREVIOUS"
                ? "bg-gradient-to-r from-amber-700 to-orange-800"
                : "bg-gradient-to-r from-emerald-700 to-teal-800"
            }`}
          >
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {cardDetailType === "OVERDUE" && (
                <>
                  <AlertCircle className="h-5 w-5 text-rose-200" />
                  মেয়াদোত্তীর্ণ বকেয়া তালিকা ({bn(stats.overdueDue || 0)} ৳)
                </>
              )}
              {cardDetailType === "CURRENT" && (
                <>
                  <Calendar className="h-5 w-5 text-sky-200" />
                  চলতি মাসের প্রদেয় বেতন ও ফি ({bn(stats.currentMonthDue || 0)} ৳)
                </>
              )}
              {cardDetailType === "PREVIOUS" && (
                <>
                  <Clock className="h-5 w-5 text-amber-200" />
                  পূর্বের মাসের অপরিশোধিত বকেয়া ({bn(stats.previousMonthsDue || 0)} ৳)
                </>
              )}
              {cardDetailType === "PAID" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  সর্বমোট আদায়কৃত পেমেন্ট ও রসিদ তালিকা ({bn(stats.totalPaid || 0)} ৳)
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/90 text-xs">
              {cardDetailType === "OVERDUE" &&
                `নির্ধারিত জমার শেষ তারিখ পার হয়ে যাওয়া ${bn(stats.defaultersCount || 0)} জন শিক্ষার্থীর বিস্তারিত বকেয়া হিসাব`}
              {cardDetailType === "CURRENT" &&
                `জমার শেষ তারিখ এখনো বাকি আছে এমন ${bn(stats.currentDueStudentsCount || 0)} জন শিক্ষার্থীর চলতি ফি হিসাব`}
              {cardDetailType === "PREVIOUS" &&
                "চলতি মাসের পূর্ববর্তী মাসগুলোর অপরিশোধিত সকল বকেয়া ও ফি-এর বিস্তারিত তালিকা"}
              {cardDetailType === "PAID" &&
                `এ পর্যন্ত যারা পেমেন্ট দিয়েছে তাদের বিস্তারিত তালিকা ও মানি রিসিট (${bn(payments.length)}টি পেমেন্ট রেকর্ড)`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 max-h-[62vh] overflow-y-auto space-y-3">
            {cardDetailType === "PAID" ? (
              payments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  এখনো কোনো পেমেন্ট আদায় হয়নি।
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <StudentAvatar
                          photoKey={p.photo_key}
                          name={p.student_name}
                          roll={p.student_roll}
                          size="sm"
                          className="h-9 w-9 shrink-0 ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{p.student_name}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              রোল: {bn(p.student_roll)}
                            </Badge>
                            <span className="text-[10px] text-slate-500">{classLabel(p.class_name)}</span>
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-blue-700 mt-0.5">
                            রসিদ: {p.invoice_no} • {fmtDateBnFromUtc(p.payment_date)}
                          </div>
                          {p.receipt_note && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{p.receipt_note}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-black text-emerald-700">{bn(p.amount_paid)} ৳</div>
                          {p.discount > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700">ছাড়: {bn(p.discount)} ৳</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCardDetailType(null);
                              setSelectedReceipt(p);
                              setIsReceiptModalOpen(true);
                            }}
                            className="h-7 px-2.5 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            রসিদ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCardDetailType(null);
                              setActiveTab("student_account");
                              setLedgerClassId("all");
                              setLedgerBatchId("all");
                              setLedgerStudentId(String(p.student_id));
                            }}
                            className="h-7 px-2 text-[11px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            লেজার
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              (() => {
                const curYear = currentYearDhaka();
                const curMonth = currentMonthDhaka();
                const detailItems = items.filter((it) => {
                  if (it.status === "PAID" || (Number(it.due_amount) || 0) <= 0) return false;
                  if (cardDetailType === "OVERDUE") return !!it.is_overdue;
                  if (cardDetailType === "CURRENT") return !it.is_overdue;
                  if (cardDetailType === "PREVIOUS") {
                    const isPast =
                      (it.year && Number(it.year) < curYear) ||
                      (it.year && Number(it.year) === curYear && it.month && Number(it.month) < curMonth) ||
                      !!it.is_overdue;
                    return isPast;
                  }
                  return true;
                });

                if (detailItems.length === 0) {
                  return (
                    <div className="py-10 text-center text-xs text-slate-400">
                      এই ক্যাটাগরিতে কোনো অপরিশোধিত হিসাব পাওয়া যায়নি।
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {detailItems.map((item) => {
                      const catInfo = FEE_CATEGORY_LABELS[item.category as FeeCategory] || {
                        label: item.category,
                        color: "bg-slate-100 text-slate-800",
                      };
                      return (
                        <div
                          key={item.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <StudentAvatar
                              photoKey={item.photo_key}
                              name={item.student_name}
                              roll={item.student_roll}
                              size="sm"
                              className="h-9 w-9 shrink-0 ring-1 ring-slate-200"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">{item.student_name}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  রোল: {bn(item.student_roll)}
                                </Badge>
                                <span className="text-[10px] text-slate-500">
                                  {classLabel(item.class_name)}
                                  {item.batch_name ? ` • ${item.batch_name}` : ""}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-semibold text-slate-800">{item.title}</span>
                                <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${catInfo.color}`}>
                                  {catInfo.label}
                                </Badge>
                              </div>
                              {item.due_date && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  শেষ তারিখ: {item.due_date}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <div className="text-sm font-black text-rose-700">{bn(item.due_amount)} ৳</div>
                              <div className="text-[10px] text-slate-400">
                                ধার্য: {bn(item.amount)} ৳
                                {item.paid_amount > 0 ? ` • জমা: ${bn(item.paid_amount)} ৳` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCardDetailType(null);
                                  openPayForItem(item);
                                }}
                                className="h-7 px-2.5 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold"
                              >
                                আদায়
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCardDetailType(null);
                                  setActiveTab("student_account");
                                  setLedgerClassId("all");
                                  setLedgerBatchId("all");
                                  setLedgerStudentId(String(item.student_id));
                                }}
                                className="h-7 px-2 text-[11px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                একক লেজার
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>

          <DialogFooter className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (cardDetailType === "PAID") {
                  setActiveTab("payments");
                } else if (cardDetailType === "OVERDUE" || cardDetailType === "PREVIOUS") {
                  setActiveTab("items");
                  setFilterStatus("OVERDUE");
                } else if (cardDetailType === "CURRENT") {
                  setActiveTab("items");
                  setFilterStatus("CURRENT");
                }
                setCardDetailType(null);
              }}
              className="text-xs border-slate-300 text-slate-700"
            >
              মূল তালিকায় ফিল্টার করে দেখুন
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setCardDetailType(null)}
              className="text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
