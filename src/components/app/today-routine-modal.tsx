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
  School,
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
import {
  CLASS_NUMBERS,
  DAYS_OF_WEEK,
  bn,
  classLabel,
  divisionLabel,
  getDayNameBn,
  getBangladeshDayOfWeek,
} from "@/lib/constants";
import Link from "next/link";

export interface RoutineItem {
  id: number;
  day_of_week: number;
  class_name: string;
  division: string | null;
  section: string | null;
  batch_id?: number | null;
  batch_name?: string | null;
  subject_id: number | null;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  teacher_photo_key?: string | null;
  teacher_short_name?: string | null;
  period?: string | null;
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
    studentSection?: string | null;
    studentRoll?: number | null;
    studentBatchId?: number | null;
    studentBatchName?: string | null;
    teacherId?: number | null;
    teacherShortName?: string | null;
  };
  teachers: { id: number; user_id?: number; name: string; short_name: string; photo_key?: string | null }[];
  batches?: { id: number; name: string; class_id: number; class_name: string; division: string | null; time_slot: string | null }[];
}

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
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number>(getBangladeshDayOfWeek());
  const [dontShowAgainToday, setDontShowAgainToday] = useState(false);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDayOfWeek = data?.todayDayOfWeek ?? getBangladeshDayOfWeek();
  const todayDayName = data?.todayDayName ?? getDayNameBn(todayDayOfWeek);

  useEffect(() => {
    let ignore = false;
    async function fetchRoutines() {
      setLoading(true);
      try {
        const res = await fetch("/api/routines");
        if (res.status === 401) {
          // Unauthenticated: do not open or show
          return;
        }
        const json = await res.json();
        if (!ignore && json.ok) {
          setData(json);
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

    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissed = sessionStorage.getItem("bp_dismissed_routine_date");
    const dismissedLocal = localStorage.getItem("bp_dismissed_routine_date");

    if (dismissed === todayStr || dismissedLocal === todayStr) {
      return;
    }

    const timer = setTimeout(() => {
      // Only open if data has loaded and user is authenticated
      if (data?.ok) {
        setOpen(true);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [forceOpen, triggerButtonOnly, data]);

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

  const userRole = data?.userContext?.role;
  const isStudent = userRole === "STUDENT";
  const isTeacher = userRole === "TEACHER";
  const isAdmin = userRole === "ADMIN";
  const isDirector = userRole === "DIRECTOR";

  // Filter today's classes
  const todayRoutines = useMemo(() => {
    if (!data?.routines) return [];
    return data.routines.filter((r) => {
      if (r.day_of_week !== todayDayOfWeek) return false;

      // Student scoping (strictly locked to student's class)
      if (isStudent) {
        if (data.userContext?.studentClass && r.class_name !== data.userContext.studentClass) return false;
        if (
          data.userContext?.studentDivision &&
          r.division &&
          r.division !== data.userContext.studentDivision
        ) {
          return false;
        }
        if (
          data.userContext?.studentSection &&
          r.section &&
          r.section !== data.userContext.studentSection
        ) {
          return false;
        }
        return true;
      }

      // Teacher scoping (strictly locked to teacher's own teaching schedule)
      if (isTeacher) {
        if (data.userContext?.teacherId) {
          const myTid = data.userContext.teacherId;
          const matchMyId = r.teacher_id === myTid;
          const matchMyName =
            data.userContext.userName &&
            r.teacher_name.includes(data.userContext.userName.split(" ")[0]);
          const matchMyShort =
            data.userContext.teacherShortName &&
            (r.teacher_name.includes(data.userContext.teacherShortName) ||
              r.teacher_short_name === data.userContext.teacherShortName);

          if (!matchMyId && !matchMyName && !matchMyShort) return false;
        }
        return true;
      }

      // Admin / Director
      if (isAdmin || isDirector) {
        if (selectedClass !== "all" && r.class_name !== selectedClass) return false;
        if (selectedDivision !== "all" && r.division && r.division !== selectedDivision) return false;
        if (selectedTeacher !== "all") {
          const tid = parseInt(selectedTeacher, 10);
          if (!isNaN(tid) && r.teacher_id !== tid) return false;
        }
      }

      return true;
    });
  }, [
    data,
    todayDayOfWeek,
    isStudent,
    isTeacher,
    isAdmin,
    isDirector,
    selectedClass,
    selectedDivision,
    selectedTeacher,
  ]);

  // Filter selected day classes for weekly view
  const weeklyDayRoutines = useMemo(() => {
    if (!data?.routines) return [];
    return data.routines.filter((r) => {
      if (r.day_of_week !== selectedDay) return false;

      // Student scoping (strictly locked to student's class)
      if (isStudent) {
        if (data.userContext?.studentClass && r.class_name !== data.userContext.studentClass) return false;
        if (
          data.userContext?.studentDivision &&
          r.division &&
          r.division !== data.userContext.studentDivision
        ) {
          return false;
        }
        if (
          data.userContext?.studentSection &&
          r.section &&
          r.section !== data.userContext.studentSection
        ) {
          return false;
        }
        return true;
      }

      // Teacher scoping (strictly locked to teacher's own teaching schedule)
      if (isTeacher) {
        if (data.userContext?.teacherId) {
          const myTid = data.userContext.teacherId;
          const matchMyId = r.teacher_id === myTid;
          const matchMyName =
            data.userContext.userName &&
            r.teacher_name.includes(data.userContext.userName.split(" ")[0]);
          const matchMyShort =
            data.userContext.teacherShortName &&
            (r.teacher_name.includes(data.userContext.teacherShortName) ||
              r.teacher_short_name === data.userContext.teacherShortName);

          if (!matchMyId && !matchMyName && !matchMyShort) return false;
        }
        return true;
      }

      // Admin / Director
      if (isAdmin || isDirector) {
        if (selectedClass !== "all" && r.class_name !== selectedClass) return false;
        if (selectedDivision !== "all" && r.division && r.division !== selectedDivision) return false;
        if (selectedTeacher !== "all") {
          const tid = parseInt(selectedTeacher, 10);
          if (!isNaN(tid) && r.teacher_id !== tid) return false;
        }
      }

      return true;
    });
  }, [
    data,
    selectedDay,
    isStudent,
    isTeacher,
    isAdmin,
    isDirector,
    selectedClass,
    selectedDivision,
    selectedTeacher,
  ]);

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

  return (
    <>
      {/* Trigger Button if used inline */}
      {triggerButtonOnly && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold h-9 shadow-xs px-3.5"
        >
          <span>আজকের রুটিন</span>
        </Button>
      )}

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-slate-200">
          {/* Modal Header */}
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex flex-row items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-emerald-200" />
                  ক্লাস রুটিন বিজ্ঞপ্তি
                </DialogTitle>
                <Badge className="bg-white/20 text-white hover:bg-white/30 text-[11px] font-bold border-none">
                  {todayDayName}
                </Badge>
                <Badge className="hidden sm:inline-flex bg-emerald-900/60 text-emerald-100 text-[10px] font-bold border border-emerald-400/30">
                  🔔 ১০মি. পূর্বে ও শুরুতে নোটিফিকেশন
                </Badge>
              </div>
              <DialogDescription className="text-emerald-100 text-xs sm:text-[13px] font-medium">
                {isStudent && data?.userContext?.studentClass
                  ? `শ্রেণি: ${classLabel(data.userContext.studentClass)}${
                      data.userContext.studentDivision ? ` (${divisionLabel(data.userContext.studentDivision)})` : ""
                    } — আজকের ও সাপ্তাহিক পাঠদান সূচি`
                  : isTeacher && data?.userContext?.userName
                  ? `শিক্ষক: ${data.userContext.userName} — আজকের ক্লাস তালিকা`
                  : "বিজ্ঞান পণ্ডিত একাডেমি — প্রতিদিনের একাডেমিক ক্লাস শিডিউল"}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Quick Subheader & Filter Controls */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            {/* View Mode Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "TODAY" | "WEEK")} className="w-auto">
              <TabsList className="h-8 bg-white border border-slate-200 shadow-2xs">
                <TabsTrigger value="TODAY" className="text-xs font-bold gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Sparkles className="h-3 w-3" />
                  আজকের রুটিন ({todayDayName})
                </TabsTrigger>
                <TabsTrigger value="WEEK" className="text-xs font-bold gap-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <Calendar className="h-3 w-3" />
                  সাপ্তাহিক রুটিন
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Role indicator & Admin controls */}
            <div className="flex items-center gap-2">
              {isStudent && data?.userContext?.studentClass && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] px-2.5 py-1">
                  শ্রেণি: {classLabel(data.userContext.studentClass)}
                </Badge>
              )}

              {isTeacher && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-bold text-[11px] px-2.5 py-1">
                  ব্যক্তিগত পাঠদান সূচি
                </Badge>
              )}

              {/* Class Selector ONLY for admin/director */}
              {(isAdmin || isDirector) && (
                <div className="w-[125px]">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="সব শ্রেণি" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল শ্রেণি</SelectItem>
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

          {/* Modal Body */}
          <div className="p-4 sm:p-5 max-h-[58vh] overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center space-y-2">
                <div className="h-6 w-6 animate-spin border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs text-slate-500">রুটিন লোড হচ্ছে...</p>
              </div>
            ) : activeTab === "TODAY" ? (
              /* TODAY'S ROUTINE VIEW */
              <div className="space-y-3">
                {todayRoutines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-2">
                    <CalendarDays className="h-10 w-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">
                      আজ {todayDayName} কোনো ক্লাস নির্ধারিত নেই
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {todayDayOfWeek === 5
                        ? "আজ শুক্রবার — সাপ্তাহিক ছুটির দিন। পুরো সপ্তাহের সময়সূচি দেখতে সাপ্তাহিক রুটিন ট্যাবে যান।"
                        : "আজকের জন্য কোনো ক্লাস পাওয়া যায়নি।"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("WEEK")}
                      className="text-xs font-bold mt-2"
                    >
                      সাপ্তাহিক রুটিন দেখুন
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {todayRoutines.map((routine) => {
                      const status = getClassStatus(routine.start_time, routine.end_time);
                      const isRunning = status === "RUNNING";
                      const isUpcoming = status === "UPCOMING";
                      const isPassed = status === "PASSED";

                      return (
                        <div
                          key={routine.id}
                          className={`rounded-xl border p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                            isRunning
                              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20"
                              : isUpcoming
                              ? "bg-white border-slate-200 hover:border-slate-300"
                              : "bg-slate-50/80 border-slate-200 opacity-80"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                                isRunning
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <BookOpen className="h-5 w-5" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h5 className="text-sm font-bold text-slate-900">
                                  {routine.subject_name}
                                </h5>
                                <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-700">
                                  {classLabel(routine.class_name)}
                                </Badge>
                                {routine.division && (
                                  <Badge variant="secondary" className="text-[10px] text-slate-600">
                                    {divisionLabel(routine.division)}
                                  </Badge>
                                )}
                                {routine.period && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                                    {routine.period}
                                  </Badge>
                                )}
                                {routine.batch_name && (
                                  <Badge variant="outline" className="text-[10px] font-semibold bg-violet-50 text-violet-700 border-violet-200">
                                    ব্যাচ: {routine.batch_name}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                <span className="flex items-center gap-1.5 font-medium">
                                  {routine.teacher_photo_key ? (
                                    <img
                                      src={`/api/files/${routine.teacher_photo_key}`}
                                      alt={routine.teacher_name}
                                      className="h-4 w-4 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 text-[8px] font-bold">
                                      {routine.teacher_short_name || routine.teacher_name.slice(0, 2)}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800">{routine.teacher_name}</span>
                                </span>

                                {routine.room_no && (
                                  <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                                    <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                                    {routine.room_no}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 flex flex-col sm:items-end gap-1">
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 shadow-2xs">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {routine.start_time} – {routine.end_time}
                            </div>

                            {isRunning && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
                                </span>
                                চলমান ক্লাস
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                আসন্ন ক্লাস
                              </span>
                            )}
                            {isPassed && (
                              <span className="text-[10px] font-medium text-slate-400">
                                সমাপ্ত
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* WEEKLY ROUTINE VIEW */
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-xs"
                            : isToday
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{day.name}</span>
                        {isToday && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {weeklyDayRoutines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-2">
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-bold text-slate-900">
                                {routine.subject_name}
                              </h5>
                              <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-700">
                                {classLabel(routine.class_name)}
                              </Badge>
                              {routine.division && (
                                <Badge variant="secondary" className="text-[10px] text-slate-600">
                                  {divisionLabel(routine.division)}
                                </Badge>
                              )}
                              {routine.period && (
                                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                                  {routine.period}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                {routine.teacher_photo_key ? (
                                  <img
                                    src={`/api/files/${routine.teacher_photo_key}`}
                                    alt={routine.teacher_name}
                                    className="h-4 w-4 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-bold">
                                    {routine.teacher_short_name || routine.teacher_name.slice(0, 2)}
                                  </span>
                                )}
                                <span className="font-semibold">{routine.teacher_name}</span>
                              </span>
                              {routine.room_no && (
                                <span className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                                  {routine.room_no}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 flex flex-col sm:items-end gap-1">
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
                আজ আর এই পপ-আপ দেখাবেন না
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
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-5 h-9 shadow-xs"
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
