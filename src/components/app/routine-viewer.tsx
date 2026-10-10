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
import { CLASS_NUMBERS, DAYS_OF_WEEK, bn, classLabel, getDayNameBn } from "@/lib/constants";
import { RoutineItem } from "@/components/app/today-routine-modal";

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
  role: "TEACHER" | "STUDENT" | "DIRECTOR";
}) {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string; short_name: string; photo_key?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("today");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [userContext, setUserContext] = useState<any>(null);

  const now = new Date();
  const todayDayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/routines");
        const json = await res.json();
        if (json.ok) {
          setRoutines(json.routines || []);
          setTeachers(json.teachers || []);
          setUserContext(json.userContext || null);
          if (json.userContext?.studentClass) {
            setSelectedClass(json.userContext.studentClass);
          }
        }
      } catch (err) {
        console.error("Failed to load routines", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeDayNumber = selectedDay === "today" ? todayDayOfWeek : selectedDay === "all" ? null : parseInt(selectedDay, 10);

  const filtered = useMemo(() => {
    return routines.filter((r) => {
      if (activeDayNumber !== null && r.day_of_week !== activeDayNumber) return false;
      if (role === "DIRECTOR" && selectedClass !== "all" && r.class_name !== selectedClass) return false;
      if (selectedTeacher !== "all") {
        const tid = parseInt(selectedTeacher, 10);
        if (!isNaN(tid)) {
          if (r.teacher_id === tid) return true;
          const matchTeacher = teachers.find((t) => t.id === tid);
          if (matchTeacher && (r.teacher_name.includes(matchTeacher.name) || r.teacher_name.includes(matchTeacher.short_name))) {
            return true;
          }
          return false;
        }
      }
      return true;
    });
  }, [routines, activeDayNumber, selectedClass, selectedTeacher, role, teachers]);

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

  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {isStudent ? "আমার ক্লাস রুটিন" : isTeacher ? "আমার পাঠদান রুটিন" : "একাডেমিক ক্লাস রুটিন"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isStudent && userContext?.studentClass
                  ? `শ্রেণী: ${classLabel(userContext.studentClass)}${userContext.studentDivision ? ` (${userContext.studentDivision})` : ""} — আপনার নির্ধারিত ক্লাসসমূহ`
                  : isTeacher
                  ? "সপ্তাহজুড়ে আপনার ক্লাস ও বিষয়ভিত্তিক দায়িত্বসমূহ"
                  : "একাডেমির সকল শ্রেণীর ক্লাস রুটিন বিবরণী"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 h-9 sm:h-10 text-xs sm:text-sm font-bold"
          >
            <Printer className="h-4 w-4" />
            রুটিন প্রিন্ট
          </Button>
        </div>
      </div>

      {/* Filter / Day Selector Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          {/* Day selection pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDay("today")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedDay === "today"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              আজকের ক্লাস ({getDayNameBn(todayDayOfWeek)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedDay === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              পুরো সপ্তাহ
            </button>
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDay(String(d.id))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedDay === String(d.id)
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Selectors: Class (for director) & Teacher */}
          <div className="flex flex-wrap items-center gap-2">
            {role === "DIRECTOR" && (
              <div className="w-[130px]">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-8 text-xs">
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

            {/* Teacher selector (available in RoutineViewer) */}
            <div className="w-[145px]">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="সব শিক্ষক" />
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
          </div>
        </CardContent>
      </Card>

      {/* Routine Cards List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="mt-2 text-xs text-slate-500">রুটিন লোড হচ্ছে...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
          <CalendarDays className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">কোনো ক্লাস নির্ধারিত নেই</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            নির্বাচিত দিনে কোনো ক্লাস সূচি পাওয়া যায়নি।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const status = getClassStatus(r.start_time, r.end_time, r.day_of_week);
            const isRunning = status === "RUNNING";
            const isUpcoming = status === "UPCOMING";

            return (
              <div
                key={r.id}
                className={`relative rounded-2xl border p-4 transition shadow-xs ${
                  isRunning
                    ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Status indicator */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <Badge variant="secondary" className="text-[11px] font-bold bg-slate-100 text-slate-800">
                    {getDayNameBn(r.day_of_week)}
                  </Badge>

                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
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
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span className="font-mono text-sm font-extrabold text-slate-900 tracking-tight">
                    {r.start_time} – {r.end_time}
                  </span>
                </div>

                {/* Subject */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-700 shrink-0" />
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {r.subject_name}
                    </h4>
                  </div>

                  {/* Class Badge */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                    <Badge variant="outline" className="font-bold text-[11px] border-slate-200 text-slate-800">
                      শ্রেণী: {classLabel(r.class_name)}
                    </Badge>
                    {r.division && (
                      <Badge variant="secondary" className="text-[10px] text-slate-600">
                        {r.division === "SCIENCE" ? "বিজ্ঞান" : "মানবিক"}
                      </Badge>
                    )}
                    {r.section && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        শাখা: {r.section}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher and Room */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
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

                  {r.room_no && (
                    <div className="flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
                      <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>{r.room_no}</span>
                    </div>
                  )}
                </div>

                {/* Note */}
                {r.note && (
                  <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    💡 {r.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
