"use client";

// Subject management (admin): grouped list + add/edit/delete.

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CLASS_NUMBERS, classLabel } from "@/lib/constants";

interface SubjectRowT {
  id: number;
  name: string;
  division: string | null;
  is_fourth_subject: number;
  class_name: string;
  teacher_names?: string | null;
  teacher_short_names?: string | null;
}

interface FormState {
  id?: number;
  name: string;
  className: string;
  isFourth: boolean;
}

const empty: FormState = { name: "", className: "6", isFourth: false };

export function SubjectManager() {
  const [subjects, setSubjects] = useState<SubjectRowT[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subjects");
      const json = await res.json();
      if (json.ok) setSubjects(json.subjects ?? []);
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

  async function save() {
    if (!form || !form.name.trim()) {
      toast({ title: "বিষয়ের নাম লিখুন।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/admin/subjects/${form.id}` : "/api/admin/subjects", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          className: form.className,
          isFourthSubject: form.isFourth,
        }),
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

  async function remove(s: SubjectRowT) {
    const res = await fetch(`/api/admin/subjects/${s.id}`, { method: "DELETE" });
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
        <Button className="gap-2" onClick={() => setForm({ ...empty })}>
          <Plus className="h-4 w-4" /> নতুন বিষয়
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> লোড হচ্ছে…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byClass.map(([cls, subs]) => (
            <Card key={cls}>
              <CardContent className="pt-4">
                <p className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                  <BookOpen className="h-4 w-4 text-primary" /> {classLabel(cls)}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">{subs.length} টি</span>
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {subs.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[14px] font-medium text-slate-900">{s.name}</span>
                          {Number(s.is_fourth_subject) === 1 && (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700 font-medium">৪র্থ বিষয়</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                          {s.teacher_names ? (
                            <span className="text-blue-700 font-medium flex items-center gap-1">
                              <span>👨‍🏫 শিক্ষক:</span>
                              <span className="font-semibold">{s.teacher_names}</span>
                              {s.teacher_short_names && (
                                <span className="text-slate-500">({s.teacher_short_names})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-700/80 italic">কোনো শিক্ষক নির্ধারিত নেই</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 shrink-0" onClick={() => setForm({ id: s.id, name: s.name, className: s.class_name, isFourth: Number(s.is_fourth_subject) === 1 })}>
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
                            <AlertDialogDescription>&ldquo;{s.name}&rdquo; বিষয়টি মুছে ফেলা হবে। আপনি কি নিশ্চিত?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>না</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => remove(s)}>মুছে ফেলুন</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "বিষয় সম্পাদনা" : "নতুন বিষয়"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>বিষয়ের নাম</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" placeholder="যেমন: পদার্থবিজ্ঞান" />
              </div>
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
                {form.id && <p className="text-[11px] text-amber-600">শ্রেণি পরিবর্তন করলে বিষয়টি নতুন শ্রেণিতে চলে যাবে।</p>}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-[14px]">
                <Checkbox checked={form.isFourth} onCheckedChange={(v) => setForm({ ...form, isFourth: !!v })} />
                এটি একটি ৪র্থ বিষয়
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-11 px-5" onClick={() => setForm(null)}>বাতিল</Button>
                <Button className="h-11 px-5" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
