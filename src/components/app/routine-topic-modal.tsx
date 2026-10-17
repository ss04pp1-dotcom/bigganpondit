"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { RoutineItem } from "@/components/app/today-routine-modal";
import { DAYS_OF_WEEK, classLabel, divisionLabel, todayISODateDhaka } from "@/lib/constants";

interface RoutineTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: RoutineItem | null;
  routines?: RoutineItem[];
  onSaved: (savedData: {
    routineId: number;
    updatedRoutineIds?: number[];
    date: string;
    chapterName: string | null;
    topicName: string;
    objectives: string | null;
    isDeleted?: boolean;
  }) => void;
  defaultDate?: string;
}

export function RoutineTopicModal({
  isOpen,
  onClose,
  routine,
  routines = [],
  onSaved,
  defaultDate,
}: RoutineTopicModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(defaultDate || todayISODateDhaka());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [allRoutines, setAllRoutines] = useState<RoutineItem[]>(routines);
  const [chapterName, setChapterName] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [objectives, setObjectives] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync routines list or fetch if not provided
  useEffect(() => {
    if (routines && routines.length > 0) {
      setAllRoutines(routines);
    } else if (isOpen) {
      fetch("/api/routines")
        .then((r) => r.json())
        .then((j) => {
          if (j?.ok && Array.isArray(j.routines)) {
            setAllRoutines(j.routines);
          }
        })
        .catch(() => null);
    }
  }, [routines, isOpen]);

  // Sync state when routine or modal opens
  useEffect(() => {
    if (routine && isOpen) {
      setDate(defaultDate || routine.topic_date || todayISODateDhaka());
      setSelectedDays(typeof routine.day_of_week === "number" ? [Number(routine.day_of_week)] : []);
      setChapterName(routine.today_chapter || "");
      setTopicName(routine.today_topic || "");
      setObjectives(routine.today_objectives || "");
      setError(null);
    }
  }, [routine, isOpen, defaultDate]);

  if (!routine) return null;

  // Compute all days of the week where this class + subject has a routine
  const matchingSubjectRoutines = allRoutines.filter(
    (r) =>
      r.class_name === routine.class_name &&
      r.subject_name === routine.subject_name &&
      (!routine.teacher_id || !r.teacher_id || Number(r.teacher_id) === Number(routine.teacher_id))
  );
  const classDayIds = Array.from(
    new Set([
      Number(routine.day_of_week),
      ...matchingSubjectRoutines.map((r) => Number(r.day_of_week)),
    ])
  ).filter((n) => !isNaN(n));

  const hasExistingTopic = Boolean(routine.today_topic || routine.today_chapter);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!routine) return;

    const trimmedTopic = topicName.trim();
    const trimmedChapter = chapterName.trim();

    if (!trimmedTopic && !trimmedChapter) {
      setError("দয়া করে অধ্যায়ের নাম অথবা আজকের ক্লাসের টপিক লিখুন।");
      return;
    }

    // Strictly filter out any off-days / days without class
    const validDays = selectedDays.filter((id) => classDayIds.includes(id));
    if (validDays.length === 0) {
      setError("যেদিন ক্লাস নেই বা বন্ধের দিন, সেদিন সিলেক্ট করা যাবে না। অনুগ্রহ করে আপনার নির্ধারিত ক্লাসের দিন নির্বাচন করুন।");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/routines/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineId: routine.id,
          date: date || todayISODateDhaka(),
          daysOfWeek: validDays,
          chapterName: trimmedChapter || null,
          topicName: trimmedTopic || trimmedChapter,
          objectives: objectives.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "পাঠ/টপিক সংরক্ষণ করা যায়নি।");
      }

      toast({
        title: "পাঠ/টপিক সফলভাবে সংরক্ষিত হয়েছে",
        description: json.message || "শিক্ষার্থীরা তাদের রুটিনে নির্ধারিত অধ্যায় ও পাঠের বিষয়বস্তু দেখতে পাবে।",
      });

      onSaved({
        routineId: routine.id,
        updatedRoutineIds: json.updatedRoutineIds || json.data?.updatedRoutineIds || [routine.id],
        date: date || todayISODateDhaka(),
        chapterName: trimmedChapter || null,
        topicName: trimmedTopic || trimmedChapter,
        objectives: objectives.trim() || null,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || "সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!routine) return;
    if (!confirm("আপনি কি আজকের এই ক্লাসের নির্ধারিত পাঠ/টপিক মুছে ফেলতে চান?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const targetDate = date || todayISODateDhaka();
      const res = await fetch(
        `/api/routines/topic?routineId=${routine.id}&date=${encodeURIComponent(targetDate)}`,
        { method: "DELETE" }
      );

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "মুছে ফেলা যায়নি।");
      }

      toast({
        title: "পাঠ/টপিক মুছে ফেলা হয়েছে",
      });

      onSaved({
        routineId: routine.id,
        updatedRoutineIds: [routine.id],
        date: targetDate,
        chapterName: null,
        topicName: "",
        objectives: null,
        isDeleted: true,
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || "মুছে ফেলতে সমস্যা হয়েছে।");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-2xl border-slate-200">
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-emerald-100" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                আজকের ক্লাসে কি পড়াবেন?
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100 mt-0.5">
                অধ্যায় ও টপিক নির্ধারণ করুন যেন শিক্ষার্থীরা ক্লাসের আগেই প্রস্তুত হতে পারে
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Routine Summary Header Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <BookOpen className="h-4 w-4 text-emerald-700" />
              <span>{routine.subject_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md font-mono text-[11px] font-bold">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>{routine.start_time} – {routine.end_time}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[11px] font-bold bg-white border-slate-200 text-slate-800">
              শ্রেণি: {classLabel(routine.class_name)}
            </Badge>
            {routine.division && (
              <Badge variant="secondary" className="text-[10px] bg-slate-200/80 text-slate-700">
                {divisionLabel(routine.division)}
              </Badge>
            )}
            {routine.section && (
              <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
                শাখা: {routine.section}
              </Badge>
            )}
            {routine.batch_name && (
              <Badge className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                ব্যাচ: {routine.batch_name}
              </Badge>
            )}
            {routine.room_no && (
              <span className="text-[11px] text-slate-500 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                রুম: {routine.room_no}
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Day of Week Selector — Strictly only class days, off days are disabled */}
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                ক্লাসের দিন নির্বাচন করুন (শুধু রুটিনের ক্লাসের দিন প্রযোজ্য)
              </label>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedDays(classDayIds)}
                  className="text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 px-2 py-0.5 rounded font-bold transition cursor-pointer"
                  title="আপনার ক্লাসের সব দিন সিলেক্ট করুন"
                >
                  ক্লাসের সব দিন ({classDayIds.length}টি)
                </button>
                {typeof routine.day_of_week === "number" && classDayIds.includes(Number(routine.day_of_week)) && (
                  <button
                    type="button"
                    onClick={() => setSelectedDays([Number(routine.day_of_week)])}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold underline decoration-dotted cursor-pointer"
                  >
                    শুধু আজকের দিন
                  </button>
                )}
                {selectedDays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDays([])}
                    className="text-rose-600 hover:text-rose-800 font-semibold underline decoration-dotted cursor-pointer"
                  >
                    রিসেট
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                const hasClassOnDay = classDayIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!hasClassOnDay}
                    onClick={() => {
                      if (!hasClassOnDay) return;
                      setSelectedDays((prev) =>
                        prev.includes(d.id)
                          ? prev.filter((id) => id !== d.id)
                          : [...prev, d.id]
                      );
                    }}
                    title={
                      hasClassOnDay
                        ? `${d.name}: ক্লাসের দিন`
                        : `${d.name}: বন্ধের দিন (এই দিন কোনো ক্লাস নেই, নির্বাচনযোগ্য নয়)`
                    }
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold border transition ${
                      !hasClassOnDay
                        ? "bg-slate-100/80 text-slate-400 border-dashed border-slate-200 cursor-not-allowed opacity-50 select-none"
                        : isSelected
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300 cursor-pointer"
                        : "bg-emerald-100/60 text-emerald-950 border-emerald-300 hover:bg-emerald-100 cursor-pointer"
                    }`}
                  >
                    <span>{d.name}</span>
                    <span
                      className={`text-[9px] mt-0.5 ${
                        !hasClassOnDay
                          ? "text-slate-400 font-normal"
                          : isSelected
                          ? "text-emerald-100 font-semibold"
                          : "text-emerald-700 font-bold"
                      }`}
                    >
                      {!hasClassOnDay ? "বন্ধ (ক্লাস নেই)" : isSelected ? "✓ নির্বাচিত" : "ক্লাস আছে"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-emerald-800/90">
              💡 <strong>নিয়ম:</strong> যে দিনগুলোতে রুটিনে ক্লাস নেই (বন্ধের দিন), সেগুলো নির্বাচন করা যাবে না। কেবল আপনার নির্ধারিত ক্লাসের দিনগুলো ({classDayIds.map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.name).filter(Boolean).join(", ") || "কোনো দিন নেই"}) থেকে সিলেক্ট করতে পারবেন।
            </p>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                ক্লাসের তারিখ (বা শুরুর তারিখ)
              </label>
              <button
                type="button"
                onClick={() => setDate(todayISODateDhaka())}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                আজকের তারিখ সেট করুন
              </button>
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Chapter Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
              অধ্যায়ের নাম বা নম্বর (ঐচ্ছিক)
            </label>
            <Input
              type="text"
              placeholder="যেমন: অধ্যায় ৩ — গতি (বা ৩য় অধ্যায়)"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-slate-400">
              বইয়ের যে অধ্যায় থেকে পড়াবেন তার নাম বা নম্বর লিখুন।
            </p>
          </div>

          {/* Topic Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
              আজকের ক্লাসের পাঠ / টপিক <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="যেমন: নিউটনের ৩য় গতিসূত্র ও ভরবেগ সংরক্ষণ নীতি"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="h-9 text-xs font-medium"
              required
            />
            <p className="text-[11px] text-slate-400">
              আজকের ক্লাসে নির্দিষ্ট কোন বিষয়টি আলোচনা বা সমাধান করা হবে।
            </p>
          </div>

          {/* Objectives / Homework / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              বাড়ির কাজ / প্রস্তুতি / বিশেষ নির্দেশনা (ঐচ্ছিক)
            </label>
            <Textarea
              placeholder="যেমন: বইয়ের পৃষ্ঠা ৪২-৪৫ দেখে আসবে এবং সূত্রগুলোর প্রমাণ খাতায় লিখে নিয়ে আসবে।"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="text-xs min-h-[70px] resize-none"
            />
          </div>

          {/* Teacher privilege reminder */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>শিক্ষক সুবিধা:</strong> শিক্ষক হিসেবে আপনি কেবলমাত্র আপনার নিজের ক্লাসের পাঠ ও টপিক আপডেট করতে পারেন। মূল রুটিনের সময় বা বিষয় পরিবর্তন হবে না।
            </span>
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
            <div>
              {hasExistingTopic && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || loading}
                  className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-9 px-3 gap-1.5"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  পাঠ/টপিক মুছুন
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading || deleting}
                className="text-xs h-9"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || deleting}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 gap-1.5 shadow-2xs"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                সংরক্ষণ করুন
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
