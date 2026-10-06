"use client";

// Fast mobile-first marks entry (spec 16–28).
// Context (class, division, month, year, date, subject, title, total) is
// preserved between saves — only student / attendance / obtained change.
// All authoritative calculations happen server-side in /api/marks.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CLASS_NUMBERS,
  DIVISIONS,
  EXAM_TITLE_SUGGESTIONS,
  MONTHS_BN,
  bn,
  fmtNum,
  gradeFromPercentage,
} from "@/lib/constants";

export interface EntrySubject {
  id: number;
  name: string;
  className: string;
  classId: number;
  isFourth: boolean;
}

interface StudentOpt {
  id: number;
  name: string;
  roll: number;
  section: string | null;
  photo_key: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function MarksEntry({ subjects }: { subjects: EntrySubject[] }) {
  const now = new Date();
  const [className, setClassName] = useState<string>("10");
  const [division, setDivision] = useState<string>("SCIENCE");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [examDate, setExamDate] = useState<string>(today());
  const [title, setTitle] = useState<string>("ক্লাস টেস্ট ১");
  const [totalMarks, setTotalMarks] = useState<string>("20");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [obtained, setObtained] = useState<string>("");
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState<null | { resolve: (v: boolean) => void }>(null);
  const [lastSaved, setLastSaved] = useState<null | { obtained: number; highest: number; name: string }>(null);
  const { toast } = useToast();

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.className === className),
    [subjects, className]
  );
  const requiresDivision = className === "9" || className === "10";
  const years = useMemo(() => {
    const cur = now.getFullYear();
    return [cur + 1, cur, cur - 1, cur - 2, cur - 3];
  }, [now]);

  // keep subject valid for class
  useEffect(() => {
    if (!classSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(classSubjects[0]?.id ?? null);
    }
  }, [classSubjects, subjectId]);

  // load students of class + division
  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ class: className });
      if (requiresDivision) params.set("division", division);
      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setStudents(json.students ?? []);
        setStudentId(null);
      }
    } finally {
      setLoadingStudents(false);
    }
  }, [className, division, requiresDivision]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const total = Math.max(0, Math.floor(Number(totalMarks) || 0));
  const obtainedNum = Number(obtained) || 0;
  const previewPct = total > 0 ? (attendance === "ABSENT" ? 0 : (Math.min(obtainedNum, total) / total) * 100) : 0;
  const previewGrade = gradeFromPercentage(previewPct);
  const canSave =
    !!subjectId &&
    !!studentId &&
    title.trim().length > 0 &&
    total > 0 &&
    (attendance === "ABSENT" || (obtainedNum >= 0 && obtainedNum <= total));

  async function sendSave(confirmUpdate: boolean): Promise<{ ok: boolean; json: any }> {
    const payload = {
      classId: classSubjects.find((s) => s.id === subjectId)?.classId,
      division: requiresDivision ? division : null,
      subjectId,
      month,
      year,
      examDate,
      title: title.trim(),
      totalMarks: total,
      studentId,
      attendance,
      obtainedMarks: attendance === "ABSENT" ? 0 : Math.min(obtainedNum, total),
      confirmUpdate,
    };
    const res = await fetch("/api/marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { ok: res.ok, json };
  }

  function resetAfterSave(advance: boolean) {
    setObtained("");
    setAttendance("PRESENT");
    if (advance && studentId) {
      const idx = students.findIndex((s) => s.id === studentId);
      const next = students[idx + 1];
      if (next) setStudentId(next.id);
      else toast({ title: "এই শ্রেণির সব শিক্ষার্থীর নম্বর দেওয়া হয়েছে।" });
    }
  }

  async function doSave(advance: boolean) {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      let { ok, json } = await sendSave(false);
      if (json && json.duplicate) {
        const update = await new Promise<boolean>((resolve) => setDup({ resolve }));
        setDup(null);
        if (!update) return;
        ({ ok, json } = await sendSave(true));
      }
      if (!ok || !json?.ok) {
        toast({ title: json?.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      setLastSaved({
        obtained: json.obtained,
        highest: json.highest,
        name: students.find((s) => s.id === studentId)?.name ?? "",
      });
      toast({ title: json.message ?? "সফলভাবে সংরক্ষণ করা হয়েছে।" });
      resetAfterSave(advance);
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const selectedStudent = students.find((s) => s.id === studentId);

  return (
    <div className="space-y-4">
      {/* ---- পরীক্ষার তথ্য ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[16px]">পরীক্ষার তথ্য</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>শ্রেণি</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASS_NUMBERS.map((c) => (
                  <SelectItem key={c} value={c}>{bn(c)} শ্রেণি</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresDivision && (
            <div className="space-y-1.5">
              <Label>বিভাগ</Label>
              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>বিষয়</Label>
            <Select value={subjectId ? String(subjectId) : ""} onValueChange={(v) => setSubjectId(Number(v))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="বিষয় নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {classSubjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>মাস</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_BN.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>বছর</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>তারিখ</Label>
            <div className="flex gap-2">
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="h-11" />
              <Button type="button" variant="outline" className="h-11 shrink-0 px-3" onClick={() => setExamDate(today())}>
                আজ
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>পরীক্ষার নাম</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: ক্লাস টেস্ট ১"
              className="h-11"
              list="exam-titles"
            />
            <datalist id="exam-titles">
              {EXAM_TITLE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
            </datalist>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAM_TITLE_SUGGESTIONS.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="rounded-full bg-accent px-3 py-1 text-[12px] text-accent-foreground hover:bg-primary hover:text-white"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>মোট নম্বর</Label>
            <Input
              type="number" inputMode="numeric" min={1} max={1000}
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="h-11"
              placeholder="20 / 50 / 100"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- শিক্ষার্থী ও নম্বর ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[16px]">শিক্ষার্থী ও নম্বর</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>শিক্ষার্থী</Label>
              {loadingStudents ? (
                <div className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-[13px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে…
                </div>
              ) : students.length === 0 ? (
                <div className="flex h-11 items-center rounded-md border border-dashed border-input px-3 text-[13px] text-muted-foreground">
                  এই শ্রেণি/বিভাগে কোনো শিক্ষার্থী নেই।
                </div>
              ) : (
                <Select value={studentId ? String(studentId) : ""} onValueChange={(v) => setStudentId(Number(v))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="শিক্ষার্থী নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} — রোল {bn(s.roll)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>উপস্থিতি</Label>
              <RadioGroup
                value={attendance}
                onValueChange={(v) => setAttendance(v as "PRESENT" | "ABSENT")}
                className="flex h-11 items-center gap-4 rounded-md border border-input px-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="PRESENT" id="r-present" />
                  <Label htmlFor="r-present" className="font-normal">উপস্থিত</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ABSENT" id="r-absent" />
                  <Label htmlFor="r-absent" className="font-normal">অনুপস্থিত</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>প্রাপ্ত নম্বর (০–{bn(total)})</Label>
              <Input
                type="number" inputMode="decimal" min={0} max={total} step="0.01"
                value={attendance === "ABSENT" ? "0" : obtained}
                onChange={(e) => setObtained(e.target.value)}
                disabled={attendance === "ABSENT"}
                className="h-12 text-lg"
                placeholder="যেমন: 17"
              />
              {attendance === "ABSENT" && (
                <p className="text-[12px] text-amber-600">অনুপস্থিত — নম্বর স্বয়ংক্রিয়ভাবে ০ হবে।</p>
              )}
              {attendance === "PRESENT" && total > 0 && obtained !== "" && obtainedNum > total && (
                <p className="text-[12px] text-red-600">ভুল নম্বর প্রদান করা হয়েছে — মোট নম্বরের বেশি।</p>
              )}
            </div>

            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">তাৎক্ষণিক হিসাব (সার্ভার অনুমোদিত হবে)</p>
              <div className="mt-1 flex items-end gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">শতকরা</p>
                  <p className="text-xl font-bold">{fmtNum(Math.round(previewPct * 100) / 100)}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">গ্রেড / জিপিএ</p>
                  <p className="text-xl font-bold">
                    {previewGrade.grade} <span className="text-[14px] text-muted-foreground">/ {bn(previewGrade.gpa.toFixed(2))}</span>
                  </p>
                </div>
              </div>
              {lastSaved && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  সর্বোচ্চ নম্বর (এ পরীক্ষায়): {fmtNum(lastSaved.highest)} — {lastSaved.name}: {fmtNum(lastSaved.obtained)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-12 flex-1 text-[15px]" disabled={!canSave || saving} onClick={() => doSave(false)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              সংরক্ষণ করুন
            </Button>
            <Button variant="secondary" className="h-12 flex-1 text-[15px]" disabled={!canSave || saving} onClick={() => doSave(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              সংরক্ষণ করে পরবর্তী শিক্ষার্থী
            </Button>
          </div>
          {selectedStudent && (
            <p className="text-[12px] text-muted-foreground">
              নির্বাচিত: {selectedStudent.name} — রোল {bn(selectedStudent.roll)}
              {selectedStudent.section ? `, শাখা ${selectedStudent.section}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* duplicate confirmation */}
      <AlertDialog open={!!dup} onOpenChange={(o) => { if (!o) { dup?.resolve(false); setDup(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> নম্বর ইতোমধ্যে আছে
            </AlertDialogTitle>
            <AlertDialogDescription>
              এই পরীক্ষার নম্বর ইতোমধ্যে দেওয়া হয়েছে। আপনি কি আপডেট করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { dup?.resolve(false); setDup(null); }}>না</AlertDialogCancel>
            <AlertDialogAction onClick={() => { dup?.resolve(true); }}>হ্যাঁ, আপডেট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
