"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Printer,
  Sparkles,
  CheckCircle2,
  Layers,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  AlertCircle,
  Copy,
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
import { useToast } from "@/hooks/use-toast";
import { CLASS_NUMBERS, DAYS_OF_WEEK, bn, classLabel, getDayNameBn } from "@/lib/constants";
import { RoutineItem } from "@/components/app/today-routine-modal";

const TIME_PRESETS = [
  { start: "09:00 AM", end: "10:00 AM" },
  { start: "10:00 AM", end: "11:00 AM" },
  { start: "11:05 AM", end: "12:05 PM" },
  { start: "12:10 PM", end: "01:10 PM" },
  { start: "02:00 PM", end: "03:00 PM" },
  { start: "03:05 PM", end: "04:05 PM" },
  { start: "04:10 PM", end: "05:10 PM" },
];

export const PERIOD_PRESETS = [
  { id: "1", name: "১ম পিরিয়ড", short: "১ম", start: "09:00 AM", end: "10:00 AM" },
  { id: "2", name: "২য় পিরিয়ড", short: "২য়", start: "10:00 AM", end: "11:00 AM" },
  { id: "3", name: "৩য় পিরিয়ড", short: "৩য়", start: "11:05 AM", end: "12:05 PM" },
  { id: "4", name: "৪র্থ পিরিয়ড", short: "৪র্থ", start: "12:10 PM", end: "01:10 PM" },
  { id: "5", name: "৫ম পিরিয়ড", short: "৫ম", start: "02:00 PM", end: "03:00 PM" },
  { id: "6", name: "৬ষ্ঠ পিরিয়ড", short: "৬ষ্ঠ", start: "03:05 PM", end: "04:05 PM" },
  { id: "7", name: "৭ম পিরিয়ড", short: "৭ম", start: "04:10 PM", end: "05:10 PM" },
  { id: "8", name: "৮ম পিরিয়ড", short: "৮ম", start: "05:15 PM", end: "06:15 PM" },
];

