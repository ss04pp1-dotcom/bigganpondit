"use client";

// Advanced Smart Marks Entry Component
// - Dual Mode: Spreadsheet Grid (bulk fast entry) + Single Student Card (focused entry)
// - Auto-sync with existing exam marks (live progress & detection)
// - Smart Bangla & English numeric input sanitizer
// - Keyboard navigation: Enter / Down Arrow -> next student, Up Arrow -> prev student
// - Absent shortcut ('A' or 'a')
// - Live exam analytics: Completion %, Class Average, Highest Mark & Topper, Pass Rate
// - Instant validation: Cannot exceed total marks, prevents negative marks

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CLASS_NUMBERS,
  DIVISIONS,
  EXAM_TITLE_SUGGESTIONS,
  MONTHS_BN,
  bn,
  fmtNum,
  fmtPct,
  gradeFromPercentage,
  toEnDigits,
} from "@/lib/constants";

export interface EntrySubject {
  id: number;
  name: string;
  className: string;
  classId: number;
  isFourth: boolean;
}

const MODEL_TITLE_SUGGESTIONS = [
  "মডেল টেস্ট ১",
  "মডেল টেস্ট ২",
  "মডেল টেস্ট ৩",
  "মডেল টেস্ট ৪",
  "পূর্ণাঙ্গ মডেল টেস্ট",
];

interface StudentOpt {
  id: number;
  name: string;
  roll: number;
  section: string | null;
  photo_key: string | null;
}

interface StudentMarkState {
  obtained: string;
  attendance: "PRESENT" | "ABSENT";
  isDirty?: boolean;
  isSaved?: boolean;
  markId?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export interface MarksEntryProps {
  subjects: EntrySubject[];
  initialClass?: string;
  initialDivision?: string;
  initialSubjectId?: number;
}

export function MarksEntry({
  subjects,
  initialClass,
  initialDivision,
  initialSubjectId,
}: MarksEntryProps) {
  const now = new Date();
  const { toast } = useToast();

  // Mode: Spreadsheet Grid (default) vs Single Student Card
  const [viewMode, setViewMode] = useState<"GRID" | "SINGLE">("GRID");

  // Exam Configuration Context
  const [examType, setExamType] = useState<"MONTHLY" | "MODEL">("MONTHLY");
  const [className, setClassName] = useState<string>(
    initialClass || (subjects[0]?.className ?? "10")
  );
  const [division, setDivision] = useState<string>(initialDivision || "SCIENCE");
  const [subjectId, setSubjectId] = useState<number | null>(initialSubjectId ?? null);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [examDate, setExamDate] = useState<string>(today());
  const [title, setTitle] = useState<string>("ক্লাস টেস্ট ১");
  const [totalMarks, setTotalMarks] = useState<string>("20");

  // Students & Existing Exam State
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingExamId, setExistingExamId] = useState<number | null>(null);
  const [existingExamPublished, setExistingExamPublished] = useState<boolean>(false);
  const [marksState, setMarksState] = useState<Record<number, StudentMarkState>>({});

  // Single Student Mode selection
  const [singleStudentId, setSingleStudentId] = useState<number | null>(null);

  // Search & Filter in Grid Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED" | "ABSENT">("ALL");

