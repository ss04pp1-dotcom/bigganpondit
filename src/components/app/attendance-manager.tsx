"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Save,
  Loader2,
  Sparkles,
  Search,
  Check,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintButton } from "@/components/app/print-button";
import { useToast } from "@/hooks/use-toast";
import { CLASS_NUMBERS, MONTHS_BN, bn, classLabel, fmtPct, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StudentAttRow {
  id: number;
  name: string;
  roll: number;
  section: string | null;
  phone: string | null;
  photo_key: string | null;
  attendance_status: "PRESENT" | "ABSENT" | "LATE" | null;
  attendance_remarks: string | null;
}

export function AttendanceManager({
  user,
  directorSignatureUrl,
}: {
  user: { name: string; role: Role };
  directorSignatureUrl?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [selectedClass, setSelectedClass] = useState("10");
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);

  // Daily state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentAttRow[]>([]);
  // undefined = unmarked (never fabricated as PRESENT)
  const [dailyStatus, setDailyStatus] = useState<Record<number, "PRESENT" | "ABSENT" | "LATE" | undefined>>({});
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);

  // Monthly Sheet state
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [sheetData, setSheetData] = useState<any | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const { toast } = useToast();

  // Load class list
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.classes) && json.classes.length > 0) {
          setClasses(json.classes);
          return;
        }
        return fetch("/api/admin/teachers")
          .then((r) => r.json())
          .then((j) => {
            if (j.ok && Array.isArray(j.classes)) setClasses(j.classes);
          });
      })
      .catch(() => {});
  }, []);

  const activeClassObj = classes.find((c) => c.name === selectedClass);
  const targetClassParam = activeClassObj?.id ?? selectedClass;

  // Load Daily Attendance
  const loadDaily = useCallback(async () => {
    if (!targetClassParam) return;
    setLoadingDaily(true);
    try {
      const res = await fetch(`/api/attendance?classId=${targetClassParam}&date=${date}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.students)) {
        setStudents(json.students);
        // FIX: only PREFILL statuses that actually exist in the DB
        // (attendance_status is null for unmarked students). Unmarked
        // students stay undefined — saving must never fabricate them as
        // PRESENT.
        const map: Record<number, "PRESENT" | "ABSENT" | "LATE" | undefined> = {};
        for (const s of json.students) {
          map[s.id] =
            s.attendance_status === "PRESENT" || s.attendance_status === "ABSENT" || s.attendance_status === "LATE"
              ? s.attendance_status
              : undefined;
        }
        setDailyStatus(map);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDaily(false);
    }
  }, [targetClassParam, date]);

  useEffect(() => {
    if (activeTab === "daily") {
      loadDaily();
    }
  }, [activeTab, loadDaily]);

  // Load Monthly Sheet
  const loadMonthlySheet = useCallback(async () => {
    if (!targetClassParam) return;
    setLoadingSheet(true);
    try {
      const res = await fetch(`/api/attendance/sheet?classId=${targetClassParam}&month=${month}&year=${year}`);
      const json = await res.json();
      if (json.ok) {
        setSheetData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSheet(false);
    }
  }, [targetClassParam, month, year]);

  useEffect(() => {
    if (activeTab === "monthly") {
      loadMonthlySheet();
    }
  }, [activeTab, loadMonthlySheet]);

  function markAll(status: "PRESENT" | "ABSENT") {
    const updated: Record<number, "PRESENT" | "ABSENT" | "LATE"> = {};
    for (const s of students) {
      updated[s.id] = status;
    }
    setDailyStatus(updated);
  }

  async function handleSaveDaily() {
    if (!targetClassParam) return;
    // FIX: save ONLY the students whose status was explicitly set —
    // either already recorded in the DB (prefilled on load) or clicked in
    // this session. Unmarked students are silently skipped instead of being
    // fabricated as PRESENT (which used to inflate attendance on save).
    const entries = students
      .filter((s) => dailyStatus[s.id] !== undefined)
      .map((s) => ({
        studentId: s.id,
        status: dailyStatus[s.id] as "PRESENT" | "ABSENT" | "LATE",
      }));

    if (entries.length === 0) {
      toast({
        title: "কারো হাজিরা চিহ্নিত হয়নি।",
        description: "উপস্থিত/অনুপস্থিত বোতাম চেপে অন্তত একজন শিক্ষার্থীর হাজিরা দিন, অথবা 'সবাইকে উপস্থিত' ব্যবহার করুন।",
        variant: "destructive",
      });
      return;
    }

    const unmarkedCount = students.length - entries.length;
    setSavingDaily(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: targetClassParam,
          date,
          entries,
          records: entries,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "হাজিরা সংরক্ষণ ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }

      toast({
        title: json.message,
        ...(unmarkedCount > 0
          ? { description: `${unmarkedCount} জন শিক্ষার্থীর হাজিরা চিহ্নিত হয়নি — সেভ করা হয়নি।` }
          : {}),
      });
      loadDaily();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingDaily(false);
    }
  }

  // Summary counts (unmarked students are counted separately, never as present)
  const totalStudents = students.length;
  const presentCount = Object.values(dailyStatus).filter((st) => st === "PRESENT").length;
  const absentCount = Object.values(dailyStatus).filter((st) => st === "ABSENT").length;
  const lateCount = Object.values(dailyStatus).filter((st) => st === "LATE").length;
  const unmarkedCount = students.filter((s) => dailyStatus[s.id] === undefined).length;
  const markedCount = presentCount + absentCount + lateCount;
  const rate = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-emerald-100 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <CheckSquare className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">শিক্ষার্থী হাজিরা শিট ও ট্র্যাকিং</h2>
              <p className="text-[12px] text-slate-500">
                দৈনিক উপস্থিতি ও মাসিক হাজিরা শিট ব্যবস্থাপনা
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setActiveTab("daily")}
              className={cn(
                "rounded-md px-3 py-1 font-semibold transition-all",
                activeTab === "daily" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              দৈনিক হাজিরা
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={cn(
                "rounded-md px-3 py-1 font-semibold transition-all",
                activeTab === "monthly" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              মাসিক হাজিরা শিট
            </button>
          </div>
        </CardContent>
      </Card>

      {/* DAILY ATTENDANCE TAB */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardContent className="flex flex-col gap-3 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">শ্রেণি</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-8.5 sm:h-8 w-full sm:w-[125px] text-xs">
                      <SelectValue placeholder="শ্রেণি" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_NUMBERS.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {classLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">তারিখ</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8.5 sm:h-8 text-xs w-full sm:w-[140px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAll("PRESENT")}
                  className="flex-1 sm:flex-initial h-8 text-[11px] sm:text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                  সবাই উপস্থিত
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAll("ABSENT")}
                  className="flex-1 sm:flex-initial h-8 text-[11px] sm:text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5 text-red-600" />
                  সবাই অনুপস্থিত
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDaily}
                  disabled={savingDaily || students.length === 0}
                  className="w-full sm:w-auto h-8.5 sm:h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs"
                >
                  {savingDaily ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  সংরক্ষণ করুন
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500">মোট শিক্ষার্থী</span>
              <p className="text-xl font-bold text-slate-800">{bn(totalStudents)} জন</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-emerald-700">উপস্থিত</span>
              <p className="text-xl font-bold text-emerald-700">{bn(presentCount)} জন</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-red-700">অনুপস্থিত</span>
              <p className="text-xl font-bold text-red-700">{bn(absentCount)} জন</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-blue-700">উপস্থিতির হার</span>
              <p className="text-xl font-bold text-blue-700">{fmtPct(rate)}</p>
            </div>
          </div>

          {/* Students Attendance List & Table */}
          {loadingDaily ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              হাজিরা লোড হচ্ছে...
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold">এই শ্রেণিতে কোনো শিক্ষার্থী নেই।</p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Dedicated Touch Cards (< sm) */}
              <div className="block sm:hidden space-y-2.5">
                {students.map((s) => {
                  // undefined stays undefined — unmarked shows neutral styling
                  const currentSt = dailyStatus[s.id];
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "rounded-xl border p-3 transition-colors shadow-2xs space-y-2.5",
                        currentSt === undefined
                          ? "border-slate-200 bg-slate-50/40"
                          : currentSt === "PRESENT"
                          ? "border-emerald-200 bg-white"
                          : currentSt === "ABSENT"
                          ? "border-red-200 bg-red-50/30"
                          : "border-amber-200 bg-amber-50/20"
                      )}
                    >
                      {/* Top: Roll, Avatar, Name & Info */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StudentAvatar photoKey={s.photo_key} name={s.name} size="sm" className="h-9 w-9 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate">{s.name}</div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              {s.section && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">শাখা: {s.section}</span>}
                              {s.phone && (
                                <a href={`tel:${s.phone}`} className="text-emerald-700 hover:underline font-mono">
                                  {bn(s.phone)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-center bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          <span className="text-[10px] text-slate-500 block leading-tight">রোল</span>
                          <span className="text-xs font-bold font-mono text-slate-800">{bn(s.roll)}</span>
                        </div>
                      </div>

                      {/* Bottom: 3 Large Touch Buttons (Zero Horizontal Cut-off) */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "PRESENT" })}
                          className={cn(
                            "flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all",
                            currentSt === "PRESENT"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-emerald-700 bg-transparent"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>উপস্থিত</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "ABSENT" })}
                          className={cn(
                            "flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all",
                            currentSt === "ABSENT"
                              ? "bg-red-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-red-700 bg-transparent"
                          )}
                        >
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>অনুপস্থিত</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "LATE" })}
                          className={cn(
                            "flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all",
                            currentSt === "LATE"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-slate-600 hover:text-amber-700 bg-transparent"
                          )}
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>দেরি</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Full Table (>= sm) */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-center w-12">রোল</th>
                      <th className="px-3 py-2.5 w-12 text-center">ছবি</th>
                      <th className="px-3 py-2.5">শিক্ষার্থীর নাম</th>
                      <th className="px-3 py-2.5 text-center">শাখা</th>
                      <th className="px-3 py-2.5 text-center">ফোন নম্বর</th>
                      <th className="px-3 py-2.5 text-center w-56">হাজিরা স্থিতি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => {
                      // undefined = unmarked (neutral row, no button highlighted)
                      const currentSt = dailyStatus[s.id];
                      return (
                        <tr
                          key={s.id}
                          className={cn(
                            "transition-colors",
                            currentSt === undefined
                              ? "bg-slate-50/50"
                              : currentSt === "ABSENT"
                              ? "bg-red-50/40"
                              : currentSt === "LATE"
                              ? "bg-amber-50/30"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <td className="px-3 py-2.5 text-center font-bold font-mono text-slate-700">
                            {bn(s.roll)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <StudentAvatar photoKey={s.photo_key} name={s.name} size="sm" className="mx-auto h-7 w-7" />
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-slate-900">{s.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-500">
                            {s.section || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {s.phone ? (
                              <a href={`tel:${s.phone}`} className="text-emerald-700 hover:underline font-semibold">
                                {bn(s.phone)}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                              <button
                                type="button"
                                onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "PRESENT" })}
                                className={cn(
                                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                  currentSt === "PRESENT"
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "text-slate-600 hover:text-emerald-700"
                                )}
                              >
                                উপস্থিত
                              </button>
                              <button
                                type="button"
                                onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "ABSENT" })}
                                className={cn(
                                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                  currentSt === "ABSENT"
                                    ? "bg-red-600 text-white shadow-2xs"
                                    : "text-slate-600 hover:text-red-700"
                                )}
                              >
                                অনুপস্থিত
                              </button>
                              <button
                                type="button"
                                onClick={() => setDailyStatus({ ...dailyStatus, [s.id]: "LATE" })}
                                className={cn(
                                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                  currentSt === "LATE"
                                    ? "bg-amber-500 text-white shadow-2xs"
                                    : "text-slate-600 hover:text-amber-700"
                                )}
                              >
                                দেরি
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Sticky Bottom Floating Save Bar */}
              <div className="sm:hidden sticky bottom-3 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-700 min-w-0">
                  <span className="text-emerald-700">উপস্থিত: {bn(presentCount)}</span>
                  <span className="mx-1 text-slate-300">•</span>
                  <span className="text-red-600">অনুপস্থিত: {bn(absentCount)}</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveDaily}
                  disabled={savingDaily}
                  className="h-8.5 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs shrink-0"
                >
                  {savingDaily ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  হাজিরা সংরক্ষণ করুন
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* MONTHLY ATTENDANCE SHEET TAB */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          {/* Controls */}
          <Card className="no-print border-slate-200 bg-white shadow-2xs">
            <CardContent className="flex flex-col gap-3 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">শ্রেণি</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-8.5 sm:h-8 w-full sm:w-[125px] text-xs">
                      <SelectValue placeholder="শ্রেণি" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_NUMBERS.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {classLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">মাস</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="h-8.5 sm:h-8 w-full sm:w-[130px] text-xs">
                      <SelectValue placeholder="মাস" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_BN.map((m, idx) => (
                        <SelectItem key={m} value={String(idx + 1)} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-500">বছর</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="h-8.5 sm:h-8 text-xs w-full sm:w-[90px]"
                  />
                </div>
              </div>

              <div className="no-print flex justify-end">
                <PrintButton label="প্রিন্ট করুন (A4 হাজিরা শিট)" />
              </div>
            </CardContent>
          </Card>

          {/* Printable Monthly Attendance Grid */}
          {loadingSheet ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              হাজিরা শিট লোড হচ্ছে...
            </div>
          ) : !sheetData || ((sheetData.students?.length ?? 0) === 0 && (sheetData.rows?.length ?? 0) === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              এই মাসে কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি।
            </div>
          ) : (
            <div className="print-area rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              {/* Sheet Header */}
              <div className="text-center space-y-1 border-b pb-3 border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  বিজ্ঞান পণ্ডিত একাডেমি — মাসিক শিক্ষার্থী হাজিরা শিট
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {classLabel(selectedClass)} • {MONTHS_BN[Number(month) - 1]} {bn(year)} • মোট দিন: {bn(sheetData.daysInMonth)}
                </p>
              </div>

              {/* Day-by-Day Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 px-2 py-1 text-center w-10">রোল</th>
                      <th className="border border-slate-300 px-2 py-1 text-left min-w-[120px]">নাম</th>
                      {Array.from({ length: sheetData.daysInMonth }, (_, i) => i + 1).map((d) => (
                        <th key={d} className="border border-slate-300 p-0.5 text-center w-6 font-mono text-[10px]">
                          {bn(d)}
                        </th>
                      ))}
                      <th className="border border-slate-300 px-1.5 py-1 text-center bg-emerald-50 text-emerald-800 w-10">উপ</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center bg-red-50 text-red-800 w-10">অন</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center bg-blue-50 text-blue-800 w-12">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sheetData.students || sheetData.rows || []).map((st: any) => {
                      const days = st.days || sheetData.studentDays?.[st.id] || {};
                      let p = typeof st.present === "number" ? st.present : 0;
                      let a = typeof st.absent === "number" ? st.absent : 0;
                      if (typeof st.present !== "number") {
                        for (let d = 1; d <= sheetData.daysInMonth; d++) {
                          if (days[d] === "PRESENT") p++;
                          else if (days[d] === "ABSENT") a++;
                        }
                      }
                      const totalRecorded = p + a;
                      const pPct = typeof st.rate === "number" ? st.rate : (totalRecorded > 0 ? Math.round((p / totalRecorded) * 100) : 0);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-bold font-mono">
                            {bn(st.roll)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold truncate max-w-[140px]">
                            {st.name}
                          </td>
                          {Array.from({ length: sheetData.daysInMonth }, (_, i) => i + 1).map((d) => {
                            const status = days[d];
                            return (
                              <td
                                key={d}
                                className={cn(
                                  "border border-slate-300 p-0 text-center font-bold text-[9px]",
                                  status === "PRESENT"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : status === "ABSENT"
                                    ? "bg-red-50 text-red-600"
                                    : status === "LATE"
                                    ? "bg-amber-50 text-amber-600"
                                    : "text-slate-300"
                                )}
                              >
                                {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "LATE" ? "L" : "-"}
                              </td>
                            );
                          })}
                          <td className="border border-slate-300 px-1 py-1 text-center font-bold text-emerald-700 bg-emerald-50/40">
                            {bn(p)}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 text-center font-bold text-red-600 bg-red-50/40">
                            {bn(a)}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 text-center font-bold text-blue-700 bg-blue-50/40">
                            {totalRecorded > 0 ? `${bn(pPct)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Automatic Director Signature Section for Print — Point 08 */}
              <div className="print-avoid-break pt-8 flex items-end justify-between border-t border-slate-200 mt-6">
                <div className="text-center text-[12px] text-slate-500 w-48">
                  <div className="h-10" />
                  <p className="border-t border-slate-400 pt-1">শ্রেণি শিক্ষকের স্বাক্ষর</p>
                </div>

                <div className="text-center text-[12px] text-slate-800 w-48">
                  {directorSignatureUrl ? (
                    <img
                      src={directorSignatureUrl}
                      alt="পরিচালকের স্বাক্ষর"
                      className="mx-auto h-12 object-contain mb-1"
                    />
                  ) : (
                    <div className="h-10" />
                  )}
                  <p className="border-t border-slate-900 pt-1 font-bold">পরিচালকের স্বাক্ষর ও সিল</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
