"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Printer,
  Sparkles,
  Calendar,
  Filter,
  Layers,
  Loader2,
  CheckCircle2,
  User,
  School,
  AlertCircle,
  Eye,
  Check,
  Flame,
  ArrowRight,
  Search,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLASS_NUMBERS,
  DAYS_OF_WEEK,
  bn,
  classLabel,
  divisionLabel,
  getDayNameBn,
  getBangladeshDayOfWeek,
} from "@/lib/constants";
import { RoutineItem } from "@/components/app/today-routine-modal";
import { RoutineTopicModal } from "@/components/app/routine-topic-modal";

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

export function RoutineViewer({
  role,
}: {
  role: "TEACHER" | "STUDENT" | "DIRECTOR" | "ADMIN";
}) {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [teachers, setTeachers] = useState<
    { id: number; name: string; short_name: string; photo_key?: string | null }[]
  >([]);
  const [batches, setBatches] = useState<
    { id: number; name: string; class_id: number; class_name: string; division: string | null; time_slot: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDay, setSelectedDay] = useState<string>("today"); // 'today' | 'all' | '0'-'6'
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");

  // Context from server
  const [userContext, setUserContext] = useState<{
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
  } | null>(null);

  const now = new Date();
  const todayDayOfWeek = getBangladeshDayOfWeek();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/routines");
        if (res.status === 401) {
          setError("রুটিন দেখতে লগইন করা আবশ্যক। দয়া করে প্রথমে লগইন করুন।");
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (json.ok) {
          setRoutines(json.routines || []);
          setTeachers(json.teachers || []);
          setUserContext(json.userContext || null);
          if (json.batches) {
            setBatches(json.batches);
          } else {
            const bRes = await fetch("/api/batches").catch(() => null);
            const bJson = await bRes?.json().catch(() => null);
            if (bJson?.ok) setBatches(bJson.batches || []);
          }
        } else {
          setError(json.error || "রুটিন লোড করা যায়নি।");
        }
      } catch (err) {
        console.error("Failed to load routines", err);
        setError("রুটিন লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";
  const isDirector = role === "DIRECTOR";
  const isAdmin = role === "ADMIN";

  // Daily Topic modal state
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [selectedRoutineForTopic, setSelectedRoutineForTopic] = useState<RoutineItem | null>(null);

  const canEditTopic = (r: RoutineItem) => {
    if (isAdmin || isDirector) return true;
    if (!isTeacher) return false;
    if (userContext?.teacherId && r.teacher_id === userContext.teacherId) return true;
    if (userContext?.userName && r.teacher_name && r.teacher_name.toLowerCase().includes(userContext.userName.toLowerCase())) return true;
    if (userContext?.teacherShortName && (r.teacher_short_name === userContext.teacherShortName || r.teacher_name === userContext.teacherShortName)) return true;
    return false;
  };

  const openTopicModal = (r: RoutineItem) => {
    setSelectedRoutineForTopic(r);
    setTopicModalOpen(true);
  };

  const handleTopicSaved = (data: {
    routineId: number;
    date: string;
    chapterName: string | null;
    topicName: string;
    objectives: string | null;
    isDeleted?: boolean;
  }) => {
    setRoutines((prev) =>
      prev.map((item) => {
        if (item.id === data.routineId) {
          return {
            ...item,
            today_chapter: data.isDeleted ? null : data.chapterName,
            today_topic: data.isDeleted ? null : data.topicName,
            today_objectives: data.isDeleted ? null : data.objectives,
            topic_date: data.date,
          };
        }
        return item;
      })
    );
  };

  // Target day number for filtering
  const activeDayNumber =
    selectedDay === "today"
      ? todayDayOfWeek
      : selectedDay === "all"
      ? null
      : parseInt(selectedDay, 10);

  // Batches available under selected class
  const availableBatches = useMemo(() => {
    if (selectedClass === "all") return batches;
    return batches.filter((b) => b.class_name === selectedClass);
  }, [batches, selectedClass]);

  // Class filtering logic
  const filtered = useMemo(() => {
    return routines.filter((r) => {
      // 1. Day Filter
      if (activeDayNumber !== null && r.day_of_week !== activeDayNumber) {
        return false;
      }

      // 2. Student Role scoping (strictly locked to student's class and batch)
      if (isStudent) {
        if (userContext?.studentClass && r.class_name !== userContext.studentClass) {
          return false;
        }
        if (
          userContext?.studentDivision &&
          r.division &&
          r.division !== userContext.studentDivision
        ) {
          return false;
        }
        if (
          userContext?.studentSection &&
          r.section &&
          r.section !== userContext.studentSection
        ) {
          return false;
        }
        if (userContext?.studentBatchId || userContext?.studentBatchName) {
          const isCommon = !r.batch_id && !r.batch_name;
          const isMyBatch =
            (r.batch_id && r.batch_id === userContext.studentBatchId) ||
            (r.batch_name && r.batch_name === userContext.studentBatchName);
          if (!isCommon && !isMyBatch) return false;
        }
        return true;
      }

      // 3. Teacher Role scoping (strictly locked to teacher's own teaching schedule)
      if (isTeacher) {
        if (userContext?.teacherId) {
          const myTid = userContext.teacherId;
          const matchMyId = r.teacher_id === myTid;
          const matchMyName =
            userContext.userName &&
            (r.teacher_name.includes(userContext.userName) ||
              r.teacher_name.includes(userContext.userName.split(" ")[0]));
          const matchMyShort =
            userContext.teacherShortName &&
            (r.teacher_name.includes(userContext.teacherShortName) ||
              r.teacher_short_name === userContext.teacherShortName);

          if (!matchMyId && !matchMyName && !matchMyShort) return false;
        }
        return true;
      }

      // 4. Director / Admin scoping with management filters
      if (isDirector || isAdmin) {
        if (selectedClass !== "all" && r.class_name !== selectedClass) return false;
        if (selectedDivision !== "all" && r.division && r.division !== selectedDivision) return false;
        if (selectedBatch !== "all") {
          const matchesId = r.batch_id && String(r.batch_id) === selectedBatch;
          const matchesName = r.batch_name && r.batch_name === selectedBatch;
          if (!matchesId && !matchesName) return false;
        }
        if (selectedTeacher !== "all") {
          const tid = parseInt(selectedTeacher, 10);
          if (!isNaN(tid)) {
            if (r.teacher_id !== tid) {
              const matchTeacher = teachers.find((t) => t.id === tid);
              if (
                !matchTeacher ||
                (!r.teacher_name.includes(matchTeacher.name) &&
                  !r.teacher_name.includes(matchTeacher.short_name))
              ) {
                return false;
              }
            }
          }
        }
      }

      return true;
    });
  }, [
    routines,
    activeDayNumber,
    isStudent,
    isTeacher,
    isDirector,
    isAdmin,
    selectedClass,
    selectedBatch,
    selectedDivision,
    selectedTeacher,
    userContext,
    teachers,
  ]);

  // Live status calculation
  const getClassStatus = (startTime: string, endTime: string, dayOfWeek: number) => {
    if (dayOfWeek !== todayDayOfWeek) return "OTHER_DAY";
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (startMin === null || endMin === null) return "UNKNOWN";

    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      return "RUNNING";
    } else if (currentMinutes < startMin) {
      return "UPCOMING";
    } else {
      return "PASSED";
    }
  };

  // Stats for today
  const todayClassesTotal = useMemo(() => {
    return routines.filter((r) => r.day_of_week === todayDayOfWeek).length;
  }, [routines, todayDayOfWeek]);

  const runningNowCount = useMemo(() => {
    return routines.filter((r) => {
      if (r.day_of_week !== todayDayOfWeek) return false;
      const s = getClassStatus(r.start_time, r.end_time, r.day_of_week);
      return s === "RUNNING";
    }).length;
  }, [routines, todayDayOfWeek, currentMinutes]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-800">{error}</h3>
        <p className="text-xs text-red-600">
          রুটিন সুরক্ষিত রাখতে শুধুমাত্র অনুমোদিত লগইনকৃত ব্যবহারকারীগণ প্রবেশ করতে পারেন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {isStudent
                    ? "আমার ক্লাস রুটিন"
                    : isTeacher
                    ? "আমার পাঠদান রুটিন"
                    : "একাডেমিক ক্লাস রুটিন"}
                </h1>
                <Badge
                  variant="outline"
                  className="font-bold text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200"
                >
                  {isStudent ? "শিক্ষার্থী প্যানেল" : isTeacher ? "শিক্ষক প্যানেল" : "পরিদর্শক প্যানেল"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isStudent && userContext?.studentClass
                  ? `শ্রেণি: ${classLabel(userContext.studentClass)}${
                      userContext.studentDivision ? ` (${divisionLabel(userContext.studentDivision)})` : ""
                    }${userContext.studentSection ? ` • শাখা: ${userContext.studentSection}` : ""} • রোল: ${bn(
                      userContext.studentRoll ?? 0
                    )}`
                  : isTeacher && userContext?.userName
                  ? `শিক্ষক: ${userContext.userName} ${
                      userContext.teacherShortName ? `(${userContext.teacherShortName})` : ""
                    } — আপনার সাপ্তাহিক পাঠদান সূচি`
                  : "একাডেমির সকল শ্রেণির সময়সূচি, শিক্ষক বণ্টন ও ক্লাসরুম বিবরণী"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
            <BellRing className="h-3.5 w-3.5 text-emerald-600" />
            <span>১০ মিনিট পূর্বে ও শুরুর সময়ে নোটিফিকেশন সক্রিয়</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 h-9 sm:h-10 text-xs sm:text-sm font-bold shadow-2xs"
          >
            <Printer className="h-4 w-4" />
            রুটিন প্রিন্ট
          </Button>
        </div>
      </div>

      {/* 2. Role Specific Highlights & Overview Cards */}
      {isStudent && userContext?.studentClass && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs">
              {bn(userContext.studentClass)}
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                স্বাগতম, {userContext.userName || "শিক্ষার্থী"}!
              </p>
              <p className="text-[13px] font-bold text-emerald-800">
                আপনার নির্ধারিত শ্রেণি: {classLabel(userContext.studentClass)}
                {userContext.studentDivision ? ` (${divisionLabel(userContext.studentDivision)})` : ""}
                {userContext.studentSection ? ` • শাখা: ${userContext.studentSection}` : ""}
                {userContext.studentRoll ? ` • রোল: ${bn(userContext.studentRoll)}` : ""}
                {userContext.studentBatchName ? ` • ব্যাচ: ${userContext.studentBatchName}` : ""}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 self-start sm:self-auto">
            শুধু আপনার শ্রেণির রুটিন
          </Badge>
        </div>
      )}

      {isTeacher && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-900">
                শিক্ষক প্যানেল — {userContext?.userName} {userContext?.teacherShortName ? `(${userContext.teacherShortName})` : ""}
              </p>
              <p className="text-[13px] font-bold text-indigo-800">
                আপনার দায়িত্বপ্রাপ্ত পাঠদান ক্লাস রুটিন
              </p>
            </div>
          </div>
          <Badge className="bg-indigo-600 text-white font-bold text-xs px-3 py-1 self-start sm:self-auto">
            ব্যক্তিগত পাঠদান সূচি
          </Badge>
        </div>
      )}

      {(isDirector || isAdmin) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">মোট সাপ্তাহিক ক্লাস</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{bn(routines.length)} টি</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700">আজকের ক্লাস ({getDayNameBn(todayDayOfWeek)})</span>
            <p className="text-xl font-black text-emerald-800 mt-0.5">{bn(todayClassesTotal)} টি</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700">বর্তমানে চলমান ক্লাস</span>
            <p className="text-xl font-black text-amber-800 mt-0.5">{bn(runningNowCount)} টি</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">নিযুক্ত শিক্ষক</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{bn(teachers.length)} জন</p>
          </div>
        </div>
      )}

      {/* 3. Filter & Day Selector Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Day selection tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {/* Today Pill */}
              <button
                type="button"
                onClick={() => setSelectedDay("today")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedDay === "today"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>আজকের রুটিন</span>
                <span className="text-[10px] bg-black/15 px-1.5 py-0.2 rounded-full">
                  {getDayNameBn(todayDayOfWeek)}
                </span>
              </button>

              {/* Full Week Pill */}
              <button
                type="button"
                onClick={() => setSelectedDay("all")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedDay === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>পুরো সপ্তাহ</span>
              </button>

              {/* Individual Days */}
              {DAYS_OF_WEEK.map((d) => {
                const isToday = d.id === todayDayOfWeek;
                const isSelected = selectedDay === String(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDay(String(d.id))}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : isToday
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{d.name}</span>
                    {isToday && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-2">
              <span>মোট প্রদর্শিত ক্লাস:</span>
              <Badge variant="secondary" className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800">
                {bn(filtered.length)} টি
              </Badge>
            </div>
          </div>

          {/* Secondary Dropdown Filters: ONLY shown to Director and Admin */}
          {(isDirector || isAdmin) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Class Filter */}
              <div className="w-[145px]">
                <Select
                  value={selectedClass}
                  onValueChange={(val) => {
                    setSelectedClass(val);
                    setSelectedBatch("all");
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
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

              {/* Batch Filter (Under Selected Class) */}
              <div className="w-[160px]">
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="সকল ব্যাচ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {selectedClass !== "all" ? `সকল ব্যাচ (${classLabel(selectedClass)})` : "সকল ব্যাচ (উন্মুক্ত)"}
                    </SelectItem>
                    {availableBatches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} {selectedClass === "all" ? `(${classLabel(b.class_name)})` : ""} {b.time_slot ? `[${b.time_slot}]` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Division Filter */}
              <div className="w-[130px]">
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="সব বিভাগ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল বিভাগ</SelectItem>
                    <SelectItem value="SCIENCE">বিজ্ঞান বিভাগ</SelectItem>
                    <SelectItem value="HUMANITIES">মানবিক বিভাগ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Teacher selector */}
              <div className="w-[160px]">
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="সকল শিক্ষক" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল শিক্ষক</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.short_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDay("today");
                  setSelectedClass("all");
                  setSelectedBatch("all");
                  setSelectedDivision("all");
                  setSelectedTeacher("all");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 h-9"
              >
                ফিল্টার রিসেট
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Routine Cards Grid / Status view */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="mt-2 text-xs text-slate-500 font-medium">ক্লাস রুটিন লোড হচ্ছে...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <CalendarDays className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">কোনো ক্লাস নির্ধারিত নেই</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {selectedDay === "today"
              ? todayDayOfWeek === 5
                ? "আজ শুক্রবার — সাপ্তাহিক ছুটির দিন। পুরো সপ্তাহের ক্লাস সূচি দেখতে উপরের 'পুরো সপ্তাহ' বাটনে ক্লিক করুন।"
                : "নির্বাচিত ফিল্টার অনুসারে আজকের দিনে কোনো ক্লাসের তথ্য পাওয়া যায়নি।"
              : "নির্বাচিত দিনে এই ফিল্টারের জন্য কোনো ক্লাস সূচি পাওয়া যায়নি।"}
          </p>
          {selectedDay === "today" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDay("all")}
              className="gap-2 text-xs font-bold border-slate-300 text-slate-700"
            >
              <Calendar className="h-3.5 w-3.5" />
              পুরো সপ্তাহের রুটিন দেখুন
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const status = getClassStatus(r.start_time, r.end_time, r.day_of_week);
            const isRunning = status === "RUNNING";
            const isUpcoming = status === "UPCOMING";
            const isPassed = status === "PASSED";

            return (
              <div
                key={r.id}
                className={`relative rounded-2xl border p-4 transition duration-150 shadow-xs flex flex-col justify-between ${
                  isRunning
                    ? "bg-emerald-50/95 border-emerald-400 ring-2 ring-emerald-500/25 shadow-md"
                    : isUpcoming
                    ? "bg-white border-indigo-200 hover:border-indigo-300"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Header: Day Badge, Period Badge & Live Status */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] font-bold ${
                          r.day_of_week === todayDayOfWeek
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {getDayNameBn(r.day_of_week)}
                      </Badge>
                      {r.period && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200"
                        >
                          {r.period}
                        </Badge>
                      )}
                    </div>

                    {/* Real-time Status Badge */}
                    {isRunning && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                        </span>
                        চলমান ক্লাস
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        আসন্ন ক্লাস
                      </span>
                    )}
                    {isPassed && selectedDay === "today" && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        সম্পন্ন
                      </span>
                    )}
                  </div>

                  {/* Class Time */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Clock
                      className={`h-4 w-4 ${isRunning ? "text-emerald-700" : "text-emerald-600"}`}
                    />
                    <span className="font-mono text-sm font-black text-slate-900 tracking-tight">
                      {r.start_time} – {r.end_time}
                    </span>
                  </div>

                  {/* Subject Details */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-700 shrink-0" />
                      <h4 className="text-base font-bold text-slate-900 tracking-tight">
                        {r.subject_name}
                      </h4>
                    </div>

                    {/* Class & Division Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                      <Badge
                        variant="outline"
                        className="font-bold text-[11px] border-slate-200 text-slate-800"
                      >
                        শ্রেণি: {classLabel(r.class_name)}
                      </Badge>
                      {r.division && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold text-slate-700 bg-slate-100"
                        >
                          {divisionLabel(r.division)}
                        </Badge>
                      )}
                      {r.section && (
                        <span className="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded">
                          শাখা: {r.section}
                        </span>
                      )}
                      {r.batch_name && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-violet-50 text-violet-700 border-violet-200"
                        >
                          ব্যাচ: {r.batch_name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Today's Lesson / Topic (অধ্যায় ও বিষয়বস্তু) */}
                  {(r.today_topic || r.today_chapter) ? (
                    <div className="mt-3 p-3 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-teal-50/80 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                          <BookOpen className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          আজকের পাঠ / ক্লাসের টপিক
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                          শিক্ষকের আপডেট
                        </span>
                      </div>
                      {r.today_chapter && (
                        <p className="text-xs font-black text-emerald-950 flex items-baseline gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-700 shrink-0">অধ্যায়:</span>
                          <span>{r.today_chapter}</span>
                        </p>
                      )}
                      {r.today_topic && (
                        <p className="text-xs font-semibold text-slate-800 flex items-baseline gap-1.5">
                          <span className="text-[11px] font-bold text-teal-700 shrink-0">টপিক:</span>
                          <span className="text-slate-900 font-bold">{r.today_topic}</span>
                        </p>
                      )}
                      {r.today_objectives && (
                        <div className="text-[11px] text-emerald-950 bg-white/90 p-2 rounded-lg border border-emerald-100 mt-1 flex items-start gap-1.5 leading-relaxed">
                          <span className="shrink-0 font-bold text-xs">📝</span>
                          <span className="italic">{r.today_objectives}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>আজকের পাঠ:</span>
                        <span className="text-slate-400 italic">টপিক এখনও নির্ধারিত হয়নি</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Teacher, Room and Notes */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Teacher profile */}
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      {r.teacher_photo_key ? (
                        <img
                          src={`/api/files/${r.teacher_photo_key}`}
                          alt={r.teacher_name}
                          className="h-6 w-6 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {r.teacher_short_name || r.teacher_name.slice(0, 2)}
                        </span>
                      )}
                      <span className="font-semibold text-slate-800">{r.teacher_name}</span>
                      {r.teacher_short_name && (
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.teacher_short_name}
                        </span>
                      )}
                    </div>

                    {/* Room */}
                    {r.room_no && (
                      <div className="flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
                        <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                        <span>{r.room_no}</span>
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  {r.note && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                      💡 {r.note}
                    </p>
                  )}

                  {/* Teacher Action: Set/Edit Today's Lesson Topic */}
                  {canEditTopic(r) && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openTopicModal(r)}
                        className={`w-full h-8 text-xs font-bold gap-1.5 transition ${
                          r.today_topic || r.today_chapter
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {r.today_topic || r.today_chapter ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                            আজকের পাঠ / টপিক এডিট করুন
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                            আজকের পাঠ / টপিক লিখুন
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Routine Lesson Topic Modal */}
      <RoutineTopicModal
        isOpen={topicModalOpen}
        onClose={() => {
          setTopicModalOpen(false);
          setSelectedRoutineForTopic(null);
        }}
        routine={selectedRoutineForTopic}
        onSaved={handleTopicSaved}
      />
    </div>
  );
}
