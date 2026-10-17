"use client";

import React, { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Sparkles, Loader2, Calendar, GraduationCap } from "lucide-react";
import { RoutineItem } from "@/components/app/today-routine-modal";
import { DAYS_OF_WEEK, bn, classLabel, divisionLabel, todayISODateDhaka } from "@/lib/constants";

interface TeacherAddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineItem[];
  batches: { id: number; name: string; class_name: string; division: string | null }[];
  onSaved: () => void;
}

export function TeacherAddTopicModal({
  isOpen,
  onClose,
  routines,
  batches,
  onSaved,
}: TeacherAddTopicModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [className, setClassName] = useState<string>("");
  const [division, setDivision] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");
  const [subjectName, setSubjectName] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [chapterName, setChapterName] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [objectives, setObjectives] = useState<string>("");
  const [date, setDate] = useState<string>(todayISODateDhaka());

  // 1. Unique classes from routines
  const availableClasses = useMemo(() => {
    const set = new Set(routines.map((r) => r.class_name).filter(Boolean));
    return Array.from(set);
  }, [routines]);

  // Is class 9th or 10th ( নবম or দশম )
  const isNineOrTen = useMemo(() => {
    if (!className) return false;
    return /নবম|দশম|৯ম|১০ম|9|10/i.test(className);
  }, [className]);

  // 2. Batches filtered by selected class and division
  const filteredBatches = useMemo(() => {
    if (!className) return [];
    return batches.filter((b) => {
      if (b.class_name !== className) return false;
      if (isNineOrTen && division && division !== "GENERAL" && b.division && b.division !== division) {
        return false;
      }
      return true;
    });
  }, [batches, className, isNineOrTen, division]);

  // 3. Subjects available for this class
  const availableSubjects = useMemo(() => {
    if (!className) return [];
    const set = new Set<string>();
    routines.forEach((r) => {
      if (r.class_name === className) {
        if (isNineOrTen && division && division !== "GENERAL" && r.division && r.division !== division) return;
        if (batchId && batchId !== "all_batches") {
          const bMatch = r.batch_id === Number(batchId) || r.batch_name === batchId;
          if (!bMatch && r.batch_id && r.batch_name) return;
        }
        if (r.subject_name) set.add(r.subject_name);
      }
    });
    return Array.from(set);
  }, [routines, className, isNineOrTen, division, batchId]);

  // 4. Days where this teacher/class/subject has routine slots
  const availableDays = useMemo(() => {
    const dayIds = new Set<number>();
    routines.forEach((r) => {
      if (className && r.class_name !== className) return;
      if (subjectName && r.subject_name !== subjectName) return;
      if (isNineOrTen && division && division !== "GENERAL" && r.division && r.division !== division) return;
      if (batchId && batchId !== "all_batches") {
        const bMatch = r.batch_id === Number(batchId) || r.batch_name === batchId;
        if (!bMatch && r.batch_id && r.batch_name) return;
      }
      dayIds.add(Number(r.day_of_week));
    });
    return DAYS_OF_WEEK.filter((d) => dayIds.has(d.id));
  }, [routines, className, subjectName, isNineOrTen, division, batchId]);

  // Auto-select first class/subject when modal opens so class days are immediately ready
  React.useEffect(() => {
    if (isOpen && !className && availableClasses.length > 0) {
      setClassName(availableClasses[0]);
    }
  }, [isOpen, className, availableClasses]);

  React.useEffect(() => {
    if (className && availableSubjects.length > 0 && !availableSubjects.includes(subjectName)) {
      setSubjectName(availableSubjects[0]);
    }
  }, [className, availableSubjects, subjectName]);

  // When class/subject changes, default selectedDays to the teacher's actual class days
  React.useEffect(() => {
    if (className && subjectName) {
      setSelectedDays(availableDays.map((d) => d.id));
    }
  }, [className, subjectName, availableDays]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!className || !subjectName || !chapterName.trim()) {
      toast({
        title: "শ্রেণি, বিষয় এবং অধ্যায়ের নাম প্রদান করা আবশ্যক।",
        description: "অধ্যায় আবশ্যক এবং টপিক ঐচ্ছিক।",
        variant: "destructive",
      });
      return;
    }

    const validDaysSet = new Set(availableDays.map((d) => d.id));
    const targetDays = (selectedDays.length > 0 ? selectedDays : availableDays.map((d) => d.id)).filter((id) =>
      validDaysSet.has(id)
    );

    if (targetDays.length === 0) {
      toast({
        title: "অন্তত একটি ক্লাসের দিন সিলেক্ট করুন।",
        description: "যেদিন ক্লাস নেই বা বন্ধের দিন, সেদিন সিলেক্ট করা যাবে না।",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find matching routine slots for this class + subject
      const allSubjectRoutines = routines.filter((r) => {
        if (r.class_name !== className) return false;
        if (isNineOrTen && division && division !== "GENERAL" && r.division && r.division !== division) return false;
        if (batchId && batchId !== "all_batches") {
          const bMatch = r.batch_id === Number(batchId) || r.batch_name === batchId;
          if (!bMatch && r.batch_id && r.batch_name) return false;
        }
        if (r.subject_name !== subjectName) return false;
        return true;
      });

      const matchingRoutines = allSubjectRoutines.filter((r) =>
        targetDays.includes(Number(r.day_of_week))
      );

      const slotsToUpdate = matchingRoutines.length > 0 ? matchingRoutines : allSubjectRoutines.slice(0, 1);

      if (slotsToUpdate.length === 0) {
        throw new Error("এই শর্ত অনুযায়ী কোনো রুটিন স্লট পাওয়া যায়নি।");
      }

      // Helper to compute date for each routine's day of week
      const computeDateForDay = (baseDateStr: string, targetDay: number): string => {
        try {
          const base = new Date(`${baseDateStr}T00:00:00`);
          if (isNaN(base.getTime())) return baseDateStr;
          const curDay = base.getDay();
          let diff = targetDay - curDay;
          if (diff < 0) diff += 7;
          const res = new Date(base);
          res.setDate(res.getDate() + diff);
          return res.toISOString().slice(0, 10);
        } catch {
          return baseDateStr;
        }
      };

      // Update topic for all matching routine IDs and selected days
      for (const r of slotsToUpdate) {
        const slotDate = computeDateForDay(date || todayISODateDhaka(), Number(r.day_of_week));
        const res = await fetch("/api/routines/topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routineId: r.id,
            date: slotDate,
            daysOfWeek: targetDays,
            chapterName: chapterName.trim(),
            topicName: topicName.trim() || chapterName.trim(),
            objectives: objectives.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "টপিক সংরক্ষণ ব্যর্থ হয়েছে।");
        }
      }

      toast({
        title: "অধ্যায় ও পাঠ সফলভাবে সংরক্ষিত হয়েছে",
        description: `নির্বাচিত ${bn(targetDays.length)}টি ক্লাসের দিনে অধ্যায় ও টপিক আপডেট করা হয়েছে।`,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: err?.message || "সংরক্ষণ করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden rounded-2xl border-slate-200">
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-indigo-100" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                অধ্যায় ও টপিক যুক্ত করুন
              </DialogTitle>
              <DialogDescription className="text-xs text-indigo-100 mt-0.5">
                শ্রেণি, বিভাগ, ব্যাচ ও বিষয় নির্বাচন করে ক্লাসের পাঠ্যসূচি নির্ধারণ করুন
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 01. Class Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
              ০১। শ্রেণি সিলেক্ট করুন <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={className}
              onValueChange={(val) => {
                setClassName(val);
                setDivision("");
                setBatchId("");
                setSubjectName("");
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="শ্রেণি নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {classLabel(cls)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 02. Division Select (9th / 10th class only) */}
          {isNineOrTen && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-200">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                ০২। বিভাগ সিলেক্ট [৯ম/১০ম শ্রেণির জন্য]
              </Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="সকল বিভাগ / সাধারণ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">সকল বিভাগ (সাধারণ)</SelectItem>
                  <SelectItem value="SCIENCE">বিজ্ঞান (Science)</SelectItem>
                  <SelectItem value="ARTS">মানবিক (Arts)</SelectItem>
                  <SelectItem value="COMMERCE">ব্যবসায় শিক্ষা (Commerce)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 03. Batch Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              ০৩। ব্যাচ সিলেক্ট (সিলেক্ট করা শ্রেণীতে যুক্ত ব্যাচ সমূহ)
            </Label>
            <Select value={batchId} onValueChange={setBatchId} disabled={!className}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={className ? "সকল ব্যাচ (বা নির্দিষ্ট ব্যাচ)" : "প্রথমে শ্রেণি নির্বাচন করুন"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_batches">সকল ব্যাচ (সাধারণ)</SelectItem>
                {filteredBatches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name} {b.division ? `(${divisionLabel(b.division)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 04. Subject Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              ০৪। বিষয় সিলেক্ট <span className="text-rose-500">*</span>
            </Label>
            <Select value={subjectName} onValueChange={setSubjectName} disabled={!className}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={className ? "বিষয় নির্বাচন করুন" : "প্রথমে শ্রেণি নির্বাচন করুন"} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 05. Day Select — Strictly only active routine days, off days are disabled */}
          <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                ০৫। দিন সিলেক্ট (শুধু রুটিনের ক্লাসের দিন প্রযোজ্য)
              </Label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedDays(availableDays.map((d) => d.id))}
                  className="text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                  title="আপনার ক্লাসের সব দিন সিলেক্ট করুন"
                >
                  ক্লাসের সব দিন ({availableDays.length}টি)
                </button>
                {selectedDays.length > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([])}
                      className="text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer"
                    >
                      রিসেট
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                const hasRoutine = availableDays.some((ad) => ad.id === d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!hasRoutine}
                    onClick={() => {
                      if (!hasRoutine) return;
                      setSelectedDays((prev) =>
                        prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                      );
                    }}
                    title={
                      hasRoutine
                        ? `${d.name}: ক্লাসের দিন`
                        : `${d.name}: বন্ধের দিন (এই দিন কোনো ক্লাস নেই, নির্বাচনযোগ্য নয়)`
                    }
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold border transition ${
                      !hasRoutine
                        ? "bg-slate-100 text-slate-400 border-dashed border-slate-200 cursor-not-allowed opacity-50 select-none hover:bg-slate-100"
                        : isSelected
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300 cursor-pointer"
                        : "bg-indigo-50/70 text-indigo-900 border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                    }`}
                  >
                    <span>{d.name}</span>
                    <span
                      className={`text-[9px] mt-0.5 ${
                        !hasRoutine
                          ? "text-slate-400 font-normal"
                          : isSelected
                          ? "text-indigo-100 font-semibold"
                          : "text-indigo-600 font-semibold"
                      }`}
                    >
                      {!hasRoutine ? "বন্ধ (ক্লাস নেই)" : isSelected ? "✓ নির্বাচিত" : "ক্লাস আছে"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              {selectedDays.length > 0
                ? `নির্বাচিত ${bn(selectedDays.length)}টি দিনে পাঠ্যসূচি যুক্ত হবে (${selectedDays
                    .map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")})।`
                : `💡 নিয়ম: বন্ধের দিনে কোনো ক্লাস না থাকায় বন্ধের দিন সিলেক্ট করা যাবে না। কেবল ক্লাসের দিনগুলো (${availableDays.map((d) => d.name).join(", ") || "কোনো দিন নেই"}) নির্বাচনযোগ্য।`}
            </p>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">তারিখ</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* 06. Chapter Add */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              ০৬। অধ্যায় যুক্ত করুন <span className="text-rose-500">* (আবশ্যিক)</span>
            </Label>
            <Input
              type="text"
              placeholder="যেমন: অধ্যায় ৪ — রাসায়নিক বন্ধন"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              className="h-9 text-xs font-medium"
              required
            />
          </div>

          {/* 07. Topic Add */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              ০৭। টপিক যুক্ত করুন <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
            </Label>
            <Input
              type="text"
              placeholder="যেমন: আয়নিক ও সমযোজী বন্ধন গঠন (ঐচ্ছিক)"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="h-9 text-xs font-medium"
            />
          </div>

          {/* Objectives / Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              বাড়ির কাজ বা বিশেষ নির্দেশনা (ঐচ্ছিক)
            </Label>
            <Textarea
              placeholder="প্রস্তুতি বা বাড়ির কাজ লিখুন..."
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs h-9"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
