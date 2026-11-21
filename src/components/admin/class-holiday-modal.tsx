"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarOff,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  CalendarDays,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CLASS_NUMBERS,
  bn,
  classLabel,
  todayISODateDhaka,
} from "@/lib/constants";
import {
  ClassHoliday,
  addDaysToIsoDate,
  formatBanglaDateRange,
  formatHolidayTargetBn,
  isDateInRange,
} from "@/lib/holiday-utils";

const REASON_PRESETS = [
  "বিশেষ ছুটি",
  "বৃষ্টির কারণে ছুটি",
  "সরকারি ছুটি",
  "পরীক্ষার প্রস্তুতি ছুটি",
  "ঈদের ছুটি",
  "অনিবার্য কারণবশত ছুটি",
];

interface ClassHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  classesList: Array<{ id: number; name: string; is_active?: number }>;
  batches: Array<{
    id: number;
    name: string;
    class_id: number;
    class_name: string;
    division: string | null;
    time_slot: string | null;
    is_active?: number;
  }>;
  onChanged?: () => void;
}

export function ClassHolidayModal({
  isOpen,
  onClose,
  classesList,
  batches,
  onChanged,
}: ClassHolidayModalProps) {
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<ClassHoliday[]>([]);
  const [todayDate, setTodayDate] = useState<string>(todayISODateDhaka());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAllClasses, setIsAllClasses] = useState<boolean>(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [division, setDivision] = useState<string>("ALL");
  const [batchId, setBatchId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(todayISODateDhaka());
  const [endDate, setEndDate] = useState<string>(todayISODateDhaka());
  const [reason, setReason] = useState<string>("");

  const availableClassNames = useMemo(() => {
    if (classesList.length > 0) {
      return classesList
        .filter((c) => c.is_active !== 0)
        .map((c) => c.name);
    }
    return [...CLASS_NUMBERS];
  }, [classesList]);

  const singleSelectedClass =
    !isAllClasses && selectedClasses.length === 1 ? selectedClasses[0] : null;

  const availableBatchesForClass = useMemo(() => {
    if (!singleSelectedClass) return [];
    return batches.filter(
      (b) => b.class_name === singleSelectedClass && b.is_active !== 0
    );
  }, [batches, singleSelectedClass]);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/holidays");
      const json = await res.json().catch(() => null);
      if (json?.ok) {
        setHolidays(json.holidays || []);
        if (json.todayDate) {
          setTodayDate(json.todayDate);
        }
      }
    } catch {
      toast({ title: "ছুটির তালিকা লোড করা যায়নি", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHolidays();
    }
  }, [isOpen]);

  const resetForm = (baseDate?: string) => {
    const d = baseDate || todayDate || todayISODateDhaka();
    setEditingId(null);
    setIsAllClasses(false);
    setSelectedClasses([]);
    setDivision("ALL");
    setBatchId("all");
    setStartDate(d);
    setEndDate(d);
    setReason("");
  };

  const toggleClass = (cls: string) => {
    setIsAllClasses(false);
    if (editingId) {
      setSelectedClasses([cls]);
      setBatchId("all");
      return;
    }
    setSelectedClasses((prev) => {
      const next = prev.includes(cls)
        ? prev.filter((c) => c !== cls)
        : [...prev, cls];
      if (next.length !== 1) {
        setDivision("ALL");
        setBatchId("all");
      }
      return next;
    });
  };

  const startEdit = (h: ClassHoliday) => {
    setEditingId(h.id);
    if (h.class_name.toUpperCase() === "ALL") {
      setIsAllClasses(true);
      setSelectedClasses([]);
    } else {
      setIsAllClasses(false);
      setSelectedClasses([h.class_name]);
    }
    setDivision(h.division || "ALL");
    setBatchId(h.batch_id ? String(h.batch_id) : "all");
    setStartDate(h.start_date);
    setEndDate(h.end_date);
    setReason(h.reason);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllClasses && selectedClasses.length === 0) {
      toast({
        title: "শ্রেণি নির্বাচন করুন",
        description: "অন্তত একটি শ্রেণি অথবা 'সকল শ্রেণি' নির্বাচন করুন।",
        variant: "destructive",
      });
      return;
    }
    if (!reason.trim()) {
      toast({
        title: "ছুটির কারণ লিখুন",
        description: "যেমন: বৃষ্টির কারণে ছুটি, বিশেষ ছুটি ইত্যাদি।",
        variant: "destructive",
      });
      return;
    }
    if (endDate < startDate) {
      toast({
        title: "তারিখ সঠিক নয়",
        description: "শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const url = "/api/holidays";
      const method = editingId ? "PUT" : "POST";
      const payload = editingId
        ? {
            id: editingId,
            className: isAllClasses ? "ALL" : selectedClasses[0],
            division:
              !isAllClasses && selectedClasses.length === 1 && division !== "ALL"
                ? division
                : null,
            batchId:
              !isAllClasses && selectedClasses.length === 1 && batchId !== "all"
                ? Number(batchId)
                : null,
            startDate,
            endDate,
            reason: reason.trim(),
          }
        : {
            classNames: isAllClasses ? ["ALL"] : selectedClasses,
            division:
              !isAllClasses && selectedClasses.length === 1 && division !== "ALL"
                ? division
                : null,
            batchId:
              !isAllClasses && selectedClasses.length === 1 && batchId !== "all"
                ? Number(batchId)
                : null,
            startDate,
            endDate,
            reason: reason.trim(),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) {
        toast({
          title: editingId ? "ছুটির তথ্য হালনাগাদ হয়েছে" : "ছুটি ঘোষণা করা হয়েছে",
          description: "সংশ্লিষ্ট শ্রেণির শিক্ষার্থীরা রুটিনে গেলেই ছুটি দেখতে পাবে।",
        });
        resetForm();
        await loadHolidays();
        if (onChanged) onChanged();
      } else {
        toast({
          title: "সংরক্ষণ ব্যর্থ হয়েছে",
          description: json?.error || "আবার চেষ্টা করুন।",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "নেটওয়ার্ক ত্রুটি হয়েছে", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (json?.ok) {
        toast({ title: "ছুটি বাতিল করা হয়েছে" });
        if (editingId === id) resetForm();
        await loadHolidays();
        if (onChanged) onChanged();
      } else {
        toast({
          title: "বাতিল করা যায়নি",
          description: json?.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "নেটওয়ার্ক ত্রুটি হয়েছে", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const baseTodayDate = todayDate || todayISODateDhaka();
  const tomorrowDate = addDaysToIsoDate(baseTodayDate, 1);
  const isTodaySelected = startDate === baseTodayDate && endDate === baseTodayDate;
  const isTomorrowSelected = startDate === tomorrowDate && endDate === tomorrowDate;
  const isTodayAndTomorrowSelected = startDate === baseTodayDate && endDate === tomorrowDate;

  const applyQuickDate = (daysFromToday: number, durationDays = 1) => {
    const s = addDaysToIsoDate(baseTodayDate, daysFromToday);
    const e = addDaysToIsoDate(s, durationDays - 1);
    setStartDate(s);
    setEndDate(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(96vw,42rem)] max-w-[96vw] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border-slate-200">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <CalendarOff className="h-5 w-5 text-rose-100" />
            শ্রেণি ছুটি ঘোষণা ও ব্যবস্থাপনা
          </DialogTitle>
          <DialogDescription className="text-rose-100 text-xs sm:text-[13px]">
            কোনো শ্রেণি বা পুরো একাডেমি ছুটি ঘোষণা করলে শিক্ষার্থীরা রুটিনে গেলেই ছুটি দেখতে পাবে।
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5 max-h-[72vh] overflow-y-auto space-y-5">
          {/* Declaration Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-rose-600" />
                {editingId ? "ছুটির তথ্য সম্পাদনা করুন" : "নতুন ছুটি ঘোষণা করুন"}
              </h4>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetForm()}
                  className="h-7 text-xs text-slate-600"
                >
                  নতুন যোগ করুন
                </Button>
              )}
            </div>

            {/* Target Class Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                কোন শ্রেণি ছুটি থাকবে? *
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAllClasses((prev) => !prev);
                    setSelectedClasses([]);
                    setDivision("ALL");
                    setBatchId("all");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    isAllClasses
                      ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                  }`}
                >
                  {isAllClasses && <Check className="h-3.5 w-3.5" />}
                  সকল শ্রেণি (সম্পূর্ণ একাডেমি)
                </button>

                {availableClassNames.map((cls) => {
                  const selected = !isAllClasses && selectedClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        selected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {classLabel(cls)}
                    </button>
                  );
                })}
              </div>
              {!editingId && !isAllClasses && (
                <p className="text-[11px] text-slate-500">
                  একাধিক শ্রেণি একসাথে নির্বাচন করতে পারেন। নির্দিষ্ট বিভাগ/ব্যাচ ছুটি দিতে একটি শ্রেণি বেছে নিন।
                </p>
              )}
            </div>

            {/* Optional Division & Batch (when single specific class is selected) */}
            {singleSelectedClass && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    বিভাগ (ঐচ্ছিক)
                  </Label>
                  <Select value={division} onValueChange={setDivision}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="সকল বিভাগ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">সকল বিভাগ</SelectItem>
                      <SelectItem value="SCIENCE">শুধু বিজ্ঞান বিভাগ</SelectItem>
                      <SelectItem value="HUMANITIES">শুধু মানবিক বিভাগ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    ব্যাচ (ঐচ্ছিক)
                  </Label>
                  <Select value={batchId} onValueChange={setBatchId}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="সকল ব্যাচ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ব্যাচ ({classLabel(singleSelectedClass)})</SelectItem>
                      {availableBatchesForClass.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} {b.time_slot ? `[${b.time_slot}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Dates & Quick Presets */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-bold text-slate-700">
                  ছুটির তারিখ *
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickDate(0, 1)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                      isTodaySelected
                        ? "bg-rose-600 text-white border-rose-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    }`}
                  >
                    আজ
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDate(1, 1)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                      isTomorrowSelected
                        ? "bg-rose-600 text-white border-rose-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    }`}
                  >
                    আগামীকাল
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDate(0, 2)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                      isTodayAndTomorrowSelected
                        ? "bg-rose-600 text-white border-rose-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    }`}
                  >
                    আজ ও আগামীকাল
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">শুরুর তারিখ</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      if (endDate < val) setEndDate(val);
                    }}
                    className="h-9 text-xs bg-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">শেষের তারিখ (একদিন হলে একই তারিখ)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs bg-white font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                ছুটির কারণ / শিরোনাম *
              </Label>
              <Input
                placeholder="যেমন: বৃষ্টির কারণে ছুটি, বিশেষ ছুটি, ঈদের ছুটি..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                className="h-9 text-xs bg-white"
                required
              />
              <div className="flex flex-wrap gap-1.5">
                {REASON_PRESETS.map((preset) => {
                  const isActiveReason = reason.trim() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
                        isActiveReason
                          ? "bg-rose-600 text-white border-rose-700 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarOff className="h-3.5 w-3.5" />
                )}
                {editingId ? "ছুটি হালনাগাদ করুন" : "ছুটি ঘোষণা করুন"}
              </Button>
            </div>
          </form>

          {/* Active & Upcoming Holidays List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-rose-600" />
                চলমান ও আসন্ন ছুটির তালিকা
              </h4>
              <Badge variant="secondary" className="text-xs font-bold">
                {bn(holidays.length)} টি
              </Badge>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 p-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-rose-600" />
                <p className="text-xs text-slate-500 mt-1.5">লোড হচ্ছে...</p>
              </div>
            ) : holidays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center space-y-1">
                <AlertCircle className="h-7 w-7 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  বর্তমানে কোনো ছুটি ঘোষিত নেই
                </p>
                <p className="text-[11px] text-slate-500">
                  উপরের ফর্ম থেকে যেকোনো শ্রেণির জন্য ছুটি ঘোষণা করতে পারেন।
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.map((h) => {
                  const isTodayActive = isDateInRange(todayDate, h.start_date, h.end_date);
                  return (
                    <div
                      key={h.id}
                      className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isTodayActive
                          ? "bg-rose-50/80 border-rose-300 shadow-2xs"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            className={`text-[10px] font-bold border-none ${
                              isTodayActive
                                ? "bg-rose-600 text-white"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isTodayActive ? "আজ ছুটি চলমান" : "আসন্ন ছুটি"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[11px] font-bold bg-white border-slate-200 text-slate-800"
                          >
                            {formatHolidayTargetBn(h)}
                          </Badge>
                        </div>

                        <p className="text-sm font-bold text-slate-900">{h.reason}</p>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="font-semibold">
                            {formatBanglaDateRange(h.start_date, h.end_date)}
                          </span>
                          {h.created_by_name && (
                            <span className="text-[11px] text-slate-400">
                              • ঘোষণা: {h.created_by_name}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(h)}
                          className="h-8 px-2.5 text-xs font-semibold border-slate-200 text-slate-700"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          এডিট
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingId === h.id}
                          onClick={() => handleDelete(h.id)}
                          className="h-8 px-2.5 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          {deletingId === h.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          বাতিল
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-rose-500" />
            ছুটি দিলে অটো ক্লাস রিমাইন্ডারও বন্ধ থাকবে
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold h-8"
          >
            বন্ধ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
