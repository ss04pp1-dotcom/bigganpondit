"use client";

// Student management: grouped list + add/edit/delete/view dialogs.
// Spec 11–15. Teachers may manage only students of their authorized classes
// (enforced server-side in the API).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { StudentAvatar } from "@/components/app/student-avatar";
import { ImageUpload } from "@/components/app/image-upload";
import { cn } from "@/lib/utils";
import {
  CLASS_NUMBERS,
  DIVISIONS,
  MONTHS_BN,
  SECTION_SUGGESTIONS,
  bn,
  classLabel,
  divisionLabel,
  fmtNum,
  groupLabel,
} from "@/lib/constants";

interface Row {
  id: number;
  name: string;
  roll: number;
  division: string | null;
  section: string | null;
  photo_key: string | null;
  class_name: string;
  username: string;
}

interface FormState {
  id?: number;
  name: string;
  className: string;
  division: string;
  section: string;
  roll: string;
  username: string;
  password: string;
  photo_key: string | null;
}

const emptyForm: FormState = {
  name: "",
  className: "6",
  division: "SCIENCE",
  section: "",
  roll: "",
  username: "",
  password: "",
  photo_key: null,
};

type Filter = "ALL" | "10-SCIENCE" | "10-HUMANITIES" | "9-SCIENCE" | "9-HUMANITIES" | "8" | "7" | "6";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "সবাই" },
  { key: "10-SCIENCE", label: "১০ম বিজ্ঞান" },
  { key: "10-HUMANITIES", label: "১০ম মানবিক" },
  { key: "9-SCIENCE", label: "৯ম বিজ্ঞান" },
  { key: "9-HUMANITIES", label: "৯ম মানবিক" },
  { key: "8", label: "৮ম" },
  { key: "7", label: "৭ম" },
  { key: "6", label: "৬ষ্ঠ" },
];

function matches(row: Row, f: Filter): boolean {
  if (f === "ALL") return true;
  if (f === "8" || f === "7" || f === "6") return row.class_name === f;
  const [cls, div] = f.split("-");
  return row.class_name === cls && row.division === div;
}

// distinct visual styling per class (spec 14)
const CLASS_STYLE: Record<string, string> = {
  "10": "border-l-blue-500 bg-blue-50/40",
  "9": "border-l-violet-500 bg-violet-50/40",
  "8": "border-l-emerald-500 bg-emerald-50/40",
  "7": "border-l-amber-500 bg-amber-50/40",
  "6": "border-l-rose-500 bg-rose-50/40",
};

