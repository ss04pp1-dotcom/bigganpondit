"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Trophy,
  ListOrdered,
  RotateCcw,
  AlertTriangle,
  Users,
  Search,
} from "lucide-react";
import {
  CLASS_NUMBERS,
  DIVISIONS,
  bn,
  classLabel,
  divisionLabel,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StudentAvatar } from "@/components/app/student-avatar";

interface EnrichedStudent {
  id: number;
  name: string;
  roll: number;
  division: string | null;
  section: string | null;
  photo_key: string | null;
  phone: string | null;
  username: string;
  annualTotalMarks: number;
  annualTotalObtained: number;
  annualPercentage: number | null;
  meritRank: number;
}

interface StudentPromotionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NEXT_CLASS_MAP: Record<string, string> = {
  "6": "7",
  "7": "8",
  "8": "9",
  "9": "10",
  "10": "ALUMNI",
};

export function StudentPromotionModal({
  open,
  onClose,
  onSuccess,
}: StudentPromotionModalProps) {
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [fromClass, setFromClass] = useState("6");
  const [fromDivision, setFromDivision] = useState<string>("ALL");
  const [targetClass, setTargetClass] = useState("7");
  const [targetDivision, setTargetDivision] = useState<"SCIENCE" | "HUMANITIES">("SCIENCE");
  const [examYear, setExamYear] = useState<number>(currentYear);

  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Individual student overrides: studentId -> newRoll
  const [newRolls, setNewRolls] = useState<Record<number, number>>({});
  // Individual student overrides: studentId -> newSection
  const [newSections, setNewSections] = useState<Record<number, string>>({});
  // Individual student overrides: studentId -> newDivision
  const [newDivisions, setNewDivisions] = useState<Record<number, "SCIENCE" | "HUMANITIES">>({});

  const [searchFilter, setSearchFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);


  // Load students of the source class
  useEffect(() => {
    if (!open) return;
    async function fetchStudents() {
      setLoading(true);
      try {
        const divParam = fromClass === "9" || fromClass === "10" ? (fromDivision !== "ALL" ? `&division=${fromDivision}` : "") : "";
        const res = await fetch(`/api/admin/students/promotion?class=${fromClass}${divParam}&year=${examYear}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.students)) {
          setStudents(data.students);
          // Default: select all loaded students
          const allIds = new Set<number>(data.students.map((s: EnrichedStudent) => s.id));
          setSelectedIds(allIds);

          // Default rolls: keep current roll
          const initialRolls: Record<number, number> = {};
          const initialSections: Record<number, string> = {};
          const initialDivs: Record<number, "SCIENCE" | "HUMANITIES"> = {};
          data.students.forEach((s: EnrichedStudent) => {
            initialRolls[s.id] = s.roll;
            initialSections[s.id] = s.section ?? "";
            initialDivs[s.id] = (s.division as "SCIENCE" | "HUMANITIES") || "SCIENCE";
          });
          setNewRolls(initialRolls);
          setNewSections(initialSections);
          setNewDivisions(initialDivs);
        } else {
          setStudents([]);
          setSelectedIds(new Set());
        }
      } catch {
        toast({ title: "শিক্ষার্থীদের তথ্য লোড করতে সমস্যা হয়েছে", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [open, fromClass, fromDivision, examYear, toast]);

  // Filtered view by search
  const visibleStudents = useMemo(() => {
    if (!searchFilter.trim()) return students;
    const q = searchFilter.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        String(s.roll).includes(q)
    );
  }, [students, searchFilter]);

  // Roll Assignment Helpers
  function handleAssignSameRolls() {
    const rolls: Record<number, number> = {};
    students.forEach((s) => {
      rolls[s.id] = s.roll;
    });
    setNewRolls(rolls);
    toast({ title: "বর্তমান রোল নম্বর বহাল রাখা হয়েছে।" });
  }

  function handleAssignSequentialRolls() {
    // Sequential 1, 2, 3... based on current order
    const rolls: Record<number, number> = {};
    let counter = 1;
    students.forEach((s) => {
      if (selectedIds.has(s.id)) {
        rolls[s.id] = counter++;
      } else {
        rolls[s.id] = s.roll;
      }
    });
    setNewRolls(rolls);
    toast({ title: "নির্বাচিত শিক্ষার্থীদের ক্রমিক রোল (১, ২, ৩...) অ্যাসাইন করা হয়েছে।" });
  }

  function handleAssignMeritRolls() {
    // Sort selected students by annual exam percentage descending
    const selectedStudents = students.filter((s) => selectedIds.has(s.id));
    selectedStudents.sort((a, b) => {
      const pa = a.annualPercentage ?? -1;
      const pb = b.annualPercentage ?? -1;
      if (pb !== pa) return pb - pa;
      return a.roll - b.roll;
    });

    const rolls: Record<number, number> = { ...newRolls };
    selectedStudents.forEach((s, idx) => {
      rolls[s.id] = idx + 1;
    });
    setNewRolls(rolls);
    toast({
      title: "বার্ষিক পরীক্ষার মেধা তালিকা অনুযায়ী স্বয়ংক্রিয়ভাবে নতুন রোল ১, ২, ৩... নির্ধারণ করা হয়েছে।",
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  // Execution
  async function handleExecutePromotion() {
    if (selectedIds.size === 0) {
      toast({ title: "অন্তত একজন শিক্ষার্থী নির্বাচন করুন।", variant: "destructive" });
      return;
    }

    const isTarget9or10 = targetClass === "9" || targetClass === "10";

    // Validate every roll BEFORE building the payload — a missing/zero roll
    // must be fixed by the admin, never silently coerced to 1 (which would
    // collide with the real roll 1 in the target class).
    for (const id of selectedIds) {
      const roll = Number(newRolls[id]);
      if (!Number.isInteger(roll) || roll <= 0) {
        toast({
          title: "প্রতিটি নির্বাচিত শিক্ষার্থীর নতুন রোল নম্বর দিন (০-এর বেশি পূর্ণসংখ্যা)।",
          variant: "destructive",
        });
        return;
      }
    }

    const promotionsPayload = Array.from(selectedIds).map((id) => {
      return {
        studentId: id,
        newRoll: Number(newRolls[id]),
        newSection: newSections[id]?.trim() || null,
        newDivision: isTarget9or10 ? (newDivisions[id] || targetDivision) : null,
      };
    });

    // Check roll uniqueness (key aligned with the server's "NO_DIV" convention)
    const seen = new Set<string>();
    for (const p of promotionsPayload) {
      const key = `${p.newDivision || "NO_DIV"}:${p.newRoll}`;
      if (seen.has(key)) {
        toast({
          title: `ডুপ্লিকেট রোল পাওয়া গেছে (${p.newRoll})! একই ক্লাসে একাধিক শিক্ষার্থীকে একই রোল দেওয়া যাবে না।`,
          variant: "destructive",
        });
        return;
      }
      if (p.newRoll <= 0) {
        toast({ title: "রোল নম্বর ১ বা তার বেশি হতে হবে।", variant: "destructive" });
        return;
      }
      seen.add(key);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromClassName: fromClass,
          fromDivision: fromClass === "9" || fromClass === "10" ? (fromDivision !== "ALL" ? fromDivision : null) : null,
          targetClassName: targetClass,
          targetDivision: isTarget9or10 ? targetDivision : null,
          promotions: promotionsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "প্রমোশন সম্পন্ন করতে ব্যর্থ হয়েছে।");
      }

      toast({
        title: "🎉 প্রমোশন সফল হয়েছে!",
        description: data.message || `${promotionsPayload.length} জন শিক্ষার্থী পরবর্তী ক্লাসে উত্তীর্ণ হয়েছে।`,
      });

      setConfirmStep(false);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({
        title: "প্রমোশন ব্যর্থ",
        description: e.message || "সার্ভার এরর",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCount = selectedIds.size;
  const unselectedCount = students.length - selectedCount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/15 backdrop-blur-xs text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                বছর শেষের বার্ষিক শ্রেণি প্রমোশন (Class Promotion)
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-0.5">
                শিক্ষার্থীদের এক শ্রেণি থেকে পরবর্তী শ্রেণিতে ব্যাচ প্রমোশন, রোল নম্বর পুনর্বিন্যাস ও মেধাভিত্তিক অটো-অ্যাসাইন।
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          {/* STEP 1: Class Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 p-4 rounded-xl border border-indigo-100 bg-white shadow-xs">
            {/* From Class */}
            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বর্তমান শ্রেণি (উৎস)</Label>
              <Select
                value={fromClass}
                onValueChange={(val) => {
                  setFromClass(val);
                  setTargetClass(NEXT_CLASS_MAP[val] ?? "7");
                }}
              >
                <SelectTrigger className="h-9.5 text-xs bg-slate-50 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fromClass === "9" || fromClass === "10") && (
                <div className="pt-1">
                  <Select value={fromDivision} onValueChange={setFromDivision}>
                    <SelectTrigger className="h-8 text-[11px] bg-slate-50">
                      <SelectValue placeholder="বিভাগ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">উভয় বিভাগ (সবাই)</SelectItem>
                      {DIVISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Arrow Divider */}
            <div className="hidden md:flex md:col-span-1 items-center justify-center pt-5">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Target Class */}
            <div className="md:col-span-4 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">পরবর্তী শ্রেণি (টার্গেট)</Label>
              <Select value={targetClass} onValueChange={setTargetClass}>
                <SelectTrigger className="h-9.5 text-xs bg-indigo-50/50 border-indigo-200 font-semibold text-indigo-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                  <SelectItem value="ALUMNI" className="text-xs font-bold text-purple-700">
                    🎓 উত্তীর্ণ / প্রাক্তন শিক্ষার্থী (Alumni / Passed Out)
                  </SelectItem>
                </SelectContent>
              </Select>

              {(targetClass === "9" || targetClass === "10") && (
                <div className="pt-1">
                  <Select
                    value={targetDivision}
                    onValueChange={(v: "SCIENCE" | "HUMANITIES") => setTargetDivision(v)}
                  >
                    <SelectTrigger className="h-8 text-[11px] bg-indigo-50/40 border-indigo-200 font-semibold">
                      <SelectValue placeholder="টার্গেট বিভাগ" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-xs">
                          {d.label} বিভাগ
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Exam Merit Year */}
            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মেধা যাচাইয়ের শিক্ষাবর্ষ</Label>
              <Select
                value={String(examYear)}
                onValueChange={(v) => setExamYear(Number(v))}
              >
                <SelectTrigger className="h-9.5 text-xs bg-slate-50 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {bn(y)} সাল
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground pt-0.5">
                এই বছরের ফলাফলের ভিত্তিতে মেধা তালিকা সাজানো হবে।
              </p>
            </div>
          </div>

          {/* Historic Note / Preservation Assurance */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2.5 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-blue-950">
                পূর্ববর্তী শিক্ষাবর্ষের মার্কশিট ও পরীক্ষার রেকর্ড ১০০% সুরক্ষিত থাকে:
              </p>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                শিক্ষার্থীরা নতুন ক্লাসে প্রমোশন পেলেও তাদের বিগত বছরের পরীক্ষার ফলাফল, মাসিক/বার্ষিক মার্কশিট ও মেধা তালিকার হিস্ট্রি ডাটাবেজে স্থায়ীভাবে থাকবে। অতীতের মার্কশিট প্রিন্ট করলে তৎকালীন শ্রেণিই প্রদর্শিত হবে।
              </p>
            </div>
          </div>

          {/* STEP 2: Students List Toolbar & Auto-Roll Actions */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={toggleSelectAll}
                >
                  <Users className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  {selectedIds.size === students.length ? "সব আনচেক করুন" : "সবাই নির্বাচন (Select All)"}
                </Button>
                <span className="text-xs font-medium text-slate-600">
                  নির্বাচিত: <strong className="text-indigo-600">{bn(selectedCount)}</strong> / {bn(students.length)} জন
                </span>
              </div>

              {/* Smart Roll Assignment Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 mr-1 hidden lg:inline">
                  নতুন রোল সেট করুন:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAssignSameRolls}
                  className="h-8 text-[11px] font-semibold gap-1 text-slate-700 hover:bg-slate-100"
                  title="পূর্বের ক্লাসের রোলই নতুন ক্লাসে থাকবে"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  বর্তমান রোল বহাল
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAssignSequentialRolls}
                  className="h-8 text-[11px] font-semibold gap-1 text-slate-700 hover:bg-slate-100"
                  title="১ থেকে ক্রমিক রোল দিন"
                >
                  <ListOrdered className="h-3 w-3 text-slate-500" />
                  ক্রমিক ১, ২, ৩...
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAssignMeritRolls}
                  className="h-8 text-[11px] font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                  title="বার্ষিক পরীক্ষায় সর্বোচ্চ নম্বরধারীকে রোল ১, দ্বিতীয়কে রোল ২ এভাবে মেধা অনুযায়ী সাজাবে"
                >
                  <Trophy className="h-3 w-3 text-amber-100" />
                  বার্ষিক মেধা অনুযায়ী রোল
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="শিক্ষার্থীর নাম, ইউজারনেম বা বর্তমান রোল দিয়ে ফিল্টার করুন…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-9 pl-9 text-xs bg-white"
              />
            </div>

            {/* Students Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              {loading ? (
                <div className="py-14 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> তথ্য লোড হচ্ছে…
                </div>
              ) : students.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs">
                  {classLabel(fromClass)}-এ কোনো শিক্ষার্থী পাওয়া যায়নি।
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px] app-scroll">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === students.length && students.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 w-16 text-center">বর্তমান রোল</th>
                        <th className="p-3">শিক্ষার্থী</th>
                        <th className="p-3 text-center">বার্ষিক মেধা ক্রম ও নম্বর</th>
                        <th className="p-3 w-28 text-center font-bold text-indigo-900">নতুন রোল</th>
                        {(targetClass === "9" || targetClass === "10") && (
                          <th className="p-3 w-28 text-center">বিভাগ</th>
                        )}
                        <th className="p-3 w-24 text-center">নতুন শাখা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleStudents.map((st) => {
                        const isSelected = selectedIds.has(st.id);
                        return (
                          <tr
                            key={st.id}
                            className={cn(
                              "transition-colors",
                              isSelected ? "bg-white hover:bg-indigo-50/30" : "bg-slate-50/60 opacity-60 hover:opacity-90"
                            )}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(st.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">
                              {bn(st.roll)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar photoKey={st.photo_key} name={st.name} className="h-7 w-7 text-[10px]" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">{st.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    @{st.username}
                                    {st.section ? ` • শাখা ${st.section}` : ""}
                                    {st.division ? ` • ${divisionLabel(st.division)}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {st.annualPercentage !== null ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1",
                                    st.meritRank === 1 && "bg-amber-100 text-amber-800 border border-amber-300",
                                    st.meritRank === 2 && "bg-slate-100 text-slate-800 border border-slate-300",
                                    st.meritRank === 3 && "bg-amber-50 text-amber-700 border border-amber-200",
                                    st.meritRank > 3 && "bg-blue-50 text-blue-700"
                                  )}>
                                    {st.meritRank <= 3 && <Trophy className="h-3 w-3" />}
                                    মেধা #{bn(st.meritRank)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                    {bn(st.annualPercentage)}% ({bn(st.annualTotalObtained)}/{bn(st.annualTotalMarks)})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">পরীক্ষা নেই</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min={1}
                                disabled={!isSelected}
                                value={newRolls[st.id] ?? st.roll}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setNewRolls((prev) => ({ ...prev, [st.id]: val }));
                                }}
                                className="h-8 w-20 mx-auto text-center font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200 text-xs"
                              />
                            </td>
                            {(targetClass === "9" || targetClass === "10") && (
                              <td className="p-3 text-center">
                                <Select
                                  disabled={!isSelected}
                                  value={newDivisions[st.id] || targetDivision}
                                  onValueChange={(val: "SCIENCE" | "HUMANITIES") => {
                                    setNewDivisions((prev) => ({ ...prev, [st.id]: val }));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-[11px] bg-slate-50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DIVISIONS.map((d) => (
                                      <SelectItem key={d.value} value={d.value} className="text-xs">
                                        {d.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <Input
                                type="text"
                                placeholder="শাখা"
                                disabled={!isSelected}
                                value={newSections[st.id] ?? ""}
                                onChange={(e) => {
                                  setNewSections((prev) => ({ ...prev, [st.id]: e.target.value }));
                                }}
                                className="h-8 w-16 mx-auto text-center text-xs bg-slate-50"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Summary Banner */}
          <div className="bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">প্রমোশনের বিবরণ:</span>
              <span className="font-bold text-slate-800">
                {classLabel(fromClass)} → {classLabel(targetClass)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">উত্তীর্ণ শিক্ষার্থী সংখ্যা:</span>
              <span className="font-bold text-indigo-600">{bn(selectedCount)} জন</span>
            </div>
            {unselectedCount > 0 && (
              <div className="flex items-center justify-between text-amber-700">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> অনির্বাচিত শিক্ষার্থী (বর্তমান ক্লাসেই থাকবে):
                </span>
                <span className="font-bold">{bn(unselectedCount)} জন</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-row items-center justify-between sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting} className="text-xs">
            বাতিল করুন
          </Button>
          <div className="flex items-center gap-2">
            {!confirmStep ? (
              <Button
                type="button"
                disabled={selectedCount === 0 || loading}
                onClick={() => setConfirmStep(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
              >
                <GraduationCap className="h-4 w-4" />
                প্রমোশন পর্যালোচনা করুন ({bn(selectedCount)} জন)
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmStep(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  ফিরে যান
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleExecutePromotion}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> প্রমোশন প্রসেস হচ্ছে…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> প্রমোশন নিশ্চিত করুন
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
