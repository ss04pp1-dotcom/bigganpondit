"use client";

// Class & Batch Manager — শ্রেণি ও ব্যাচ ব্যবস্থাপনা
// UI text is Bengali; allows creating/editing classes and creating batches by batch name.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Users,
  BookOpen,
  CalendarDays,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  DoorOpen,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { classLabel, bn, DIVISIONS } from "@/lib/constants";
import type { ClassRow, BatchRow } from "@/lib/db/types";

interface EnrolledStudent {
  id: number;
  name: string;
  roll: number;
  division: string | null;
  section: string | null;
  phone: string | null;
  photo_key: string | null;
  guardian_name: string | null;
  username: string;
}

export function ClassBatchManager({ role = "ADMIN" }: { role?: "ADMIN" | "DIRECTOR" }) {
  const isReadOnly = role === "DIRECTOR";
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"CLASSES" | "BATCHES">("CLASSES");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state for batches
  const [batchClassFilter, setBatchClassFilter] = useState<string>("ALL");
  const [batchSearch, setBatchSearch] = useState<string>("");

  // Modals state
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classSortOrderInput, setClassSortOrderInput] = useState<number | string>("");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | null>(null);
  const [batchForm, setBatchForm] = useState({
    name: "",
    classId: "",
    division: "NONE",
    timeSlot: "",
    days: "",
    roomNo: "",
    maxStudents: "0",
    isActive: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "CLASS" | "BATCH";
    id: number;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Enrolled students viewer modal
  const [viewingBatch, setViewingBatch] = useState<BatchRow | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  // Load Classes and Batches
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, bRes] = await Promise.all([
        fetch("/api/classes").then((r) => r.json()).catch(() => null),
        fetch("/api/batches").then((r) => r.json()).catch(() => null),
      ]);

      if (clsRes?.ok && Array.isArray(clsRes.classes)) {
        setClasses(clsRes.classes);
      }
      if (bRes?.ok && Array.isArray(bRes.batches)) {
        setBatches(bRes.batches);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall Statistics
  const totalStudents = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
  }, [classes]);

  const totalBatches = batches.length;

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (batchClassFilter !== "ALL" && String(b.class_id) !== batchClassFilter) {
        return false;
      }
      if (batchSearch.trim()) {
        const q = batchSearch.toLowerCase().trim();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesClass = (b.class_name || "").toLowerCase().includes(q);
        const matchesTime = (b.time_slot || "").toLowerCase().includes(q);
        const matchesDays = (b.days || "").toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesTime && !matchesDays) return false;
      }
      return true;
    });
  }, [batches, batchClassFilter, batchSearch]);

  // Handle Open Class Modal
  function handleOpenClassModal(cls?: ClassRow) {
    if (cls) {
      setEditingClass(cls);
      setClassNameInput(cls.name);
      setClassSortOrderInput(cls.sort_order);
    } else {
      setEditingClass(null);
      setClassNameInput("");
      const nextSort = classes.length > 0 ? Math.max(...classes.map((c) => c.sort_order)) + 1 : 1;
      setClassSortOrderInput(nextSort);
    }
    setClassModalOpen(true);
  }

  // Save Class
  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    const name = classNameInput.trim();
    if (!name) {
      toast({ title: "শ্রেণির নাম লিখুন।", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const sortOrder = Number(classSortOrderInput) || 0;
      const url = editingClass ? `/api/classes/${editingClass.id}` : "/api/classes";
      const method = editingClass ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sortOrder }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast({ title: data.error || "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      toast({ title: data.message || "শ্রেণি সফলভাবে সংরক্ষিত হয়েছে।" });
      setClassModalOpen(false);
      await loadData();
    } catch {
      toast({ title: "সার্ভার এরর, আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Open Batch Modal
  function handleOpenBatchModal(b?: BatchRow, prefillClassId?: number) {
    if (b) {
      setEditingBatch(b);
      setBatchForm({
        name: b.name,
        classId: String(b.class_id),
        division: b.division || "NONE",
        timeSlot: b.time_slot || "",
        days: b.days || "",
        roomNo: b.room_no || "",
        maxStudents: String(b.max_students || 0),
        isActive: b.is_active === 1,
      });
    } else {
      setEditingBatch(null);
      setBatchForm({
        name: "",
        classId: prefillClassId ? String(prefillClassId) : (classes[0]?.id ? String(classes[0].id) : ""),
        division: "NONE",
        timeSlot: "",
        days: "",
        roomNo: "",
        maxStudents: "0",
        isActive: true,
      });
    }
    setBatchModalOpen(true);
  }

  // Save Batch
  async function handleSaveBatch(e: React.FormEvent) {
    e.preventDefault();
    const name = batchForm.name.trim();
    if (!name) {
      toast({ title: "ব্যাচের নাম লিখুন।", variant: "destructive" });
      return;
    }
    const classIdNum = Number(batchForm.classId);
    if (!classIdNum || classIdNum <= 0) {
      toast({ title: "শ্রেণি নির্বাচন করুন।", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingBatch ? `/api/batches/${editingBatch.id}` : "/api/batches";
      const method = editingBatch ? "PATCH" : "POST";

      const payload = {
        name,
        classId: classIdNum,
        division: batchForm.division === "NONE" ? null : batchForm.division,
        timeSlot: batchForm.timeSlot.trim() || null,
        days: batchForm.days.trim() || null,
        roomNo: batchForm.roomNo.trim() || null,
        maxStudents: Number(batchForm.maxStudents) || 0,
        isActive: batchForm.isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast({ title: data.error || "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      toast({ title: data.message || "ব্যাচ সফলভাবে সংরক্ষিত হয়েছে।" });
      setBatchModalOpen(false);
      await loadData();
    } catch {
      toast({ title: "সার্ভার এরর, আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete Confirmed
  async function handleExecuteDelete() {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const url =
        deleteConfirm.type === "CLASS"
          ? `/api/classes/${deleteConfirm.id}`
          : `/api/batches/${deleteConfirm.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast({ title: data.error || "মুছে ফেলা যায়নি।", variant: "destructive" });
        return;
      }

      toast({ title: data.message || "সফলভাবে মুছে ফেলা হয়েছে।" });
      setDeleteConfirm(null);
      await loadData();
    } catch {
      toast({ title: "সার্ভার এরর, আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Load students for a batch viewer modal
  async function handleViewBatchStudents(b: BatchRow) {
    setViewingBatch(b);
    setLoadingEnrolled(true);
    try {
      const res = await fetch(`/api/batches/${b.id}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.students)) {
        setEnrolledStudents(json.students);
      } else {
        setEnrolledStudents([]);
      }
    } catch {
      setEnrolledStudents([]);
    } finally {
      setLoadingEnrolled(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border/60 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">মোট শ্রেণি</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{bn(classes.length)} টি</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">অ্যাকাডেমির সকল সচল শ্রেণি</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">মোট ব্যাচ</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{bn(totalBatches)} টি</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">বিভিন্ন শিফট ও সময়সূচী</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CalendarDays className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">মোট শিক্ষার্থী</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{bn(totalStudents)} জন</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">শ্রেণিসমূহে নিবন্ধিত</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmented Tab Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("CLASSES")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === "CLASSES"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>শ্রেণি ব্যবস্থাপনা ({bn(classes.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BATCHES")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === "BATCHES"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>ব্যাচ ব্যবস্থাপনা ({bn(batches.length)})</span>
          </button>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            {activeTab === "CLASSES" ? (
              <Button
                onClick={() => handleOpenClassModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl h-10 px-4 gap-1.5 w-full sm:w-auto shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন শ্রেণি যুক্ত করুন</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleOpenBatchModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl h-10 px-4 gap-1.5 w-full sm:w-auto shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন ব্যাচ যুক্ত করুন</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">তথ্য লোড হচ্ছে...</p>
        </div>
      ) : activeTab === "CLASSES" ? (
        /* TAB 1: CLASSES MANAGEMENT */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">সকল শ্রেণির তালিকা</h2>
              <p className="text-xs text-slate-500">এখানে অ্যাকাডেমির প্রতিটি শ্রেণি দেখতে, নতুন শ্রেণি যোগ বা এডিট করতে পারবেন।</p>
            </div>
          </div>

          {classes.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-slate-50/50">
              <p className="text-slate-500 text-sm">কোনো শ্রেণি পাওয়া যায়নি।</p>
              {!isReadOnly && (
                <Button
                  onClick={() => handleOpenClassModal()}
                  variant="outline"
                  className="mt-3 text-xs"
                >
                  প্রথম শ্রেণি যুক্ত করুন
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const classBatches = batches.filter((b) => b.class_id === cls.id);
                return (
                  <Card
                    key={cls.id}
                    className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-base">
                            {cls.name}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              {classLabel(cls.name)}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              ক্রম নম্বর: {bn(cls.sort_order)}
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenClassModal(cls)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 rounded-lg"
                              title="এডিট"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "CLASS",
                                  id: cls.id,
                                  name: classLabel(cls.name),
                                })
                              }
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Stat chips */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <p className="text-[10px] text-slate-400 font-medium">শিক্ষার্থী</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">
                            {bn(cls.student_count || 0)}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <p className="text-[10px] text-slate-400 font-medium">ব্যাচ</p>
                          <p className="text-sm font-bold text-indigo-700 mt-0.5">
                            {bn(classBatches.length)}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl">
                          <p className="text-[10px] text-slate-400 font-medium">বিষয়</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">
                            {bn(cls.subject_count || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Batches Preview */}
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                          <span>সংযুক্ত ব্যাচসমূহ:</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {classBatches.length > 0 ? `${bn(classBatches.length)} টি ব্যাচ` : "কোনো ব্যাচ নেই"}
                          </span>
                        </p>
                        {classBatches.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {classBatches.slice(0, 3).map((b) => (
                              <Badge
                                key={b.id}
                                variant="outline"
                                className="bg-indigo-50/70 border-indigo-200 text-indigo-700 text-[11px] font-normal py-0.5 px-2"
                              >
                                {b.name}
                              </Badge>
                            ))}
                            {classBatches.length > 3 && (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-600 text-[11px] py-0.5 px-2"
                              >
                                +{bn(classBatches.length - 3)} টি
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            এই শ্রেণিতে এখনও কোনো ব্যাচ তৈরি করা হয়নি।
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBatchClassFilter(String(cls.id));
                          setActiveTab("BATCHES");
                        }}
                        className="text-xs h-8 text-slate-700 bg-white hover:bg-slate-50 rounded-lg flex-1"
                      >
                        ব্যাচসমূহ দেখুন
                      </Button>
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenBatchModal(undefined, cls.id)}
                          className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>ব্যাচ যোগ</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: BATCHES MANAGEMENT */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="ব্যাচের নাম, সময় বা দিন দিয়ে খুঁজুন..."
                  className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50 rounded-xl"
                />
              </div>

              <div className="w-full sm:w-[220px]">
                <Select value={batchClassFilter} onValueChange={setBatchClassFilter}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50/50">
                    <SelectValue placeholder="শ্রেণি নির্বাচন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">সকল শ্রেণি</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {classLabel(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-slate-500 whitespace-nowrap self-end sm:self-center">
              মোট: <span className="font-semibold text-slate-800">{bn(filteredBatches.length)}</span> টি ব্যাচ
            </p>
          </div>

          {filteredBatches.length === 0 ? (
            <Card className="border-dashed p-10 text-center bg-slate-50/50">
              <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-medium text-sm">কোনো ব্যাচ পাওয়া যায়নি।</p>
              <p className="text-slate-400 text-xs mt-1">
                {batchSearch || batchClassFilter !== "ALL"
                  ? "ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।"
                  : "নতুন ব্যাচ তৈরি করতে উপরের বাটনে ক্লিক করুন।"}
              </p>
              {!isReadOnly && (
                <Button
                  onClick={() => handleOpenBatchModal()}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  নতুন ব্যাচ তৈরি করুন
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map((b) => (
                <Card
                  key={b.id}
                  className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">
                            {b.name}
                          </h3>
                          {b.is_active === 1 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0">
                              সক্রিয়
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-normal py-0">
                              নিষ্ক্রিয়
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                          <span>{classLabel(b.class_name || "")}</span>
                          {b.division && <span>• {b.division === "SCIENCE" ? "বিজ্ঞান" : "মানবিক"}</span>}
                        </p>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenBatchModal(b)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg"
                            title="এডিট"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({
                                type: "BATCH",
                                id: b.id,
                                name: `${b.name} (${classLabel(b.class_name || "")})`,
                              })
                            }
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 rounded-lg"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Schedule & Room info */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">
                          {b.time_slot || "সময়সূচী নির্ধারিত নয়"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate">{b.days || "প্রতিদিন / সাধারণ"}</span>
                      </div>
                      {b.room_no && (
                        <div className="flex items-center gap-2">
                          <DoorOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-600">রুম নম্বর: {b.room_no}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity badge */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500">ভর্তি শিক্ষার্থী:</span>
                        <span className="font-bold text-slate-800">{bn(b.student_count || 0)} জন</span>
                      </div>
                      {b.max_students && b.max_students > 0 ? (
                        <span className="text-[11px] text-slate-400">
                          আসন: {bn(b.student_count || 0)} / {bn(b.max_students)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBatchStudents(b)}
                      className="text-xs h-8 text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50/70 rounded-lg flex-1 gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>শিক্ষার্থীদের তালিকা দেখুন ({bn(b.student_count || 0)})</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CLASS */}
      <Dialog open={classModalOpen} onOpenChange={setClassModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>{editingClass ? "শ্রেণি সম্পাদনা করুন" : "নতুন শ্রেণি যুক্ত করুন"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              শ্রেণির নাম (যেমন ৬ষ্ঠ, ৭ম, ৮ম, ৯ম, ১০ম, একাদশ, দ্বাদশ বা সংখ্যা ৬, ৭, ৮ ইত্যাদি) এবং সাজানোর ক্রম নির্ধারণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClass} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                শ্রেণির নাম <span className="text-red-500">*</span>
              </Label>
              <Input
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
                placeholder="যেমন: ৬ষ্ঠ, ৭ম, ১০ম, একাদশ, দ্বাদশ ইত্যাদি"
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                সাজানোর ক্রম / Sort Order
              </Label>
              <Input
                type="number"
                value={classSortOrderInput}
                onChange={(e) => setClassSortOrderInput(e.target.value)}
                placeholder="সংখ্যা (যেমন: ৬, ৭, ৮, ৯, ১০, ১১, ১২)"
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                বড় সংখ্যার শ্রেণিগুলো তালিকার উপরে প্রদর্শিত হবে।
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClassModalOpen(false)}
                className="rounded-xl h-10 text-xs"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl h-10 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingClass ? "আপডেট করুন" : "যুক্ত করুন"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD / EDIT BATCH */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              <span>{editingBatch ? "ব্যাচ সম্পাদনা করুন" : "ব্যাচের নাম দিয়ে ব্যাচ যুক্ত করুন"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ব্যাচের নাম, শ্রেণি, সময়সূচী ও অন্যান্য তথ্য পূরণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBatch} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                ব্যাচের নাম <span className="text-red-500">*</span>
              </Label>
              <Input
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                placeholder="যেমন: সকাল ব্যাচ, সন্ধ্যা ব্যাচ, ব্যাচ-১, স্পেশাল ব্যাচ ইত্যাদি"
                className="h-11 rounded-xl font-medium"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  শ্রেণি <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={batchForm.classId}
                  onValueChange={(v) => setBatchForm({ ...batchForm, classId: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="শ্রেণি নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {classLabel(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  বিভাগ (ঐচ্ছিক)
                </Label>
                <Select
                  value={batchForm.division}
                  onValueChange={(v) => setBatchForm({ ...batchForm, division: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">সকল / প্রযোজ্য নয়</SelectItem>
                    {DIVISIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  সময়সূচী (টাইম স্লট)
                </Label>
                <Input
                  value={batchForm.timeSlot}
                  onChange={(e) => setBatchForm({ ...batchForm, timeSlot: e.target.value })}
                  placeholder="যেমন: সকাল ৮:০০ - ৯:৩০"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  সপ্তাহের দিনসমূহ
                </Label>
                <Input
                  value={batchForm.days}
                  onChange={(e) => setBatchForm({ ...batchForm, days: e.target.value })}
                  placeholder="যেমন: শনি, সোম, বুধ"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  রুম নম্বর (ঐচ্ছিক)
                </Label>
                <Input
                  value={batchForm.roomNo}
                  onChange={(e) => setBatchForm({ ...batchForm, roomNo: e.target.value })}
                  placeholder="যেমন: ১০২ বা ল্যাব-১"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  সর্বোচ্চ আসন সংখ্যা (০ = সীমাহীন)
                </Label>
                <Input
                  type="number"
                  value={batchForm.maxStudents}
                  onChange={(e) => setBatchForm({ ...batchForm, maxStudents: e.target.value })}
                  placeholder="যেমন: ২৫"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="batchActiveToggle"
                checked={batchForm.isActive}
                onChange={(e) => setBatchForm({ ...batchForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="batchActiveToggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                ব্যাচটি বর্তমানে সক্রিয় রয়েছে
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchModalOpen(false)}
                className="rounded-xl h-10 text-xs"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl h-10 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingBatch ? "আপডেট করুন" : "যুক্ত করুন"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VIEW ENROLLED STUDENTS IN BATCH */}
      <Dialog open={!!viewingBatch} onOpenChange={(open) => !open && setViewingBatch(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <DialogTitle className="text-lg font-bold">
                  {viewingBatch?.name} — শিক্ষার্থীদের তালিকা
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  {classLabel(viewingBatch?.class_name || "")} • {bn(enrolledStudents.length)} জন নিবন্ধিত
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {loadingEnrolled ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-400">শিক্ষার্থীদের তথ্য লোড হচ্ছে...</p>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                এই ব্যাচে এখনো কোনো শিক্ষার্থীকে যুক্ত করা হয়নি।
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto app-scroll">
                {enrolledStudents.map((st) => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {bn(st.roll)}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">{st.name}</p>
                        <p className="text-[11px] text-slate-400">
                          রোল: {bn(st.roll)} {st.section ? `• শাখা ${st.section}` : ""} {st.phone ? `• ${st.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    {st.guardian_name && (
                      <p className="text-[11px] text-slate-500 hidden sm:block">
                        অভিভাবক: {st.guardian_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingBatch(null)}
              className="rounded-xl h-10 text-xs w-full sm:w-auto"
            >
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              আপনি কি নিশ্চিত?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              {deleteConfirm?.type === "CLASS"
                ? `আপনি '${deleteConfirm?.name}' শ্রেণি মুছে ফেলতে যাচ্ছেন। যদি এই শ্রেণিতে কোনো শিক্ষার্থী থাকে তবে প্রথমে তাদের স্থানান্তর করতে হবে।`
                : `আপনি '${deleteConfirm?.name}' ব্যাচটি মুছে ফেলতে যাচ্ছেন। এর ফলে ব্যাচের শিক্ষার্থীরা ব্যাচহীন অবস্থায় থাকবে।`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel
              disabled={submitting}
              className="rounded-xl h-10 text-xs"
            >
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDelete}
              disabled={submitting}
              className="rounded-xl h-10 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "হ্যাঁ, মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