  // Saving states
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingSingleId, setSavingSingleId] = useState<number | null>(null);
  const [dupPrompt, setDupPrompt] = useState<null | { resolve: (v: boolean) => void }>(null);

  // Refs for keyboard navigation between inputs
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.className === className),
    [subjects, className]
  );
  const requiresDivision = className === "9" || className === "10";
  const years = useMemo(() => {
    const cur = now.getFullYear();
    return [cur + 1, cur, cur - 1, cur - 2, cur - 3];
  }, [now]);

  // Keep subject valid for selected class
  useEffect(() => {
    if (!classSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(classSubjects[0]?.id ?? null);
    }
  }, [classSubjects, subjectId]);

  // Load students of class + division
  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ class: className });
      if (requiresDivision) params.set("division", division);
      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        const studentList: StudentOpt[] = json.students ?? [];
        setStudents(studentList);
        if (studentList.length > 0) {
          setSingleStudentId((prev) => (prev && studentList.some((s) => s.id === prev) ? prev : studentList[0].id));
        } else {
          setSingleStudentId(null);
        }
      }
    } finally {
      setLoadingStudents(false);
    }
  }, [className, division, requiresDivision]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const total = Math.max(0, Math.floor(Number(toEnDigits(totalMarks)) || 0));

  // Check and sync with existing exam marks in database
  const checkExistingExam = useCallback(async () => {
    if (!subjectId || !className || !title.trim()) return;
    const selectedSub = classSubjects.find((s) => s.id === subjectId);
    if (!selectedSub) return;

    setLoadingExisting(true);
    try {
      const p = new URLSearchParams({
        checkExam: "1",
        classId: String(selectedSub.classId),
        subjectId: String(subjectId),
        month: String(month),
        year: String(year),
        title: title.trim(),
        examType,
      });
      if (requiresDivision) p.set("division", division);

      const res = await fetch(`/api/marks?${p.toString()}`);
      const json = await res.json();
      if (json.ok && json.exists && json.exam) {
        setExistingExamId(json.exam.id);
        setExistingExamPublished(Number(json.exam.is_published) === 1);
        if (json.exam.total_marks && String(json.exam.total_marks) !== totalMarks) {
          setTotalMarks(String(json.exam.total_marks));
        }
        if (json.exam.exam_date) {
          setExamDate(json.exam.exam_date);
        }

        // Map marks to state
        const serverMarks: Array<{
          id: number;
          student_id: number;
          attendance: "PRESENT" | "ABSENT";
          obtained_marks: number;
        }> = json.marks ?? [];

        const newMap: Record<number, StudentMarkState> = {};
        for (const m of serverMarks) {
          newMap[m.student_id] = {
            obtained: m.attendance === "ABSENT" ? "0" : String(m.obtained_marks),
            attendance: m.attendance,
            isDirty: false,
            isSaved: true,
            markId: m.id,
          };
        }

        setMarksState((prev) => {
          // Merge with any unsaved edits, but populate existing marks from server
          const merged: Record<number, StudentMarkState> = { ...prev };
          for (const s of students) {
            if (newMap[s.id]) {
              // Only override if user hasn't made dirty edits
              if (!merged[s.id]?.isDirty) {
                merged[s.id] = newMap[s.id];
              }
            } else if (!merged[s.id]) {
              merged[s.id] = { obtained: "", attendance: "PRESENT", isDirty: false, isSaved: false };
            }
          }
          return merged;
        });
      } else {
        setExistingExamId(null);
        // Reset saved flags if starting a completely new exam title
        setMarksState((prev) => {
          const reset: Record<number, StudentMarkState> = {};
          for (const s of students) {
            reset[s.id] = prev[s.id]?.isDirty
              ? prev[s.id]
              : { obtained: "", attendance: "PRESENT", isDirty: false, isSaved: false };
          }
          return reset;
        });
      }
    } catch {
      // Silently catch network drops during check
    } finally {
      setLoadingExisting(false);
    }
  }, [subjectId, className, title, classSubjects, month, year, examType, requiresDivision, division, students]);

  useEffect(() => {
    if (students.length > 0) {
      checkExistingExam();
    }
  }, [checkExistingExam, students.length]);

  // Clean mark string, converts Bengali digits to English
  function cleanMarkInput(val: string): { obtained: string; isAbsentShortcut: boolean } {
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === "a" || trimmed === "অ") {
      return { obtained: "0", isAbsentShortcut: true };
    }
    const enVal = toEnDigits(val);
    const sanitized = enVal.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const formatted = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
    return { obtained: formatted, isAbsentShortcut: false };
  }

  // Update a student's mark
  function updateStudentMark(
    studentId: number,
    field: "obtained" | "attendance",
    value: string
  ) {
    setMarksState((prev) => {
      const current = prev[studentId] ?? { obtained: "", attendance: "PRESENT", isDirty: false, isSaved: false };
      let newObtained = current.obtained;
      let newAttendance = current.attendance;

      if (field === "obtained") {
        const { obtained: cleaned, isAbsentShortcut } = cleanMarkInput(value);
        if (isAbsentShortcut) {
          newAttendance = "ABSENT";
          newObtained = "0";
        } else {
          newObtained = cleaned;
          if (newAttendance === "ABSENT" && cleaned !== "0" && cleaned !== "") {
            newAttendance = "PRESENT";
          }
        }
      } else if (field === "attendance") {
        newAttendance = value as "PRESENT" | "ABSENT";
        if (newAttendance === "ABSENT") {
          newObtained = "0";
        }
      }

      return {
        ...prev,
        [studentId]: {
          ...current,
          obtained: newObtained,
          attendance: newAttendance,
          isDirty: true,
        },
      };
    });
  }

  // Live Analytics Computations
  const stats = useMemo(() => {
    let completedCount = 0;
    let absentCount = 0;
    let presentWithMarks = 0;
    let sumMarks = 0;
    let highest = 0;
    let highestStudentName = "";
    let passCount = 0;
    let gpa5Count = 0;
    let dirtyCount = 0;

    const passThreshold = total * 0.33;

    for (const s of students) {
      const st = marksState[s.id];
      if (!st) continue;
      if (st.isDirty) dirtyCount++;

      const hasMark = st.obtained !== "" && !isNaN(Number(st.obtained));
      if (st.attendance === "ABSENT") {
        completedCount++;
        absentCount++;
      } else if (hasMark) {
        completedCount++;
        presentWithMarks++;
        const val = Number(st.obtained);
        sumMarks += val;
        if (val > highest) {
          highest = val;
          highestStudentName = `${s.name} (রোল ${bn(s.roll)})`;
        }
        if (val >= passThreshold) passCount++;
        const pct = total > 0 ? (val / total) * 100 : 0;
        if (pct >= 80) gpa5Count++;
      }
    }

    const totalStudents = students.length;
    const pendingCount = Math.max(0, totalStudents - completedCount);
    const progressPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
    const averageMark = presentWithMarks > 0 ? sumMarks / presentWithMarks : 0;
    const passRate = presentWithMarks > 0 ? (passCount / presentWithMarks) * 100 : 0;

    return {
      totalStudents,
      completedCount,
      pendingCount,
      absentCount,
      presentWithMarks,
      progressPct,
      highest,
      highestStudentName,
      averageMark,
      passRate,
      gpa5Count,
      dirtyCount,
    };
  }, [students, marksState, total]);

  // Filtered students for grid view
  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qEn = toEnDigits(q);
      list = list.filter((s) => {
        const rollStr = String(s.roll);
        const rollBn = bn(s.roll);
        return (
          s.name.toLowerCase().includes(q) ||
          rollStr.includes(qEn) ||
          rollBn.includes(q)
        );
      });
    }

    if (filterStatus === "PENDING") {
      list = list.filter((s) => {
        const st = marksState[s.id];
        return !st || (st.obtained === "" && st.attendance !== "ABSENT");
      });
    } else if (filterStatus === "COMPLETED") {
      list = list.filter((s) => {
        const st = marksState[s.id];
        return st && (st.obtained !== "" || st.attendance === "ABSENT");
      });
    } else if (filterStatus === "ABSENT") {
      list = list.filter((s) => marksState[s.id]?.attendance === "ABSENT");
    }

    return list;
  }, [students, searchQuery, filterStatus, marksState]);

  // Save a single student's mark
  async function saveSingleStudent(studentIdToSave: number, confirmUpdate = false) {
    const selectedSub = classSubjects.find((s) => s.id === subjectId);
    if (!selectedSub || !studentIdToSave || total <= 0) return;

    const st = marksState[studentIdToSave] ?? { obtained: "0", attendance: "PRESENT" };
    const obtainedNum = st.attendance === "ABSENT" ? 0 : Number(st.obtained) || 0;

    if (st.attendance === "PRESENT" && obtainedNum > total) {
      toast({
        title: `প্রাপ্ত নম্বর মোট নম্বর ${bn(total)}-এর বেশি হতে পারে না!`,
        variant: "destructive",
      });
      return;
    }

    setSavingSingleId(studentIdToSave);
    try {
      const payload = {
        examId: existingExamId ?? undefined,
        classId: selectedSub.classId,
        division: requiresDivision ? division : null,
        subjectId,
        month,
        year,
        examDate,
        examType,
        title: title.trim(),
        totalMarks: total,
        studentId: studentIdToSave,
        attendance: st.attendance,
        obtainedMarks: obtainedNum,
        confirmUpdate,
      };

      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json && json.duplicate && !confirmUpdate) {
        const update = await new Promise<boolean>((resolve) => setDupPrompt({ resolve }));
        setDupPrompt(null);
        if (update) {
          await saveSingleStudent(studentIdToSave, true);
        }
        return;
      }

      if (!res.ok || !json?.ok) {
        toast({ title: json?.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      setMarksState((prev) => ({
        ...prev,
        [studentIdToSave]: {
          ...prev[studentIdToSave],
          isDirty: false,
          isSaved: true,
        },
      }));
      setExistingExamId(json.examId);
      toast({ title: json.message ?? "সফলভাবে সংরক্ষণ করা হয়েছে।" });
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingSingleId(null);
    }
  }

  // Batch Save All Modified / Filled Marks
  async function saveAllBatch() {
    const selectedSub = classSubjects.find((s) => s.id === subjectId);
    if (!selectedSub || total <= 0 || !title.trim()) {
      toast({ title: "অনুগ্রহ করে পরীক্ষার সব তথ্য সঠিকভাবে পূরণ করুন।", variant: "destructive" });
      return;
    }

    // Collect all valid entries
    const batchEntries: Array<{
      studentId: number;
      attendance: "PRESENT" | "ABSENT";
      obtainedMarks: number;
    }> = [];

    let hasInvalid = false;
    for (const s of students) {
      const st = marksState[s.id];
      if (!st) continue;
      // Include if dirty or filled
      if (st.obtained !== "" || st.attendance === "ABSENT") {
        const numVal = st.attendance === "ABSENT" ? 0 : Number(st.obtained);
        if (isNaN(numVal) || numVal < 0 || numVal > total) {
          hasInvalid = true;
          break;
        }
        batchEntries.push({
          studentId: s.id,
          attendance: st.attendance,
          obtainedMarks: numVal,
        });
      }
    }

    if (hasInvalid) {
      toast({
        title: `প্রাপ্ত নম্বর ০ থেকে ${bn(total)}-এর মধ্যে হতে হবে। লাল দাগ দেওয়া ফিল্ডগুলো চেক করুন।`,
        variant: "destructive",
      });
      return;
    }

    if (batchEntries.length === 0) {
      toast({ title: "সংরক্ষণ করার মতো কোনো নতুন নম্বর পাওয়া যায়নি।" });
      return;
    }

    setSavingBatch(true);
    try {
      const payload = {
        examId: existingExamId ?? undefined,
        classId: selectedSub.classId,
        division: requiresDivision ? division : null,
        subjectId,
        month,
        year,
        examDate,
        examType,
        title: title.trim(),
        totalMarks: total,
        batch: batchEntries,
      };

      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        toast({ title: json?.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      setMarksState((prev) => {
        const updated: Record<number, StudentMarkState> = { ...prev };
        for (const item of batchEntries) {
          if (updated[item.studentId]) {
            updated[item.studentId] = {
              ...updated[item.studentId],
              isDirty: false,
              isSaved: true,
            };
          }
        }
        return updated;
      });

      if (json.examId) setExistingExamId(json.examId);
      toast({ title: json.message ?? `${bn(batchEntries.length)} জন শিক্ষার্থীর নম্বর সফলভাবে সংরক্ষণ করা হয়েছে!` });
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingBatch(false);
    }
  }

  // Keyboard navigation inside Grid table
  function handleKeyDownInGrid(e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextStudent = filteredStudents[currentIndex + 1];
      if (nextStudent && inputRefs.current[nextStudent.id]) {
        inputRefs.current[nextStudent.id]?.focus();
        inputRefs.current[nextStudent.id]?.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevStudent = filteredStudents[currentIndex - 1];
      if (prevStudent && inputRefs.current[prevStudent.id]) {
        inputRefs.current[prevStudent.id]?.focus();
        inputRefs.current[prevStudent.id]?.select();
      }
    }
  }

  // Single Student Mode helpers
  const currentSingleIndex = students.findIndex((s) => s.id === singleStudentId);
  const currentSingleStudent = students[currentSingleIndex] ?? students[0];
  const currentSingleMark = currentSingleStudent ? marksState[currentSingleStudent.id] : null;
  const singleObtainedNum = currentSingleMark?.attendance === "ABSENT" ? 0 : Number(currentSingleMark?.obtained || 0);
  const singlePct = total > 0 ? (currentSingleMark?.attendance === "ABSENT" ? 0 : (Math.min(singleObtainedNum, total) / total) * 100) : 0;
  const singleGrade = gradeFromPercentage(singlePct);

  return (
    <div className="space-y-4">
      {/* ===================== ১. পরীক্ষার তথ্য ও ক্যাটাগরি কনফিগারেশন ===================== */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${examType === "MODEL" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
              {examType === "MODEL" ? <Award className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-[17px] font-bold text-slate-900">পরীক্ষার তথ্য ও সেটিংস</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {loadingExisting ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> ডেটা যাচাই হচ্ছে...
                  </span>
                ) : existingExamId ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> সংরক্ষিত পরীক্ষা ({bn(stats.completedCount)} জনের নম্বর আছে)
                    </span>
                    {existingExamPublished ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        📢 এডমিন কর্তৃক প্রকাশিত
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                        ⏳ ড্রাফট (এডমিন অনুমোদনের পর প্রকাশিত হবে)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      নতুন পরীক্ষার এন্ট্রি
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ℹ️ শিক্ষকের নম্বর সংরক্ষণ শেষে এডমিন প্রকাশ করবেন
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exam Type Selector (Monthly vs Model Test) */}
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setExamType("MONTHLY");
                setTitle("ক্লাস টেস্ট ১");
                setTotalMarks("20");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                examType === "MONTHLY"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>মাসিক / ক্লাস টেস্ট</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExamType("MODEL");
                setTitle("মডেল টেস্ট ১");
                setTotalMarks("100");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                examType === "MODEL"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>মডেল টেস্ট</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">শ্রেণি</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="h-10 text-[13px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASS_NUMBERS.map((c) => (
                  <SelectItem key={c} value={c}>{bn(c)} শ্রেণি</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresDivision && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বিভাগ</Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="h-10 text-[13px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs font-bold text-slate-700">বিষয়</Label>
            <Select value={subjectId ? String(subjectId) : ""} onValueChange={(v) => setSubjectId(Number(v))}>
              <SelectTrigger className="h-10 text-[13px] bg-white">
                <SelectValue placeholder={classSubjects.length === 0 ? "কোনো বিষয় নেই" : "বিষয় নির্বাচন"} />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">মাস</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-10 text-[13px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_BN.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">বছর</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-10 text-[13px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">তারিখ</Label>
            <div className="flex gap-1.5">
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-10 text-xs px-2.5 bg-white"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 px-2.5 text-xs font-semibold"
                onClick={() => setExamDate(today())}
              >
                আজ
              </Button>
            </div>
          </div>

          {/* Exam Title with smart suggestion chips */}
          <div className="space-y-1.5 col-span-2 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">পরীক্ষার নাম (টাইটেল)</Label>
              <span className={`text-[11px] font-semibold ${examType === "MODEL" ? "text-purple-700" : "text-emerald-700"}`}>
                {examType === "MODEL" ? "মডেল টেস্ট ক্যাটাগরি" : "মাসিক পরীক্ষা ক্যাটাগরি"}
              </span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={examType === "MODEL" ? "যেমন: মডেল টেস্ট ১" : "যেমন: ক্লাস টেস্ট ১"}
              className="h-10 text-[13px] bg-white font-medium"
              list="exam-titles-list"
            />
            <datalist id="exam-titles-list">
              {(examType === "MODEL" ? MODEL_TITLE_SUGGESTIONS : EXAM_TITLE_SUGGESTIONS).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {(examType === "MODEL" ? MODEL_TITLE_SUGGESTIONS : EXAM_TITLE_SUGGESTIONS).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    title === t
                      ? examType === "MODEL"
                        ? "bg-purple-700 text-white shadow-2xs"
                        : "bg-emerald-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Total Marks */}
          <div className="space-y-1.5 col-span-2 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">পূর্ণমান (মোট নম্বর)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={totalMarks}
              onChange={(e) => setTotalMarks(toEnDigits(e.target.value).replace(/[^0-9]/g, ""))}
              className="h-10 text-[15px] font-bold bg-white"
              placeholder="যেমন: 20, 50 বা 100"
            />
            <div className="flex gap-1 pt-0.5">
              {["20", "25", "50", "75", "100"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTotalMarks(m)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    totalMarks === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {bn(m)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== ২. লাইভ এক্সাম এনালিটিক্স ও সামারি ===================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Progress Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">এন্ট্রি অগ্রগতি</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{bn(stats.completedCount)}</span>
            <span className="text-xs text-slate-500 font-semibold">/ {bn(stats.totalStudents)} জন</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium text-right">{bn(stats.progressPct)}% সম্পন্ন ({bn(stats.pendingCount)} বাকি)</p>
        </div>

        {/* Attendance Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">উপস্থিতি</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{bn(stats.presentWithMarks)}</span>
            <span className="text-xs text-slate-600 font-semibold">উপস্থিত</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>অনুপস্থিত: <strong className="text-red-600">{bn(stats.absentCount)}</strong> জন</span>
            <span>মোট: {bn(stats.totalStudents)}</span>
          </div>
        </div>

        {/* Highest Mark Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">সর্বোচ্চ নম্বর</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700">{fmtNum(stats.highest)}</span>
            <span className="text-xs text-slate-500 font-semibold">/ {bn(total)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 font-medium truncate" title={stats.highestStudentName}>
            {stats.highestStudentName ? `১ম: ${stats.highestStudentName}` : "এখনো কোনো নম্বর নেই"}
          </p>
        </div>

        {/* Class Average & Pass Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">গড় ও পাস হার</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{fmtNum(stats.averageMark)}</span>
            <span className="text-xs text-slate-500 font-semibold">গড় নম্বর</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>পাস: <strong className="text-emerald-700">{fmtPct(stats.passRate)}</strong></span>
            <span>A+: <strong className="text-purple-700">{bn(stats.gpa5Count)}</strong></span>
          </div>
        </div>
      </div>

      {/* ===================== ৩. মোড সুইচ ও প্রধান এন্ট্রি এরিয়া ===================== */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">এন্ট্রি মোড:</span>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "GRID" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>স্প্রেডশিট গ্রিড (সব শিক্ষার্থী একসাথে)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("SINGLE")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "SINGLE" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>একক ফোকাস কার্ড</span>
              </button>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            {stats.dirtyCount > 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 animate-pulse">
                {bn(stats.dirtyCount)} টি পরিবর্তন আনসেভড
              </span>
            )}
            <Button
              onClick={saveAllBatch}
              disabled={savingBatch || loadingStudents || students.length === 0}
              className="h-9 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
            >
              {savingBatch ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              সব সংরক্ষণ করুন
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* -------------------- ৩.১ স্প্রেডশিট গ্রিড মোড (GRID MODE) -------------------- */}
          {viewMode === "GRID" && (
            <div>
              {/* Filter & Search Bar */}
              <div className="p-3 border-b bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="রোল বা নাম দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-50/60 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setFilterStatus("ALL")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      filterStatus === "ALL" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    সকল ({bn(students.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("PENDING")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      filterStatus === "PENDING" ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    বাকি আছে ({bn(stats.pendingCount)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("COMPLETED")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      filterStatus === "COMPLETED" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    এন্ট্রি সম্পন্ন ({bn(stats.completedCount)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("ABSENT")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      filterStatus === "ABSENT" ? "bg-red-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    অনুপস্থিত ({bn(stats.absentCount)})
                  </button>
                </div>
              </div>

              {/* Instruction banner for teachers */}
              <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <strong>কীবোর্ড শর্টকাট:</strong> নম্বর লিখে <strong>Enter</strong> বা <strong>↓</strong> চাপলে পরের রোলে যাবে। অনুপস্থিত হলে <strong>a</strong> টাইপ করুন। বাংলা সংখ্যা স্বয়ংক্রিয়ভাবে কনভার্ট হবে।
                </span>
                <span>মোট ফিল্টার্ড: {bn(filteredStudents.length)} জন</span>
              </div>

              {/* Main Grid Table */}
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
                  শিক্ষার্থীদের তালিকা লোড হচ্ছে...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  কোনো শিক্ষার্থী পাওয়া যায়নি। শ্রেণি ও বিভাগ ঠিক আছে কিনা পরীক্ষা করুন।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-slate-100/75 text-slate-700 font-bold uppercase text-[11px]">
                        <th className="py-2.5 px-3 w-16 text-center">রোল</th>
                        <th className="py-2.5 px-3 min-w-[180px]">শিক্ষার্থীর নাম</th>
                        <th className="py-2.5 px-3 w-32 text-center">উপস্থিতি</th>
                        <th className="py-2.5 px-3 w-36">প্রাপ্ত নম্বর (০–{bn(total)})</th>
                        <th className="py-2.5 px-3 w-28 text-center">শতকরা</th>
                        <th className="py-2.5 px-3 w-28 text-center">গ্রেড / GPA</th>
                        <th className="py-2.5 px-3 w-24 text-center">অবস্থা</th>
                        <th className="py-2.5 px-3 w-20 text-center">সেভ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredStudents.map((student, idx) => {
                        const st = marksState[student.id] ?? {
                          obtained: "",
                          attendance: "PRESENT",
                          isDirty: false,
                          isSaved: false,
                        };
                        const isAbsent = st.attendance === "ABSENT";
                        const numVal = isAbsent ? 0 : Number(st.obtained);
                        const hasVal = st.obtained !== "" && !isNaN(numVal);
                        const isExceeded = !isAbsent && hasVal && numVal > total;
                        const pct = total > 0 && hasVal ? (isAbsent ? 0 : (Math.min(numVal, total) / total) * 100) : 0;
                        const gradeObj = gradeFromPercentage(pct);
                        const isSavingThis = savingSingleId === student.id;

                        return (
                          <tr
                            key={student.id}
                            className={`transition hover:bg-slate-50/80 ${
                              st.isDirty ? "bg-amber-50/30" : idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                            }`}
                          >
                            {/* Roll */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center font-black text-slate-800 bg-slate-100 rounded-md px-2 py-1 text-xs">
                                {bn(student.roll)}
                              </span>
                            </td>

                            {/* Name & section */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-[13px]">{student.name}</span>
                                <span className="text-[11px] text-slate-400">
                                  {student.section ? `শাখা ${student.section}` : "রোল " + bn(student.roll)}
                                </span>
                              </div>
                            </td>

                            {/* Attendance Toggle */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateStudentMark(
                                    student.id,
                                    "attendance",
                                    isAbsent ? "PRESENT" : "ABSENT"
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                  isAbsent
                                    ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200"
                                }`}
                              >
                                {isAbsent ? <XCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                {isAbsent ? "অনুপস্থিত" : "উপস্থিত"}
                              </button>
                            </td>

                            {/* Obtained Mark Input */}
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <input
                                  ref={(el) => {
                                    inputRefs.current[student.id] = el;
                                  }}
                                  type="text"
                                  inputMode="decimal"
                                  disabled={isAbsent}
                                  value={isAbsent ? "0" : st.obtained}
                                  onChange={(e) => updateStudentMark(student.id, "obtained", e.target.value)}
                                  onKeyDown={(e) => handleKeyDownInGrid(e, idx)}
                                  placeholder={isAbsent ? "অনুপস্থিত" : "নম্বর লিখুন"}
                                  className={`w-full h-9 rounded-md px-2.5 text-sm font-bold text-slate-900 border transition outline-hidden ${
                                    isAbsent
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed text-center"
                                      : isExceeded
                                      ? "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200"
                                      : st.isDirty
                                      ? "border-amber-400 bg-amber-50/40"
                                      : "border-slate-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                  }`}
                                />
                                {isExceeded && (
                                  <span className="block text-[10px] font-bold text-red-600 mt-0.5">
                                    মোট {bn(total)}-এর বেশি!
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Percentage */}
                            <td className="py-2.5 px-3 text-center">
                              {hasVal || isAbsent ? (
                                <span className="font-bold text-slate-700 text-xs">{fmtNum(Math.round(pct * 100) / 100)}%</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Grade & GPA */}
                            <td className="py-2.5 px-3 text-center">
                              {hasVal || isAbsent ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black ${
                                    gradeObj.grade === "A+"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : gradeObj.grade === "F"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {gradeObj.grade} <span className="font-normal text-[10px]">({bn(gradeObj.gpa.toFixed(2))})</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Save Status Badge */}
                            <td className="py-2.5 px-3 text-center">
                              {st.isDirty ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                                  আনসেভড
                                </span>
                              ) : st.isSaved ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Check className="h-3 w-3" /> সেভড
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">খালি</span>
                              )}
                            </td>

                            {/* Row Action: Quick Save button */}
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant={st.isDirty ? "default" : "ghost"}
                                disabled={isSavingThis || isExceeded || (!st.isDirty && !st.isSaved)}
                                onClick={() => saveSingleStudent(student.id)}
                                className={`h-7 px-2 text-[11px] font-bold ${
                                  st.isDirty
                                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                {isSavingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom Sticky Action Bar */}
              <div className="sticky bottom-0 border-t bg-white/95 backdrop-blur-xs p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    মোট শিক্ষার্থী: <strong>{bn(students.length)} জন</strong>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">
                    এন্ট্রি সম্পন্ন: {bn(stats.completedCount)} জন ({bn(stats.progressPct)}%)
                  </span>
                  {stats.dirtyCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                        {bn(stats.dirtyCount)} টি পরিবর্তন সংরক্ষিত হয়নি
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={checkExistingExam}
                    disabled={loadingExisting}
                    className="h-9 px-3 text-xs font-semibold"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    পুনরায় লোড
                  </Button>
                  <Button
                    onClick={saveAllBatch}
                    disabled={savingBatch || loadingStudents || students.length === 0}
                    className="h-9 px-5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  >
                    {savingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    সব একবারে সংরক্ষণ করুন
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- ৩.২ একক ফোকাস মোড (SINGLE CARD MODE) -------------------- */}
          {viewMode === "SINGLE" && (
            <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
              {/* Student Jump Selector & Navigation */}
              <div className="flex items-center justify-between gap-2 border-b pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSingleIndex <= 0}
                  onClick={() => {
                    const prev = students[currentSingleIndex - 1];
                    if (prev) setSingleStudentId(prev.id);
                  }}
                  className="h-9 px-3 text-xs font-bold"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> আগের শিক্ষার্থী
                </Button>

                <div className="flex-1 max-w-xs">
                  <Select
                    value={singleStudentId ? String(singleStudentId) : ""}
                    onValueChange={(v) => setSingleStudentId(Number(v))}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold bg-white">
                      <SelectValue placeholder="শিক্ষার্থী নির্বাচন" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          রোল {bn(s.roll)} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSingleIndex >= students.length - 1}
                  onClick={() => {
                    const next = students[currentSingleIndex + 1];
                    if (next) setSingleStudentId(next.id);
                  }}
                  className="h-9 px-3 text-xs font-bold"
                >
                  পরবর্তী <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>

              {currentSingleStudent ? (
                <div className="space-y-4">
                  {/* Student Highlight Banner */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg border-2 border-emerald-300">
                        {bn(currentSingleStudent.roll)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{currentSingleStudent.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">
                          রোল: {bn(currentSingleStudent.roll)}
                          {currentSingleStudent.section ? ` • শাখা: ${currentSingleStudent.section}` : ""}
                          {` • ক্রম: ${bn(currentSingleIndex + 1)} / ${bn(students.length)}`}
                        </p>
                      </div>
                    </div>

                    {currentSingleMark?.isSaved && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> সেভ করা আছে
                      </span>
                    )}
                  </div>

                  {/* Attendance Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">উপস্থিতি</Label>
                    <RadioGroup
                      value={currentSingleMark?.attendance ?? "PRESENT"}
                      onValueChange={(v) => updateStudentMark(currentSingleStudent.id, "attendance", v)}
                      className="flex h-11 items-center gap-4 rounded-md border border-input px-4 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="PRESENT" id="single-present" />
                        <Label htmlFor="single-present" className="font-semibold text-xs cursor-pointer">
                          উপস্থিত
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="ABSENT" id="single-absent" />
                        <Label htmlFor="single-absent" className="font-semibold text-xs cursor-pointer text-red-600">
                          অনুপস্থিত
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Obtained Marks Input & Live Calculation */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">প্রাপ্ত নম্বর (০–{bn(total)})</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={currentSingleMark?.attendance === "ABSENT" ? "0" : currentSingleMark?.obtained ?? ""}
                        onChange={(e) => updateStudentMark(currentSingleStudent.id, "obtained", e.target.value)}
                        disabled={currentSingleMark?.attendance === "ABSENT"}
                        className="h-14 text-2xl font-black bg-white"
                        placeholder="যেমন: 17.5"
                      />
                      {currentSingleMark?.attendance === "ABSENT" ? (
                        <p className="text-[12px] font-semibold text-amber-600">অনুপস্থিত — নম্বর স্বয়ংক্রিয়ভাবে ০ হবে।</p>
                      ) : singleObtainedNum > total ? (
                        <p className="text-[12px] font-bold text-red-600">প্রাপ্ত নম্বর মোট নম্বর {bn(total)}-এর বেশি হতে পারে না!</p>
                      ) : null}
                    </div>

                    {/* Instant Calculation Preview */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">তাৎক্ষণিক হিসাব (সার্ভার মান্য)</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-semibold">শতকরা</span>
                          <span className="text-xl font-black text-slate-900">{fmtNum(Math.round(singlePct * 100) / 100)}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-semibold">গ্রেড ও জিপিএ</span>
                          <span className="text-xl font-black text-slate-900">
                            {singleGrade.grade} <span className="text-sm font-bold text-slate-500">/ {bn(singleGrade.gpa.toFixed(2))}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <Button
                      onClick={() => saveSingleStudent(currentSingleStudent.id)}
                      disabled={savingSingleId === currentSingleStudent.id || singleObtainedNum > total}
                      className="h-11 flex-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {savingSingleId === currentSingleStudent.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      সংরক্ষণ করুন
                    </Button>

                    <Button
                      variant="default"
                      onClick={async () => {
                        await saveSingleStudent(currentSingleStudent.id);
                        const next = students[currentSingleIndex + 1];
                        if (next) setSingleStudentId(next.id);
                        else toast({ title: "এই শ্রেণির সব শিক্ষার্থীর নম্বর দেওয়া শেষ হয়েছে।" });
                      }}
                      disabled={savingSingleId === currentSingleStudent.id || singleObtainedNum > total}
                      className="h-11 flex-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      সংরক্ষণ করে পরবর্তী শিক্ষার্থী (Enter)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">কোনো শিক্ষার্থী নির্বাচিত নেই।</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate confirmation dialog */}
      <AlertDialog
        open={!!dupPrompt}
        onOpenChange={(o) => {
          if (!o) {
            dupPrompt?.resolve(false);
            setDupPrompt(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> নম্বর ইতোমধ্যে ডাটাবেজে আছে
            </AlertDialogTitle>
            <AlertDialogDescription>
              এই শিক্ষার্থীর এই পরীক্ষার নম্বর ইতোমধ্যে সেভ করা আছে। আপনি কি নতুন নম্বর দিয়ে আপডেট করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                dupPrompt?.resolve(false);
                setDupPrompt(null);
              }}
            >
              না
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                dupPrompt?.resolve(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              হ্যাঁ, আপডেট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
