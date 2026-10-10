"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Sparkles,
  Calendar,
  X,
  Filter,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  Flame,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CLASS_NUMBERS, DAYS_OF_WEEK, bn, classLabel, getDayNameBn } from "@/lib/constants";
import Link from "next/link";

export interface RoutineItem {
  id: number;
  day_of_week: number;
  class_name: string;
  division: string | null;
  section: string | null;
  subject_id: number | null;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  start_time: string;
  end_time: string;
  room_no: string | null;
  note: string | null;
  is_active: number;
}

interface RoutineApiResponse {
  ok: boolean;
  routines: RoutineItem[];
  todayDayOfWeek: number;
  todayDayName: string;
  userContext: {
    role: string;
    userName?: string;
    studentClass?: string | null;
    studentDivision?: string | null;
    teacherId?: number | null;
  };
  teachers: { id: number; name: string; short_name: string }[];
}

// Convert "10:00 AM" or "02:30 PM" to minutes from midnight for time comparison
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function TodayRoutineModal({
  forceOpen,
  onClose,
  triggerButtonOnly = false,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
  triggerButtonOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RoutineApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"TODAY" | "WEEK">("TODAY");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [dontShowAgainToday, setDontShowAgainToday] = useState(false);

  // Current time in minutes
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Load routine data
  useEffect(() => {
    let ignore = false;
    async function fetchRoutines() {
      setLoading(true);
      try {
        const res = await fetch("/api/routines");
        const json = await res.json();
        if (!ignore && json.ok) {
          setData(json);
          // Auto-set selected class if student
          if (json.userContext?.studentClass) {
            setSelectedClass(json.userContext.studentClass);
          }
        }
      } catch (err) {
        console.error("Failed to load routines:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchRoutines();
    return () => {
      ignore = true;
    };
  }, []);

  // Popup logic on first visit of the day
  useEffect(() => {
    if (triggerButtonOnly) return;
    if (forceOpen) {
      setOpen(true);
      return;
    }

    // Check if dismissed today
    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissed = sessionStorage.getItem("bp_dismissed_routine_date");
    const dismissedLocal = localStorage.getItem("bp_dismissed_routine_date");

    if (dismissed === todayStr || dismissedLocal === todayStr) {
      return;
    }

    // Delay slightly to feel smooth and non-blocking
    const timer = setTimeout(() => {
      setOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [forceOpen, triggerButtonOnly]);

  const handleClose = () => {
    setOpen(false);
    if (dontShowAgainToday) {
      const todayStr = new Date().toISOString().slice(0, 10);
      localStorage.setItem("bp_dismissed_routine_date", todayStr);
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      sessionStorage.setItem("bp_dismissed_routine_date", todayStr);
    }
    if (onClose) onClose();
  };

  const todayDayOfWeek = data?.todayDayOfWeek ?? new Date().getDay();
  const todayDayName = data?.todayDayName ?? getDayNameBn(todayDayOfWeek);

  // Filter today's classes
  const todayRoutines = useMemo(() => {
    if (!data?.routines) return [];
    return data.routines.filter((r) => {
      if (r.day_of_week !== todayDayOfWeek) return false;
      if (data.userContext?.role === "STUDENT") {
        // Already scoped from API
        return true;
      }
      if (selectedClass !== "all" && r.class_name !== selectedClass) {
        return false;
      }
      return true;
    });
  }, [data, todayDayOfWeek, selectedClass]);

  // Filter selected day classes for weekly view
  const weeklyDayRoutines = useMemo(() => {
    if (!data?.routines) return [];
    return data.routines.filter((r) => {
      if (r.day_of_week !== selectedDay) return false;
      if (data.userContext?.role === "STUDENT") return true;
      if (selectedClass !== "all" && r.class_name !== selectedClass) return false;
      return true;
    });
  }, [data, selectedDay, selectedClass]);

  // Calculate status of a class
  const getClassStatus = (startTime: string, endTime: string) => {
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (startMin === null || endMin === null) return "UNKNOWN";

    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      return "RUNNING"; // Ongoing now!
    } else if (currentMinutes < startMin) {
      return "UPCOMING"; // Later today
    } else {
      return "PASSED"; // Finished
    }
  };

  const userRole = data?.userContext?.role;
  const isStudent = userRole === "STUDENT";
  const isTeacher = userRole === "TEACHER";
  const isAdmin = userRole === "ADMIN";

  // Friendly date display in Bangla
  const fullDateBn = now.toLocaleDateString("bn-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Trigger Button if used inline or in headers */}
      {triggerButtonOnly && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="relative gap-2 border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 font-bold text-xs sm:text-sm h-9 px-3.5 shadow-2xs rounded-xl"
        >
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <span>আজকের রুটিন</span>
          {todayRoutines.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-extrabold text-white">
              {bn(todayRoutines.length)}
            </span>
          )}
        </Button>
      )}

      {/* The Routine Modal Dialog */}
      <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : setOpen(true))}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-slate-200 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white shrink-0 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute right-20 top-2 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      আজকের ক্লাস রুটিন
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-2.5 py-0.5">
                        {todayDayName}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-300 mt-0.5">
                      {fullDateBn}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Role specific header tag */}
              <div className="flex items-center gap-2">
                {isStudent && data?.userContext?.studentClass && (
                  <Badge variant="outline" className="border-emerald-400/40 bg-emerald-950/60 text-emerald-300 text-xs px-2.5 py-1">
                    শ্রেণী: {classLabel(data.userContext.studentClass)}
                    {data.userContext.studentDivision ? ` (${data.userContext.studentDivision})` : ""}
                  </Badge>
                )}
                {isTeacher && (
                  <Badge variant="outline" className="border-indigo-400/40 bg-indigo-950/60 text-indigo-300 text-xs px-2.5 py-1">
                    শিক্ষক: {data?.userContext?.userName || "আপনার ক্লাস"}
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="outline" className="border-amber-400/40 bg-amber-950/60 text-amber-300 text-xs px-2.5 py-1">
                    অ্যাকাডেমি অ্যাডমিন ভিউ
                  </Badge>
                )}
              </div>
            </div>

            {/* Tabs for Today vs Full Week */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("TODAY")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "TODAY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  আজকের ক্লাস ({bn(todayRoutines.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("WEEK")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "WEEK"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  সাপ্তাহিক রুটিন
                </button>
              </div>

              {/* Class Filter if not student */}
              {!isStudent && (
                <div className="flex items-center gap-2">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-8 text-xs bg-slate-800 border-white/20 text-white font-medium w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="সব শ্রেণী" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল শ্রেণী</SelectItem>
                      {CLASS_NUMBERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {classLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Modal Body / Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70">
            {activeTab === "TODAY" ? (
              <div className="space-y-3">
                {/* Notice if no classes today */}
                {todayRoutines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      আজ ({todayDayName}) কোনো ক্লাস নির্ধারিত নেই!
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      ছুটির দিন অথবা আজকের জন্য কোনো ক্লাস সূচি নেই। আপনি পূর্ণ সাপ্তাহিক রুটিন দেখতে পাশের ট্যাবে ক্লিক করতে পারেন।
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("WEEK")}
                      className="gap-2 text-xs font-bold text-slate-700 border-slate-300"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      সাপ্তাহিক রুটিন দেখুন
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {todayRoutines.map((routine) => {
                      const status = getClassStatus(routine.start_time, routine.end_time);
                      const isRunning = status === "RUNNING";
                      const isUpcoming = status === "UPCOMING";

                      return (
                        <div
                          key={routine.id}
                          className={`relative rounded-2xl border p-4 transition-all shadow-xs ${
                            isRunning
                              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20"
                              : isUpcoming
                              ? "bg-white border-indigo-200 hover:border-indigo-300"
                              : "bg-white/80 border-slate-200 opacity-85 hover:opacity-100"
                          }`}
                        >
                          {/* Live pulse for running class */}
                          {isRunning && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                              </span>
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                                চলমান ক্লাস
                              </span>
                            </div>
                          )}

                          {isUpcoming && (
                            <div className="absolute top-3 right-3">
                              <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
                                আসন্ন ক্লাস
                              </Badge>
                            </div>
                          )}

                          {!isRunning && !isUpcoming && (
                            <div className="absolute top-3 right-3">
                              <Badge variant="outline" className="text-[10px] font-medium border-slate-200 bg-slate-100 text-slate-500">
                                সমাপ্ত
                              </Badge>
                            </div>
                          )}

                          {/* Time Header */}
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Clock className={`h-4 w-4 ${isRunning ? "text-emerald-600" : "text-indigo-600"}`} />
                            <span className="text-slate-900 text-sm font-mono font-extrabold tracking-tight">
                              {routine.start_time} – {routine.end_time}
                            </span>
                          </div>

                          {/* Subject & Class Info */}
                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-emerald-700 shrink-0" />
                              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                                {routine.subject_name}
                              </h4>
                            </div>

                            {/* Class and Section (when viewing as teacher/admin/guest) */}
                            {(!isStudent || userRole === "ADMIN") && (
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                                <Badge variant="secondary" className="font-bold text-[11px] bg-slate-100 text-slate-800">
                                  শ্রেণী: {classLabel(routine.class_name)}
                                </Badge>
                                {routine.division && (
                                  <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                                    {routine.division === "SCIENCE" ? "বিজ্ঞান" : "মানবিক"}
                                  </Badge>
                                )}
                                {routine.section && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    শাখা: {routine.section}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Teacher and Room Footer */}
                          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <GraduationCap className="h-4 w-4 text-slate-500" />
                              <span className="font-semibold">{routine.teacher_name}</span>
                            </div>

                            {routine.room_no && (
                              <div className="flex items-center gap-1 text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium">
                                <DoorOpen className="h-3.5 w-3.5 text-slate-500" />
                                <span>{routine.room_no}</span>
                              </div>
                            )}
                          </div>

                          {/* Note if present */}
                          {routine.note && (
                            <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              💡 {routine.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Weekly Schedule View */
              <div className="space-y-4">
                {/* Day Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {DAYS_OF_WEEK.map((day) => {
                    const isToday = day.id === todayDayOfWeek;
                    const isSelected = day.id === selectedDay;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setSelectedDay(day.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : isToday
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{day.name}</span>
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Day content */}
                {weeklyDayRoutines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-700">
                      {getDayNameBn(selectedDay)}-এ কোনো ক্লাস সূচি নির্ধারিত নেই।
                    </p>
                    <p className="text-xs text-slate-500">
                      ছুটির দিন অথবা ক্লাসের রুটিন এখনো যুক্ত করা হয়নি।
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {weeklyDayRoutines.map((routine) => (
                      <div
                        key={routine.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-900">
                                {routine.subject_name}
                              </h5>
                              <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-700">
                                শ্রেণী: {classLabel(routine.class_name)}
                              </Badge>
                              {routine.division && (
                                <Badge variant="secondary" className="text-[10px] text-slate-600">
                                  {routine.division}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                                {routine.teacher_name}
                              </span>
                              {routine.room_no && (
                                <span className="flex items-center gap-1 text-slate-600 font-mono">
                                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                                  {routine.room_no}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-900">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            {routine.start_time} – {routine.end_time}
                          </div>
                          {routine.note && (
                            <p className="mt-1 text-[11px] text-slate-500 italic max-w-xs truncate">
                              {routine.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-white p-3.5 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-routine"
                checked={dontShowAgainToday}
                onCheckedChange={(c) => setDontShowAgainToday(!!c)}
              />
              <label
                htmlFor="dont-show-routine"
                className="text-xs text-slate-600 font-medium cursor-pointer select-none"
              >
                আজ আর পপ-আপ দেখাবেন না
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isAdmin && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Link href="/admin/routine" onClick={() => setOpen(false)}>
                    রুটিন এডিট করুন
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                onClick={handleClose}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 h-9"
              >
                ঠিক আছে
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
