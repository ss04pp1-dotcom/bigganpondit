"use client";

// Teacher management (admin): CRUD + subject permissions + password reset.

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, KeyRound, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { classLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TeacherRowT {
  id: number;
  user_id: number;
  short_name: string;
  signature_key: string | null;
  name: string;
  username: string;
}
interface LinkRow {
  teacher_id: number;
  subject_id: number;
  subject_name: string;
  class_name: string;
  is_fourth_subject: number;
}
interface SubjectRowT {
  id: number;
  name: string;
  is_fourth_subject: number;
  class_name: string;
}

interface FormState {
  id?: number;
  name: string;
  username: string;
  password: string;
  shortName: string;
  subjectIds: Set<number>;
}

const empty: FormState = { name: "", username: "", password: "", shortName: "", subjectIds: new Set() };

export function TeacherManager() {
  const [teachers, setTeachers] = useState<TeacherRowT[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRowT[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers");
      const json = await res.json();
      if (json.ok) {
        setTeachers(json.teachers ?? []);
        setLinks(json.links ?? []);
        setSubjects(json.subjects ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byClass = useMemo(() => {
    const m = new Map<string, SubjectRowT[]>();
    for (const s of subjects) {
      if (!m.has(s.class_name)) m.set(s.class_name, []);
      m.get(s.class_name)!.push(s);
    }
    return [...m.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [subjects]);

  const linksOf = (teacherId: number) => links.filter((l) => l.teacher_id === teacherId);

  function toggleSubject(id: number) {
    if (!form) return;
    const next = new Set(form.subjectIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm({ ...form, subjectIds: next });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.username.trim() || !form.shortName.trim() || (!form.id && !form.password)) {
      toast({ title: "সব ঘর পূরণ করুন।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        username: form.username.trim(),
        shortName: form.shortName.trim(),
        subjectIds: [...form.subjectIds],
      };
      if (form.password) payload.password = form.password;
      const res = await fetch(form.id ? `/api/admin/teachers/${form.id}` : "/api/admin/teachers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setForm(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: TeacherRowT) {
    const res = await fetch(`/api/admin/teachers/${t.id}`, { method: "DELETE" });
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
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setForm({ ...empty, subjectIds: new Set() })}>
          <Plus className="h-4 w-4" /> নতুন শিক্ষক
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> লোড হচ্ছে…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {teachers.map((t) => {
            const tl = linksOf(t.id);
            const classesOf = [...new Set(tl.map((l) => l.class_name))].sort((a, b) => Number(b) - Number(a));
            return (
              <Card key={t.id} className="print-avoid-break">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <GraduationCap className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">{t.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        @{t.username} • আইডি: {t.short_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {classesOf.map((c) => (
                          <Badge key={c} variant="secondary" className="text-[11px]">{classLabel(c)}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm" variant="outline"
                        className="h-8 gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        onClick={() =>
                          setForm({
                            id: t.id,
                            name: t.name,
                            username: t.username,
                            shortName: t.short_name,
                            password: "",
                            subjectIds: new Set(tl.map((l) => l.subject_id)),
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" /> সম্পাদনা
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                            <Trash2 className="h-3.5 w-3.5" /> মুছে ফেলুন
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>মুছে ফেলার নিশ্চয়তা</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.name}-কে মুছে ফেলা হবে। তাঁর পারমিশনও মুছে যাবে। আপনি কি নিশ্চিত?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>না</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(t)}>মুছে ফেলুন</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                    {tl.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">কোনো বিষয়ের অনুমতি নেই।</span>
                    ) : (
                      tl.map((l) => (
                        <span key={l.subject_id} className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", l.is_fourth_subject ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700")}>
                          {l.class_name} • {l.subject_name}
                        </span>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {form?.id ? "শিক্ষক সম্পাদনা" : "নতুন শিক্ষক"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>নাম</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label>সংক্ষিপ্ত আইডি</Label>
                  <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className="h-11" placeholder="RI / MH" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> পাসওয়ার্ড {form.id ? "(খালি = অপরিবর্তিত)" : ""}</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-[13px] font-semibold">বিষয়ের অনুমতি (শ্রেণি অনুযায়ী)</p>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {byClass.map(([cls, subs]) => (
                    <div key={cls}>
                      <p className="mb-1 text-[12px] font-semibold text-muted-foreground">{classLabel(cls)}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {subs.map((s) => (
                          <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-accent">
                            <Checkbox
                              checked={form.subjectIds.has(s.id)}
                              onCheckedChange={() => toggleSubject(s.id)}
                            />
                            <span>{s.name}</span>
                            {Number(s.is_fourth_subject) === 1 && <span className="rounded bg-violet-100 px-1 text-[10px] text-violet-700">৪র্থ</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-11 px-5" onClick={() => setForm(null)}>বাতিল</Button>
                <Button className="h-11 gap-2 px-5" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {form.id ? "আপডেট করুন" : "যুক্ত করুন"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