export function AdminRoutineManager() {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [teachers, setTeachers] = useState<{ id: number; name: string; short_name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string; class_name: string; division: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  // Filters
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formDay, setFormDay] = useState<string>("6"); // Saturday default
  const [formClass, setFormClass] = useState<string>("10");
  const [formDivision, setFormDivision] = useState<string>("SCIENCE");
  const [formSection, setFormSection] = useState<string>("ক");
  const [formSubjectName, setFormSubjectName] = useState<string>("");
  const [formTeacherId, setFormTeacherId] = useState<string>("");
  const [formTeacherName, setFormTeacherName] = useState<string>("");
  const [customTeacherMode, setCustomTeacherMode] = useState<boolean>(false);
  const [formPeriod, setFormPeriod] = useState<string>("১ম পিরিয়ড");
  const [formStartTime, setFormStartTime] = useState<string>("09:00 AM");
  const [formEndTime, setFormEndTime] = useState<string>("10:00 AM");
  const [formRoomNo, setFormRoomNo] = useState<string>("রুম ১০১");
  const [formNote, setFormNote] = useState<string>("");

  // Quick Add Teacher Modal State
  const [addTeacherModalOpen, setAddTeacherModalOpen] = useState<boolean>(false);
  const [newTeacherName, setNewTeacherName] = useState<string>("");
  const [newTeacherShortName, setNewTeacherShortName] = useState<string>("");
  const [newTeacherUsername, setNewTeacherUsername] = useState<string>("");
  const [newTeacherPassword, setNewTeacherPassword] = useState<string>("");
  const [addingTeacher, setAddingTeacher] = useState<boolean>(false);

  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routines");
      const json = await res.json();
      if (json.ok) {
        setRoutines(json.routines || []);
        setTeachers(json.teachers || []);
        setSubjects(json.subjects || []);
      }
    } catch (e) {
      toast({ title: "রুটিন লোড করতে ব্যর্থ হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormDay("6");
    setFormClass("10");
    setFormDivision("SCIENCE");
    setFormSection("ক");
    setFormSubjectName("");
    setFormPeriod("১ম পিরিয়ড");
    setFormTeacherId(teachers[0]?.id ? String(teachers[0].id) : "");
    setFormTeacherName(teachers[0]?.name || "");
    setCustomTeacherMode(false);
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormRoomNo("রুম ১০১");
    setFormNote("");
    setModalOpen(true);
  };

  const openEditModal = (r: RoutineItem) => {
    setEditingId(r.id);
    setFormDay(String(r.day_of_week));
    setFormClass(r.class_name);
    setFormDivision(r.division || "NONE");
    setFormSection(r.section || "");
    setFormSubjectName(r.subject_name);
    setFormPeriod(r.period || "১ম পিরিয়ড");

    // Auto-match teacher to ensure selection loads properly
    const matched = r.teacher_id
      ? teachers.find((t) => t.id === r.teacher_id)
      : teachers.find((t) => t.name === r.teacher_name || t.short_name === r.teacher_name);

    setFormTeacherId(matched ? String(matched.id) : (r.teacher_id ? String(r.teacher_id) : ""));
    setFormTeacherName(r.teacher_name || matched?.name || "");
    if (!matched && r.teacher_name) {
      setCustomTeacherMode(true);
    } else {
      setCustomTeacherMode(false);
    }
    setFormStartTime(r.start_time);
    setFormEndTime(r.end_time);
    setFormRoomNo(r.room_no || "");
    setFormNote(r.note || "");
    setModalOpen(true);
  };

  const handleTeacherChange = (tidStr: string) => {
    setFormTeacherId(tidStr);
    const found = teachers.find((t) => String(t.id) === tidStr);
    if (found) {
      setFormTeacherName(found.name);
    }
  };

  const handleQuickAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) {
      toast({ title: "শিক্ষকের নাম আবশ্যক", variant: "destructive" });
      return;
    }
    if (!newTeacherUsername.trim()) {
      toast({ title: "ইউজারনেম আবশ্যক", variant: "destructive" });
      return;
    }
    if (!newTeacherPassword.trim()) {
      toast({ title: "পাসওয়ার্ড আবশ্যক", variant: "destructive" });
      return;
    }

    setAddingTeacher(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeacherName.trim(),
          shortName: newTeacherShortName.trim() || newTeacherName.trim().slice(0, 3).toUpperCase(),
          username: newTeacherUsername.trim(),
          password: newTeacherPassword.trim(),
          subjectIds: [],
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        toast({ title: "শিক্ষক সফলভাবে যুক্ত করা হয়েছে!" });
        setAddTeacherModalOpen(false);
        // Refresh routines & teachers
        const rRes = await fetch("/api/routines");
        const rJson = await rRes.json();
        if (rJson.ok) {
          setTeachers(rJson.teachers || []);
          const added = rJson.teachers?.find((t: any) => t.name === newTeacherName.trim());
          if (added) {
            setFormTeacherId(String(added.id));
            setFormTeacherName(added.name);
          } else {
            setFormTeacherName(newTeacherName.trim());
          }
          setCustomTeacherMode(false);
        }
        setNewTeacherName("");
        setNewTeacherShortName("");
        setNewTeacherUsername("");
        setNewTeacherPassword("");
      } else {
        toast({ title: json.error || "শিক্ষক যুক্ত করা যায়নি", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভার এরর", variant: "destructive" });
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectName.trim()) {
      toast({ title: "বিষয়ের নাম আবশ্যক", variant: "destructive" });
      return;
    }
    if (!formTeacherName.trim()) {
      toast({ title: "শিক্ষকের নাম আবশ্যক", variant: "destructive" });
      return;
    }
    if (!formStartTime.trim() || !formEndTime.trim()) {
      toast({ title: "শুরু ও শেষের সময় আবশ্যক", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: editingId,
        dayOfWeek: parseInt(formDay, 10),
        className: formClass,
        division: formDivision === "NONE" ? null : formDivision,
        section: formSection.trim() || null,
        subjectName: formSubjectName.trim(),
        teacherId: formTeacherId ? parseInt(formTeacherId, 10) : null,
        teacherName: formTeacherName.trim(),
        period: formPeriod.trim() || null,
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim(),
        roomNo: formRoomNo.trim() || null,
        note: formNote.trim() || null,
        isActive: 1,
      };

      const res = await fetch("/api/routines", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        toast({ title: json.message || "রুটিন সংরক্ষিত হয়েছে!" });
        setModalOpen(false);
        loadData();
      } else {
        toast({ title: json.error || "সংরক্ষণ করতে ব্যর্থ হয়েছে", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভার এরর", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("আপনি কি নিশ্চিত এই ক্লাস রুটিন মুছে ফেলতে চান?")) return;
    try {
      const res = await fetch(`/api/routines?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.ok) {
        toast({ title: "ক্লাস রুটিন মুছে ফেলা হয়েছে" });
        loadData();
      } else {
        toast({ title: json.error || "মুছতে ব্যর্থ", variant: "destructive" });
      }
    } catch {
      toast({ title: "মুছতে ব্যর্থ হয়েছে", variant: "destructive" });
    }
  };

  // Filtered routines
  const filteredRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (filterDay !== "all" && String(r.day_of_week) !== filterDay) return false;
      if (filterClass !== "all" && r.class_name !== filterClass) return false;
      if (filterTeacher !== "all" && String(r.teacher_id) !== filterTeacher) return false;
      if (filterPeriod !== "all") {
        if (r.period !== filterPeriod && !r.period?.includes(filterPeriod)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = r.subject_name.toLowerCase().includes(q);
        const matchTea = r.teacher_name.toLowerCase().includes(q);
        const matchRoom = r.room_no?.toLowerCase().includes(q);
        const matchPeriod = r.period?.toLowerCase().includes(q);
        if (!matchSub && !matchTea && !matchRoom && !matchPeriod) return false;
      }
      return true;
    });
  }, [routines, filterDay, filterClass, filterTeacher, filterPeriod, searchQuery]);

  const todayDayOfWeek = new Date().getDay();
  const todayClassesCount = routines.filter((r) => r.day_of_week === todayDayOfWeek).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                একাডেমিক ক্লাস রুটিন ব্যবস্থাপনা
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                সাপ্তাহিক ও দৈনিক ক্লাস শিডিউল তৈরি, সম্পাদন ও নিয়ন্ত্রণ করুন
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 h-9 sm:h-10 text-xs sm:text-sm font-bold"
          >
            <Printer className="h-4 w-4" />
            রুটিন প্রিন্ট
          </Button>
          <Button
            type="button"
            onClick={openAddModal}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-9 sm:h-10 text-xs sm:text-sm shadow-xs"
          >
            <Plus className="h-4 w-4" />
            নতুন ক্লাস যুক্ত করুন
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">মোট শিডিউলড ক্লাস</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{bn(routines.length)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700">আজকের ক্লাস ({getDayNameBn(todayDayOfWeek)})</span>
          <p className="text-2xl font-black text-emerald-800 mt-1">{bn(todayClassesCount)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">অন্তর্ভুক্ত শিক্ষক</span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{bn(teachers.length)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">অন্তর্ভুক্ত শ্রেণী</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{bn(CLASS_NUMBERS.length)}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filter Day */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">দিন নির্বাচন</Label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="সব দিন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল দিন (শনি - শুক্র)</SelectItem>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} {d.id === todayDayOfWeek ? "(আজ)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Class */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">শ্রেণী নির্বাচন</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-9 text-xs">
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

            {/* Filter Period */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">পিরিয়ড</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="সব পিরিয়ড" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল পিরিয়ড</SelectItem>
                  {PERIOD_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Teacher */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">শিক্ষক নির্বাচন</Label>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="h-9 text-xs">
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

            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">অনুসন্ধান</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="বিষয়, শিক্ষক, রুম..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              দেখাচ্ছে: <b>{bn(filteredRoutines.length)}</b> টি ক্লাস
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === "TABLE" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                টেবিল ভিউ
              </button>
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === "GRID" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                সাপ্তাহিক গ্রিড
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routine Content */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="mt-2 text-xs text-slate-500">ক্লাস রুটিন লোড হচ্ছে...</p>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <CalendarDays className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">কোনো ক্লাস রুটিন পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            নির্বাচিত ফিল্টারের অধীনে কোনো ক্লাস নেই অথবা এখনো রুটিন তৈরি করা হয়নি।
          </p>
          <Button
            type="button"
            onClick={openAddModal}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
          >
            <Plus className="h-4 w-4" />
            প্রথম ক্লাস রুটিন যোগ করুন
          </Button>
        </div>
      ) : viewMode === "TABLE" ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">বার / দিন</th>
                  <th className="px-4 py-3">সময়সূচি</th>
                  <th className="px-4 py-3">শ্রেণী ও শাখা</th>
                  <th className="px-4 py-3">বিষয়</th>
                  <th className="px-4 py-3">শিক্ষক</th>
                  <th className="px-4 py-3">কক্ষ / রুম</th>
                  <th className="px-4 py-3">নোট</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoutines.map((r) => {
                  const isToday = r.day_of_week === todayDayOfWeek;
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isToday ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {getDayNameBn(r.day_of_week)}
                          {isToday && (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                              আজ
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {r.start_time} – {r.end_time}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-800">{classLabel(r.class_name)}</span>
                          {r.division && (
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                              {r.division === "SCIENCE" ? "বিজ্ঞান" : "মানবিক"}
                            </Badge>
                          )}
                          {r.section && (
                            <span className="text-slate-500 text-[11px]">({r.section})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{r.subject_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.teacher_photo_key ? (
                            <img
                              src={`/api/files/${r.teacher_photo_key}`}
                              alt={r.teacher_name}
                              className="h-5 w-5 rounded-full object-cover border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                              {r.teacher_short_name || r.teacher_name.slice(0, 2)}
                            </span>
                          )}
                          <span className="font-semibold text-slate-800">{r.teacher_name}</span>
                          {r.teacher_short_name && (
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded">
                              {r.teacher_short_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">
                        {r.room_no ? (
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                            <DoorOpen className="h-3 w-3 text-slate-400" />
                            {r.room_no}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate">
                        {r.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(r)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(r.id)}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* WEEKLY GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS_OF_WEEK.map((d) => {
              const dayRoutines = routines.filter((r) => r.day_of_week === d.id);
              const isToday = d.id === todayDayOfWeek;

              return (
                <div
                  key={d.id}
                  className={`rounded-2xl border p-4 shadow-2xs transition ${
                    isToday
                      ? "border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                      {isToday && (
                        <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                          আজ
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {bn(dayRoutines.length)} ক্লাস
                    </span>
                  </div>

                  {dayRoutines.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      কোনো ক্লাস নির্ধারিত নেই
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayRoutines.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs text-xs space-y-1 hover:border-slate-300 transition"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                            <span className="font-bold text-slate-800">{r.start_time} - {r.end_time}</span>
                            <span className="font-semibold text-indigo-700">{classLabel(r.class_name)}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                            <span>{r.subject_name}</span>
                            {r.room_no && (
                              <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                                {r.room_no}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {r.teacher_photo_key ? (
                                <img
                                  src={`/api/files/${r.teacher_photo_key}`}
                                  alt={r.teacher_name}
                                  className="h-4 w-4 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold">
                                  {r.teacher_short_name || r.teacher_name.slice(0, 2)}
                                </span>
                              )}
                              <span className="font-medium truncate">{r.teacher_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(r)}
                                className="text-slate-400 hover:text-slate-800 p-0.5"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id)}
                                className="text-rose-400 hover:text-rose-700 p-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Routine Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {editingId ? "ক্লাস রুটিন সম্পাদন করুন" : "নতুন ক্লাস রুটিন যুক্ত করুন"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              সাপ্তাহিক রুটিনে নির্দিষ্ট শ্রেণী ও শিক্ষকের ক্লাসের সময়সূচি নির্ধারণ করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Day of week */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">বার / দিন *</Label>
                <Select value={formDay} onValueChange={setFormDay}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">শ্রেণী *</Label>
                <Select value={formClass} onValueChange={setFormClass}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_NUMBERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {classLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Division & Section (for 9/10) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">বিভাগ</Label>
                <Select value={formDivision} onValueChange={setFormDivision}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">সাধারণ / প্রযোজ্য নয়</SelectItem>
                    <SelectItem value="SCIENCE">বিজ্ঞান (Science)</SelectItem>
                    <SelectItem value="HUMANITIES">মানবিক (Humanities)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">শাখা (ঐচ্ছিক)</Label>
                <Input
                  placeholder="যেমন: ক, খ"
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">বিষয়ের নাম *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="যেমন: পদার্থবিজ্ঞান, সাধারণ গণিত..."
                  value={formSubjectName}
                  onChange={(e) => setFormSubjectName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
                {/* Quick suggestions from existing subjects for this class */}
                {subjects.filter((s) => s.class_name === formClass).length > 0 && (
                  <Select
                    onValueChange={(val) => setFormSubjectName(val)}
                  >
                    <SelectTrigger className="h-9 text-xs w-[110px] shrink-0">
                      <SelectValue placeholder="সিলেক্ট" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects
                        .filter((s) => s.class_name === formClass)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Teacher Selection with quick add and custom name support */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">শিক্ষক *</Label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomTeacherMode(!customTeacherMode)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline font-medium cursor-pointer"
                  >
                    {customTeacherMode ? "তালিকা থেকে বাছুন" : "কাস্টম নাম লিখুন"}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAddTeacherModalOpen(true)}
                    className="h-6 px-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 gap-1"
                  >
                    <Plus className="h-3 w-3" /> শিক্ষক যোগ
                  </Button>
                </div>
              </div>

              {customTeacherMode ? (
                <Input
                  placeholder="শিক্ষকের নাম লিখুন (যেমন: মো: আরিফুল ইসলাম)"
                  value={formTeacherName}
                  onChange={(e) => setFormTeacherName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              ) : (
                <Select value={formTeacherId} onValueChange={handleTeacherChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="শিক্ষক নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.short_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Period Selection [১ম / ২য় / ৩য় / ৪র্থ / ৫ম / ৬ষ্ঠ / ৭ম / ৮ম] */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  পিরিয়ড (Period) *
                </Label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  [১ম / ২য় / ৩য় / ৪র্থ ...]
                </span>
              </div>

              {/* Quick Period Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((p) => {
                  const isSelected = formPeriod === p.name || formPeriod === p.short;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormPeriod(p.name);
                        setFormStartTime(p.start);
                        setFormEndTime(p.end);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 border cursor-pointer ${
                        isSelected
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                          : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border-slate-200"
                      }`}
                    >
                      <span>{p.short}</span>
                      <span className="text-[10px] opacity-75 hidden sm:inline">({p.name})</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setFormPeriod("টিফিন বিরতি");
                    setFormStartTime("01:10 PM");
                    setFormEndTime("02:00 PM");
                  }}
                  className={`text-xs px-2 py-1 rounded-lg font-medium transition border cursor-pointer ${
                    formPeriod.includes("টিফিন")
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-white text-slate-600 hover:bg-amber-50 border-slate-200"
                  }`}
                >
                  টিফিন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormPeriod("প্র্যাকটিক্যাল");
                  }}
                  className={`text-xs px-2 py-1 rounded-lg font-medium transition border cursor-pointer ${
                    formPeriod.includes("প্র্যাকটিক্যাল")
                      ? "bg-purple-600 text-white border-purple-700"
                      : "bg-white text-slate-600 hover:bg-purple-50 border-slate-200"
                  }`}
                >
                  প্র্যাকটিক্যাল
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium shrink-0">পিরিয়ড নাম:</span>
                <Input
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  placeholder="যেমন: ১ম পিরিয়ড"
                  className="h-8 text-xs font-semibold bg-white"
                  required
                />
              </div>
            </div>

            {/* Start and End Times with presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">ক্লাসের সময়সূচি *</Label>
                <span className="text-[11px] text-slate-500">কুইক সময় প্রিসেট</span>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {TIME_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormStartTime(p.start);
                      setFormEndTime(p.end);
                    }}
                    className="text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    {p.start}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500">শুরুর সময়</span>
                  <Input
                    placeholder="10:00 AM"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">শেষের সময়</span>
                  <Input
                    placeholder="11:00 AM"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Room & Note */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">কক্ষ / রুম নং</Label>
                <Input
                  placeholder="যেমন: রুম ১০১, বিজ্ঞান ল্যাব"
                  value={formRoomNo}
                  onChange={(e) => setFormRoomNo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">নোট (ঐচ্ছিক)</Label>
                <Input
                  placeholder="যেমন: অধ্যায় ভিত্তিক প্র্যাকটিস"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs h-9"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "আপডেট করুন" : "যুক্ত করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Teacher Modal */}
      <Dialog open={addTeacherModalOpen} onOpenChange={setAddTeacherModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              নতুন শিক্ষক যুক্ত করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              রুটিনে ক্লাস এসাইন করার জন্য দ্রুত নতুন শিক্ষক অ্যাকাউন্ট তৈরি করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddTeacher} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">শিক্ষকের পূর্ণ নাম *</Label>
              <Input
                placeholder="যেমন: মো: আরিফুল ইসলাম"
                value={newTeacherName}
                onChange={(e) => {
                  setNewTeacherName(e.target.value);
                  if (!newTeacherShortName) {
                    const initials = e.target.value
                      .trim()
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 4)
                      .toUpperCase();
                    setNewTeacherShortName(initials);
                  }
                  if (!newTeacherUsername) {
                    const translit = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "");
                    setNewTeacherUsername(translit ? `${translit}${Math.floor(10 + Math.random() * 90)}` : "");
                  }
                }}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">সংক্ষিপ্ত নাম / কোড</Label>
                <Input
                  placeholder="যেমন: AI বা ARIF"
                  value={newTeacherShortName}
                  onChange={(e) => setNewTeacherShortName(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">ইউজারনেম (লগইন) *</Label>
                <Input
                  placeholder="যেমন: ariful10"
                  value={newTeacherUsername}
                  onChange={(e) => setNewTeacherUsername(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">পাসওয়ার্ড *</Label>
              <Input
                type="password"
                placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                value={newTeacherPassword}
                onChange={(e) => setNewTeacherPassword(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTeacherModalOpen(false)}
                className="text-xs h-9"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={addingTeacher}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 cursor-pointer"
              >
                {addingTeacher && <Loader2 className="h-4 w-4 animate-spin" />}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
