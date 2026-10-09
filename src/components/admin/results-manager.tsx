"use client";

// Results management (admin): exam list with filters + per-mark edit/delete.

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { PrintSignatures } from "@/components/app/print-signatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CLASS_NUMBERS, MONTHS_BN, bn, classLabel, divisionLabel, fmtNum } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ExamRowT {
  id: number;
  title: string;
  exam_date: string;
  month: number;
  year: number;
  total_marks: number;
  division: string | null;
  subject_name: string;
  class_name: string;
  mark_count: number;
  highest: number | null;
}

interface MarkRowT {
  id: number;
  student_id: number;
  attendance: string;
  obtained_marks: number;
  name: string;
  roll: number;
  section: string | null;
}

export function ResultsManager() {
  const [className, setClassName] = useState("10");
  const [division, setDivision] = useState("SCIENCE");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [exams, setExams] = useState<ExamRowT[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<ExamRowT | null>(null);
  const [marks, setMarks] = useState<MarkRowT[] | null>(null);
  const [editing, setEditing] = useState<MarkRowT | null>(null);
  const [editObtained, setEditObtained] = useState("");
  const [editAttendance, setEditAttendance] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadExams = useCallback(async () => {
    setLoading(true);
    setActive(null);
    try {
      const p = new URLSearchParams({ class: className, month, year });
      if (className === "9" || className === "10") p.set("division", division);
      const res = await fetch(`/api/marks?${p.toString()}`);
      const json = await res.json();
      if (json.ok) setExams(json.exams ?? []);
    } finally {
      setLoading(false);
    }
  }, [className, division, month, year]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  async function openExam(ex: ExamRowT) {
    setActive(ex);
    setMarks(null);
    const res = await fetch(`/api/marks?examId=${ex.id}`);
    const json = await res.json();
    if (json.ok) setMarks(json.marks ?? []);
    else toast({ title: json.error ?? "লোড করা যায়নি।", variant: "destructive" });
  }

  async function saveEdit() {
    if (!editing) return;
    const total = active!.total_marks;
    const v = Number(editObtained);
    if (editAttendance === "PRESENT" && (isNaN(v) || v < 0 || v > total)) {
      toast({ title: `ভুল নম্বর — ০ থেকে ${total} এর মধ্যে হতে হবে।`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/marks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obtainedMarks: editAttendance === "ABSENT" ? 0 : v,
          attendance: editAttendance,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "আপডেট করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setEditing(null);
      openExam(active!);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMark(m: MarkRowT) {
    const res = await fetch(`/api/marks/${m.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast({ title: json.error ?? "মুছে ফেলা যায়নি।", variant: "destructive" });
      return;
    }
    toast({ title: json.message });
    openExam(active!);
  }

  const requiresDiv = className === "9" || className === "10";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-[12px]">শ্রেণি</Label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((c) => (
                    <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiresDiv && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">বিভাগ</Label>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCIENCE">বিজ্ঞান</SelectItem>
                    <SelectItem value="HUMANITIES">মানবিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[12px]">মাস</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_BN.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">বছর</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[Number(year) + 1, Number(year), Number(year) - 1, Number(year) - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="h-10 w-full gap-2" onClick={loadExams} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} খুঁজুন
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* exam list */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 text-[15px] font-bold">পরীক্ষাসমূহ ({bn(exams.length)})</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted/60 text-left text-[12px]">
                  <th className="px-3 py-2 font-semibold">বিষয়</th>
                  <th className="px-3 py-2 font-semibold">পরীক্ষা</th>
                  <th className="px-3 py-2 font-semibold">তারিখ</th>
                  <th className="px-3 py-2 text-right font-semibold">মোট</th>
                  <th className="px-3 py-2 text-right font-semibold">সর্বোচ্চ</th>
                  <th className="px-3 py-2 text-center font-semibold">নম্বর সংখ্যা</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {exams.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">এই তথ্য পাওয়া যায়নি।</td></tr>
                ) : (
                  exams.map((ex) => (
                    <tr
                      key={ex.id}
                      className={cn("cursor-pointer hover:bg-accent/40", active?.id === ex.id && "bg-accent/60")}
                      onClick={() => openExam(ex)}
                    >
                      <td className="px-3 py-2 font-medium">{ex.subject_name}</td>
                      <td className="px-3 py-2">{ex.title}</td>
                      <td className="px-3 py-2">{bn(ex.exam_date)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(ex.total_marks)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(ex.highest ?? 0)}</td>
                      <td className="px-3 py-2 text-center">{bn(ex.mark_count)}</td>
                      <td className="px-3 py-2 text-right text-primary">দেখুন →</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* marks of active exam */}
      {active && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-1 text-[15px] font-bold">
              {active.subject_name} — {active.title} ({classLabel(active.class_name)}
              {active.division ? ` — ${divisionLabel(active.division)}` : ""})
            </h3>
            <p className="mb-3 text-[12px] text-muted-foreground">
              {MONTHS_BN[active.month - 1]} {bn(active.year)} • তারিখ: {bn(active.exam_date)} • মোট নম্বর: {fmtNum(active.total_marks)}
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-[12px]">
                    <th className="px-3 py-2 font-semibold">রোল</th>
                    <th className="px-3 py-2 font-semibold">শিক্ষার্থী</th>
                    <th className="px-3 py-2 font-semibold">উপস্থিতি</th>
                    <th className="px-3 py-2 text-right font-semibold">প্রাপ্ত</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {marks === null ? (
                    <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">লোড হচ্ছে…</td></tr>
                  ) : marks.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">কোনো নম্বর নেই।</td></tr>
                  ) : (
                    marks.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2">{bn(m.roll)}</td>
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2">
                          {m.attendance === "ABSENT" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">অনুপস্থিত</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">উপস্থিত</span>
                          )}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-semibold", m.attendance === "ABSENT" && "text-red-600")}>{fmtNum(m.obtained_marks)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                setEditing(m);
                                setEditObtained(String(m.obtained_marks));
                                setEditAttendance(m.attendance as "PRESENT" | "ABSENT");
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>মুছে ফেলার নিশ্চয়তা</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {m.name}-এর এই নম্বর মুছে ফেলা হবে। আপনি কি নিশ্চিত?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>না</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMark(m)}>মুছে ফেলুন</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Point 08: Automatic Director signature on printed sheet */}
            <div className="hidden print:block">
              <PrintSignatures isSingleTeacher={false} showGuardian={false} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* edit mark dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>নম্বর সংশোধন — {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>উপস্থিতি</Label>
                <RadioGroup
                  value={editAttendance}
                  onValueChange={(v) => setEditAttendance(v as "PRESENT" | "ABSENT")}
                  className="flex h-11 items-center gap-4 rounded-md border border-input px-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PRESENT" id="e-present" />
                    <Label htmlFor="e-present" className="font-normal">উপস্থিত</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ABSENT" id="e-absent" />
                    <Label htmlFor="e-absent" className="font-normal">অনুপস্থিত</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label>প্রাপ্ত নম্বর (মোট {bn(active!.total_marks)})</Label>
                <Input
                  type="number" min={0} max={active!.total_marks} step="0.01"
                  value={editAttendance === "ABSENT" ? "0" : editObtained}
                  onChange={(e) => setEditObtained(e.target.value)}
                  disabled={editAttendance === "ABSENT"}
                  className="h-12 text-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-11 px-5" onClick={() => setEditing(null)}>বাতিল</Button>
                <Button className="h-11 px-5" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} আপডেট করুন
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