export function StudentManager({ canCreate = true }: { canCreate?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const pendingPreview = useMemo(() => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : null), [pendingPhoto]);
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students" + (q ? `?q=${encodeURIComponent(q)}` : ""));
      const json = await res.json();
      if (json.ok) setRows(json.students ?? []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => rows.filter((r) => matches(r, filter)), [rows, filter]);
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of visible) {
      const key = `${r.class_name}|${r.division ?? ""}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.entries()].sort((a, b) => {
      const ca = Number(a[0].split("|")[0]);
      const cb = Number(b[0].split("|")[0]);
      if (cb !== ca) return cb - ca;
      return a[0].localeCompare(b[0]);
    });
  }, [visible]);

  async function save() {
    if (!form) return;
    const requiresDiv = form.className === "9" || form.className === "10";
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      className: form.className,
      division: requiresDiv ? form.division : null,
      section: form.section.trim() || null,
      roll: Number(form.roll),
      username: form.username.trim(),
      password: form.password,
    };
    if (form.id && !payload.password) delete payload.password;
    if (!payload.name || !payload.roll || !payload.username || (!form.id && !payload.password)) {
      toast({ title: "সব ঘর পূরণ করুন।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/students/${form.id}` : "/api/students", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      if (!form.id && json.studentId && pendingPhoto) {
        try {
          const fd = new FormData();
          fd.append("file", pendingPhoto);
          fd.append("type", "student-photo");
          fd.append("studentId", String(json.studentId));
          const uploadRes = await fetch("/api/uploads", { method: "POST", body: fd });
          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok || !uploadJson.ok) throw new Error(uploadJson.error ?? "upload failed");
        } catch {
          toast({ title: "শিক্ষার্থী তৈরি হয়েছে, কিন্তু ছবি আপলোড হয়নি। সম্পাদনা থেকে আবার আপলোড করুন।", variant: "destructive" });
        }
      }
      toast({ title: json.message });
      setPendingPhoto(null);
      setForm(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    const res = await fetch(`/api/students/${row.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast({ title: json.error ?? "মুছে ফেলা যায়নি।", variant: "destructive" });
      return;
    }
    toast({ title: json.message });
    await load();
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="নাম বা রোল দিয়ে খুঁজুন…"
              className="h-10 pl-9"
            />
          </div>
          {canCreate && (
            <Button className="h-10 gap-2" onClick={() => { setPendingPhoto(null); setForm({ ...emptyForm }); }}>
              <UserPlus className="h-4 w-4" /> তথ্য সংযুক্ত করুন
            </Button>
          )}
        </CardContent>
      </Card>

      {/* filter tabs */}
      <div className="app-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
              filter === f.key
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* grouped list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> লোড হচ্ছে…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-muted-foreground">
          কোনো শিক্ষার্থী পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, list]) => {
            const [cls, div] = key.split("|");
            const label = div ? groupLabel(cls, div) : `${bn(cls)} শ্রেণি`;
            return (
              <section key={key} className={cn("print-avoid-break overflow-hidden rounded-xl border border-border border-l-4", CLASS_STYLE[cls] ?? "")}>
                <header className="flex items-center justify-between bg-white/70 px-4 py-2.5">
                  <h3 className="text-[14px] font-bold">{classLabel(cls)}{div ? ` — ${divisionLabel(div)}` : ""}</h3>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground border border-border">
                    {bn(list.length)} জন
                  </span>
                </header>
                <ul className="divide-y divide-border/70">
                  {list.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 bg-white/40 px-4 py-3">
                      <StudentAvatar photoKey={row.photo_key} name={row.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{row.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          রোল {bn(row.roll)}
                          {row.division ? ` • ${divisionLabel(row.division)}` : ""}
                          {row.section ? ` • শাখা ${row.section}` : ""} • @{row.username}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 rounded text-[11px] font-semibold bg-[#0d6efd] text-white hover:bg-[#0b5ed7] shadow-xs"
                          onClick={() => setViewId(row.id)}
                        >
                          ভিউ
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 rounded text-[11px] font-semibold bg-[#f59e0b] text-white hover:bg-[#d97706] shadow-xs"
                          onClick={() => {
                            setPendingPhoto(null);
                            setForm({
                              id: row.id,
                              name: row.name,
                              className: row.class_name,
                              division: row.division ?? "SCIENCE",
                              section: row.section ?? "",
                              roll: String(row.roll),
                              username: row.username,
                              password: "",
                              photo_key: row.photo_key,
                            });
                          }}
                        >
                          এডিট
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 rounded text-[11px] font-semibold bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-xs"
                            >
                              ডিলিট
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>মুছে ফেলার নিশ্চয়তা</AlertDialogTitle>
                              <AlertDialogDescription>
                                {row.name} (রোল {bn(row.roll)})-কে মুছে ফেলা হবে। এই শিক্ষার্থীর সব নম্বরও মুছে যাবে। এই তথ্য মুছে ফেলা হবে — আপনি কি নিশ্চিত?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>না</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(row.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                হ্যাঁ, মুছে ফেলুন
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* add/edit dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "শিক্ষার্থী সম্পাদনা" : "নতুন শিক্ষার্থী"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>শিক্ষার্থীর নাম</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" placeholder="পূর্ণ নাম" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>শ্রেণি</Label>
                  <Select value={form.className} onValueChange={(v) => setForm({ ...form, className: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASS_NUMBERS.map((c) => (
                        <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.className === "9" || form.className === "10") && (
                  <div className="space-y-1.5">
                    <Label>বিভাগ</Label>
                    <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
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
                  <Label>শাখা (ঐচ্ছিক)</Label>
                  <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="h-11" placeholder="ক / খ" list="sections" />
                  <datalist id="sections">
                    {SECTION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>রোল</Label>
                  <Input type="number" min={1} value={form.roll} onChange={(e) => setForm({ ...form, roll: e.target.value })} className="h-11" placeholder="যেমন: ৭" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম (লগইন)</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11" placeholder="student025" />
                </div>
                <div className="space-y-1.5">
                  <Label>পাসওয়ার্ড {form.id ? "(খালি রাখলে অপরিবর্তিত)" : ""}</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" placeholder="••••" />
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-input p-3">
                {form.id ? (
                  <ImageUpload
                    type="student-photo"
                    studentId={form.id}
                    currentUrl={form.photo_key ? `/api/files/${form.photo_key}` : null}
                    label="শিক্ষার্থীর ছবি"
                    onUploaded={(key) => setForm({ ...form, photo_key: key })}
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted">
                      {pendingPreview ? <img src={pendingPreview} alt="শিক্ষার্থীর ছবি" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">ছবি নেই</span>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[13px] font-medium">শিক্ষার্থীর ছবি</p>
                      <p className="text-[12px] text-muted-foreground">JPG / JPEG / PNG — সর্বোচ্চ ৫ MB</p>
                      <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast({ title: "ফাইলটি অনেক বড় (সর্বোচ্চ ৫ MB)।", variant: "destructive" });
                            e.target.value = "";
                            setPendingPhoto(null);
                            return;
                          }
                          setPendingPhoto(f);
                        }} className="h-10" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setForm(null)} className="h-11 px-5">বাতিল</Button>
                <Button onClick={save} disabled={saving} className="h-11 gap-2 px-5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? null : <Plus className="h-4 w-4" />}
                  {form.id ? "আপডেট করুন" : "তথ্য সংযুক্ত করুন"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* view dialog */}
      <StudentViewDialog studentId={viewId} onClose={() => setViewId(null)} students={rows} />
    </div>
  );
}

function StudentViewDialog({
  studentId,
  onClose,
  students,
}: {
  studentId: number | null;
  onClose: () => void;
  students: Row[];
}) {
  const [data, setData] = useState<{
    forId: number;
    forYear: number;
    rows: {
      subjectName: string;
      title: string;
      total: number;
      obtained: number;
      highest: number;
      grade: string;
      month: number;
      year: number;
      attendance: string;
    }[];
  } | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    fetch(`/api/results?type=search&studentId=${studentId}&year=${year}`)
      .then((r) => r.json())
      .then((json) => {
        if (active) setData({ forId: studentId, forYear: year, rows: json.rows ?? [] });
      })
      .catch(() => {
        if (active) setData({ forId: studentId, forYear: year, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [studentId, year]);

  const rows = data && data.forId === studentId && data.forYear === year ? data.rows : null;
  const student = students.find((s) => s.id === studentId);

  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>শিক্ষার্থীর বিবরণ</DialogTitle>
        </DialogHeader>
        {student && (
          <>
            <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
              <StudentAvatar photoKey={student.photo_key} name={student.name} size="xl" />
              <div className="min-w-0">
                <p className="text-lg font-bold">{student.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {classLabel(student.class_name)}
                  {student.division ? ` — ${divisionLabel(student.division)}` : ""}
                  {student.section ? ` • শাখা ${student.section}` : ""} • রোল {bn(student.roll)}
                </p>
                <p className="text-[12px] text-muted-foreground">লগইন: @{student.username}</p>
              </div>
              <div className="ml-auto">
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[year + 1, year, year - 1, year - 2].map((y) => (
                      <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-[12px]">বিষয়</TableHead>
                    <TableHead className="text-[12px]">পরীক্ষা</TableHead>
                    <TableHead className="text-center text-[12px]">মাস</TableHead>
                    <TableHead className="text-right text-[12px]">মোট</TableHead>
                    <TableHead className="text-right text-[12px]">প্রাপ্ত</TableHead>
                    <TableHead className="text-right text-[12px]">সর্বোচ্চ</TableHead>
                    <TableHead className="text-center text-[12px]">গ্রেড</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows === null ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">লোড হচ্ছে…</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">এই বছরে কোনো ফলাফল নেই।</TableCell></TableRow>
                  ) : (
                    rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[13px]">{r.subjectName}</TableCell>
                        <TableCell className="text-[13px]">{r.title}</TableCell>
                        <TableCell className="text-center text-[13px]">{MONTHS_BN[r.month - 1]}</TableCell>
                        <TableCell className="text-right text-[13px]">{fmtNum(r.total)}</TableCell>
                        <TableCell className={cn("text-right text-[13px] font-semibold", r.attendance === "ABSENT" && "text-red-600")}>
                          {r.attendance === "ABSENT" ? "অনুপস্থিত (০)" : fmtNum(r.obtained)}
                        </TableCell>
                        <TableCell className="text-right text-[13px]">{fmtNum(r.highest)}</TableCell>
                        <TableCell className="text-center text-[13px] font-semibold">{r.grade}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
