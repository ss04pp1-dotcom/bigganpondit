"use client";

// Student management: grouped list + add/edit/delete/view dialogs.
// Teachers submit student registrations as requests requiring admin approval.
// Admins review and approve/reject teacher requests or add students directly.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Loader2,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  UserCheck,
  ShieldCheck,
  Phone,
  MessageSquare,
  Send,
  Fingerprint,
  GraduationCap,
} from "lucide-react";
import { BiometricPasswordDialog } from "./biometric-password-dialog";
import { StudentPromotionModal } from "./student-promotion-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
  toEnDigits,
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
  father_name?: string | null;
  father_occupation?: string | null;
  mother_name?: string | null;
  mother_occupation?: string | null;
  guardian_name?: string | null;
  guardian_occupation?: string | null;
  guardian_relation?: string | null;
  school_name?: string | null;
  phone?: string | null;
  address?: string | null;
  blood_group?: string | null;
  dob?: string | null;
  hide_photo_from_students?: number | boolean;
}

interface RequestRow {
  id: number;
  teacher_id: number | null;
  teacher_name?: string | null;
  teacher_short_name?: string | null;
  reviewer_name?: string | null;
  name: string;
  class_id: number;
  class_name: string;
  division: string | null;
  section: string | null;
  roll: number;
  username: string;
  photo_key: string | null;
  father_name: string | null;
  father_occupation?: string | null;
  mother_name: string | null;
  mother_occupation?: string | null;
  guardian_name?: string | null;
  guardian_occupation?: string | null;
  guardian_relation?: string | null;
  school_name: string | null;
  phone: string | null;
  address: string | null;
  blood_group: string | null;
  dob: string | null;
  hide_photo_from_students?: number | boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
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
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  guardianName?: string;
  guardianOccupation?: string;
  guardianRelation?: string;
  schoolName?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  dob?: string;
  hidePhotoFromStudents?: boolean;
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
  fatherName: "",
  fatherOccupation: "",
  motherName: "",
  motherOccupation: "",
  guardianName: "",
  guardianOccupation: "",
  guardianRelation: "",
  schoolName: "",
  phone: "",
  address: "",
  bloodGroup: "",
  dob: "",
  hidePhotoFromStudents: false,
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

// distinct visual styling per class
const CLASS_STYLE: Record<string, string> = {
  "10": "border-l-blue-500 bg-blue-50/40",
  "9": "border-l-violet-500 bg-violet-50/40",
  "8": "border-l-emerald-500 bg-emerald-50/40",
  "7": "border-l-amber-500 bg-amber-50/40",
  "6": "border-l-rose-500 bg-rose-50/40",
};

export function StudentManager({
  canCreate = true,
  role = "ADMIN",
}: {
  canCreate?: boolean;
  role?: "ADMIN" | "TEACHER" | "DIRECTOR";
}) {
  const [mainTab, setMainTab] = useState<"students" | "requests">("students");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const pendingPreview = useMemo(() => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : null), [pendingPhoto]);

  // Request management state
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [reqFilter, setReqFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<RequestRow | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [viewReq, setViewReq] = useState<RequestRow | null>(null);

  // SMS Modal state
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsScope, setSmsScope] = useState<"ALL" | "CLASS" | "SELECTED">("ALL");
  const [smsClass, setSmsClass] = useState("10");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  // Biometric fingerprint password reveal state for Admin
  const [bioStudent, setBioStudent] = useState<Row | null>(null);

  // Student promotion modal state for Admin
  const [promotionOpen, setPromotionOpen] = useState(false);

  const { toast } = useToast();

  async function handleSendSms(e: React.FormEvent) {
    e.preventDefault();
    if (!smsMessage.trim()) {
      toast({ title: "এসএমএস বার্তা লিখুন।", variant: "destructive" });
      return;
    }
    setSmsSending(true);
    try {
      // FIX: resolve the class ID from /api/classes (the previous code read
      // `clsRes.classes` from /api/admin/teachers — an endpoint that returns
      // NO classes key, so classIdNum was always undefined and "নির্দিষ্ট শ্রেণি"
      // SMS silently went to the ENTIRE school).
      let classIdNum: number | undefined = undefined;
      if (smsScope === "CLASS") {
        const clsRes = await fetch("/api/classes").then((r) => r.json()).catch(() => null);
        const clsObj = (clsRes?.classes ?? []).find((c: any) => String(c.name) === String(smsClass));
        classIdNum = clsObj?.id;
        if (!classIdNum) {
          toast({ title: "শ্রেণি খুঁজে পাওয়া যায়নি — আবার চেষ্টা করুন।", variant: "destructive" });
          return;
        }
      }
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: smsScope,
          classId: classIdNum,
          studentIds: smsScope === "SELECTED" ? Array.from(selectedStudentIds) : undefined,
          message: smsMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "এসএমএস প্রেরণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: "এসএমএস সফল", description: json.message });
      setSmsOpen(false);
      setSmsMessage("");
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSmsSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

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

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const endpoint =
        role === "ADMIN" ? "/api/admin/student-requests?status=ALL" : "/api/teacher/student-requests";
      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.ok) {
        setRequests(json.requests ?? []);
        setPendingCount(json.pendingCount ?? 0);
      }
    } finally {
      setReqLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
    loadRequests();
  }, [load, loadRequests]);

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

  const filteredRequests = useMemo(() => {
    if (reqFilter === "ALL") return requests;
    return requests.filter((r) => r.status === reqFilter);
  }, [requests, reqFilter]);

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
      fatherName: form.fatherName?.trim() || null,
      fatherOccupation: form.fatherOccupation?.trim() || null,
      motherName: form.motherName?.trim() || null,
      motherOccupation: form.motherOccupation?.trim() || null,
      guardianName: form.guardianName?.trim() || null,
      guardianOccupation: form.guardianOccupation?.trim() || null,
      guardianRelation: form.guardianRelation?.trim() || null,
      schoolName: form.schoolName?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      bloodGroup: form.bloodGroup?.trim() || null,
      dob: form.dob?.trim() || null,
      hidePhotoFromStudents: !!form.hidePhotoFromStudents,
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
          toast({
            title: "শিক্ষার্থী তৈরি হয়েছে, কিন্তু ছবি আপলোড হয়নি। সম্পাদনা থেকে আবার আপলোড করুন।",
            variant: "destructive",
          });
        }
      } else if (!form.id && json.pending && json.requestId && pendingPhoto) {
        try {
          const fd = new FormData();
          fd.append("file", pendingPhoto);
          fd.append("type", "pending-student-photo");
          fd.append("requestId", String(json.requestId));
          await fetch("/api/uploads", { method: "POST", body: fd });
        } catch {
          // non-fatal
        }
      }
      toast({ title: json.message });
      setPendingPhoto(null);
      setForm(null);
      await load();
      await loadRequests();
      if (role === "TEACHER" && !form.id) {
        setMainTab("requests");
      }
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

  async function handleApprove(reqId: number) {
    setApprovingId(reqId);
    try {
      const res = await fetch(`/api/admin/student-requests/${reqId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({ title: data.error || "অনুমোদন করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: data.message });
      await load();
      await loadRequests();
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectModalReq) return;
    setRejectingId(rejectModalReq.id);
    try {
      const res = await fetch(`/api/admin/student-requests/${rejectModalReq.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", notes: rejectNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({ title: data.error || "বাতিল করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: data.message });
      setRejectModalReq(null);
      setRejectNote("");
      await loadRequests();
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Segmented Navigation: Active Students vs Requests */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 text-[13px] font-semibold">
          <button
            onClick={() => setMainTab("students")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 transition-all",
              mainTab === "students"
                ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span>সিস্টেমের শিক্ষার্থী</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[11px] font-bold text-slate-700">
              {bn(rows.length)}
            </span>
          </button>
          <button
            onClick={() => setMainTab("requests")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 transition-all relative",
              mainTab === "requests"
                ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Inbox className="h-4 w-4" />
            <span>{role === "ADMIN" ? "অনুমোদন অনুরোধ" : "আমার পাঠানো অনুরোধ"}</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.2 text-[11px] font-bold text-white animate-pulse">
                {bn(pendingCount)}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {role === "ADMIN" && mainTab === "students" && (
            <>
              <Button
                variant="outline"
                className="h-10 gap-2 border-indigo-300 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 shadow-xs text-xs font-bold"
                onClick={() => setPromotionOpen(true)}
              >
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                শ্রেণি প্রমোশন
              </Button>

              <Button
                variant="outline"
                className="h-10 gap-2 border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 shadow-xs text-xs font-bold"
                onClick={() => setSmsOpen(true)}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                SMS পাঠান
              </Button>
            </>
          )}

          {canCreate && mainTab === "students" && (
            <Button
              className="h-10 gap-2 bg-blue-600 hover:bg-blue-700 shadow-xs text-xs font-bold"
              onClick={() => {
                setPendingPhoto(null);
                setForm({ ...emptyForm });
              }}
            >
              <UserPlus className="h-4 w-4" />
              {role === "TEACHER" ? "শিক্ষার্থী যুক্তির আবেদন" : "তথ্য সংযুক্ত করুন"}
            </Button>
          )}
        </div>
      </div>

      {/* VIEW 1: ACTIVE STUDENTS LIST */}
      {mainTab === "students" && (
        <div className="space-y-4">
          {/* notice for teacher about approval workflow */}
          {role === "TEACHER" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-[12px] text-blue-900 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span>
                  <strong>শিক্ষকদের জন্য নির্দেশিকা:</strong> আপনি নতুন শিক্ষার্থী যুক্ত করলে তা সরাসরি তালিকায় আসবে না। তথ্যগুলো প্রশাসনের কাছে অনুমোদনের জন্য যাবে এবং অ্যাডমিন অনুমোদন করলেই কেবল মূল তালিকায় রোল অনুযায়ী প্রদর্শিত হবে।
                </span>
              </div>
              <button
                onClick={() => setMainTab("requests")}
                className="shrink-0 text-blue-700 hover:underline font-bold text-xs"
              >
                অনুরোধ স্ট্যাটাস দেখুন →
              </button>
            </div>
          )}

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
                return (
                  <section
                    key={key}
                    className={cn(
                      "print-avoid-break overflow-hidden rounded-xl border border-border border-l-4",
                      CLASS_STYLE[cls] ?? ""
                    )}
                  >
                    <header className="flex items-center justify-between bg-white/70 px-4 py-2.5">
                      <h3 className="text-[14px] font-bold">
                        {classLabel(cls)}
                        {div ? ` — ${divisionLabel(div)}` : ""}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground border border-border">
                        {bn(list.length)} জন
                      </span>
                    </header>
                    <ul className="divide-y divide-border/70">
                      {list.map((row) => (
                        <li key={row.id} className="flex items-center gap-3 bg-white/40 px-4 py-3">
                          {/* SMS selection checkbox (admin only) — previously the
                              SELECTED scope had NO selection UI, so it always sent
                              an empty list and could never succeed. */}
                          {role === "ADMIN" && (
                            <Checkbox
                              checked={selectedStudentIds.has(row.id)}
                              onCheckedChange={(checked) => {
                                setSelectedStudentIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(row.id);
                                  else next.delete(row.id);
                                  return next;
                                });
                              }}
                              aria-label={`${row.name} নির্বাচন করুন`}
                              className="shrink-0"
                            />
                          )}
                          <StudentAvatar photoKey={row.photo_key} name={row.name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold">{row.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              রোল {bn(row.roll)}
                              {row.division ? ` • ${divisionLabel(row.division)}` : ""}
                              {row.section ? ` • শাখা ${row.section}` : ""} • @{row.username}
                              {row.phone ? ` • 📞 ${bn(row.phone)}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {row.phone && (
                              <a
                                href={`tel:${row.phone}`}
                                className="h-7 px-2.5 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1"
                                title="সরাসরি ফোন দিন"
                              >
                                <Phone className="h-3 w-3" /> কল
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="h-7 px-2.5 rounded text-[11px] font-semibold bg-[#0d6efd] text-white hover:bg-[#0b5ed7] shadow-xs"
                              onClick={() => setViewId(row.id)}
                            >
                              ভিউ
                            </Button>
                            {role === "ADMIN" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 rounded text-[11px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 shadow-2xs flex items-center gap-1"
                                onClick={() => setBioStudent(row)}
                                title="ফিঙ্গারপ্রিন্ট দিয়ে পাসওয়ার্ড দেখুন"
                              >
                                <Fingerprint className="h-3.5 w-3.5 text-indigo-600" />
                                পাসওয়ার্ড
                              </Button>
                            )}
                            {role === "ADMIN" && (
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
                                    fatherName: row.father_name ?? "",
                                    fatherOccupation: row.father_occupation ?? "",
                                    motherName: row.mother_name ?? "",
                                    motherOccupation: row.mother_occupation ?? "",
                                    guardianName: row.guardian_name ?? "",
                                    guardianOccupation: row.guardian_occupation ?? "",
                                    guardianRelation: row.guardian_relation ?? "",
                                    schoolName: row.school_name ?? "",
                                    phone: row.phone ?? "",
                                    address: row.address ?? "",
                                    bloodGroup: row.blood_group ?? "",
                                    dob: row.dob ?? "",
                                    hidePhotoFromStudents: !!row.hide_photo_from_students,
                                  });
                                }}
                              >
                                সম্পাদনা
                              </Button>
                            )}
                            {role === "ADMIN" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="h-7 px-2 rounded shadow-xs">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>শিক্ষার্থী মুছে ফেলতে চান?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      '{row.name}' (রোল {bn(row.roll)}) এর প্রোফাইল ও সব নম্বর স্থায়ীভাবে মুছে যাবে।
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove(row)} className="bg-red-600 hover:bg-red-700">
                                      মুছে ফেলুন
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: APPROVAL REQUESTS */}
      {mainTab === "requests" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-slate-800">
                  {role === "ADMIN" ? "শিক্ষক কর্তৃক প্রেরিত শিক্ষার্থী তালিকা" : "আমার আবেদনের তালিকা"}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {role === "ADMIN"
                    ? "শিক্ষকদের যুক্ত করা তথ্যাদি যাচাই করুন এবং অনুমোদন বা বাতিল করুন।"
                    : "আপনার পাঠানো আবেদনের বর্তমান অবস্থা ট্র্যাক করুন।"}
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setReqFilter(st)}
                    className={cn(
                      "rounded px-2.5 py-1 font-medium transition-colors",
                      reqFilter === st
                        ? "bg-white text-blue-700 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {st === "ALL" && "সবগুলো"}
                    {st === "PENDING" && `অপেক্ষারত (${bn(pendingCount)})`}
                    {st === "APPROVED" && "অনুমোদিত"}
                    {st === "REJECTED" && "বাতিলকৃত"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {reqLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> অনুরোধ লোড হচ্ছে…
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-muted-foreground">
              কোনো অনুরোধ পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-left text-[12px] font-semibold text-slate-700">
                      <th className="px-4 py-3">শিক্ষার্থী ও রোল</th>
                      <th className="px-4 py-3">শ্রেণি ও বিভাগ</th>
                      <th className="px-4 py-3">ইউজারনেম</th>
                      <th className="px-4 py-3">{role === "ADMIN" ? "অনুরোধকারী শিক্ষক" : "আবেদনের তারিখ"}</th>
                      <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                      <th className="px-4 py-3 text-right">কার্যক্রম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{req.name}</p>
                          <p className="text-[11px] text-slate-500">
                            রোল: {bn(req.roll)} {req.phone ? `• 📞 ${bn(req.phone)}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{classLabel(req.class_name)}</span>
                          {req.division && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              ({divisionLabel(req.division)})
                            </span>
                          )}
                          {req.section && (
                            <p className="text-[11px] text-slate-400">শাখা: {req.section}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-slate-600">
                          @{req.username}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-slate-600">
                          {role === "ADMIN" ? (
                            <div>
                              <p className="font-semibold text-slate-800">
                                {req.teacher_name ?? "শিক্ষক"} {req.teacher_short_name ? `(${req.teacher_short_name})` : ""}
                              </p>
                              <p className="text-[10px] text-slate-400">{req.created_at?.slice(0, 10)}</p>
                            </div>
                          ) : (
                            <p>{req.created_at?.slice(0, 16)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {req.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              <Clock className="h-3 w-3" /> অপেক্ষারত
                            </span>
                          )}
                          {req.status === "APPROVED" && (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" /> অনুমোদিত
                              </span>
                              {req.reviewer_name && (
                                <p className="text-[9px] text-slate-400 mt-0.5">{req.reviewer_name}</p>
                              )}
                            </div>
                          )}
                          {req.status === "REJECTED" && (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                                <XCircle className="h-3 w-3" /> বাতিলকৃত
                              </span>
                              {req.admin_notes && (
                                <p className="text-[10px] text-rose-600 mt-0.5 max-w-[140px] truncate" title={req.admin_notes}>
                                  নোট: {req.admin_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs font-semibold px-2"
                              onClick={() => setViewReq(req)}
                              title="সম্পূর্ণ বিবরণ দেখুন"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              বিবরণ
                            </Button>
                            {role === "ADMIN" && req.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={approvingId === req.id}
                                  onClick={() => handleApprove(req.id)}
                                  className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 shadow-xs"
                                >
                                  {approvingId === req.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  অনুমোদন
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={rejectingId === req.id}
                                  onClick={() => {
                                    setRejectModalReq(req);
                                    setRejectNote("");
                                  }}
                                  className="h-8 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold px-2.5"
                                >
                                  <X className="h-3.5 w-3.5" /> বাতিল
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection Reason Dialog for Admin */}
      <Dialog open={!!rejectModalReq} onOpenChange={(open) => !open && setRejectModalReq(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> আবেদন বাতিলের কারণ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[13px] text-slate-600">
              আপনি কি নিশ্চিত যে শিক্ষার্থী <strong>'{rejectModalReq?.name}'</strong> (রোল {bn(rejectModalReq?.roll)}) এর আবেদনটি বাতিল করতে চান?
            </p>
            <div className="space-y-1.5">
              <Label className="text-[12px]">বাতিলের কারণ / নোট (শিক্ষককে জানানো হবে):</Label>
              <Input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="যেমন: তথ্যে ভুল আছে বা রোল নম্বর ইতোমধ্যে বরাদ্দ করা..."
                className="h-10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectModalReq(null)}>
                ফিরে যান
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectingId === rejectModalReq?.id}
                className="gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                {rejectingId === rejectModalReq?.id && <Loader2 className="h-4 w-4 animate-spin" />}
                বাতিল নিশ্চিত করুন
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={!!viewReq} onOpenChange={(open) => !open && setViewReq(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <StudentAvatar photoKey={viewReq?.photo_key ?? null} name={viewReq?.name ?? ""} size="lg" />
              <div>
                <DialogTitle className="text-lg">{viewReq?.name}</DialogTitle>
                <p className="text-[12px] text-muted-foreground">
                  {viewReq && classLabel(viewReq.class_name)}
                  {viewReq?.division ? ` — ${divisionLabel(viewReq.division)}` : ""} • রোল {viewReq ? bn(viewReq.roll) : ""}
                </p>
              </div>
            </div>
          </DialogHeader>

          {viewReq && (
            <div className="space-y-3 pt-2 text-[13px]">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground">ইউজারনেম:</span>
                  <p className="font-mono font-medium">@{viewReq.username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">শাখা:</span>
                  <p className="font-medium">{viewReq.section ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">পিতার নাম:</span>
                  <p className="font-medium">{viewReq.father_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">পিতার পেশা:</span>
                  <p className="font-medium">{viewReq.father_occupation || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">মাতার নাম:</span>
                  <p className="font-medium">{viewReq.mother_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">মাতার পেশা:</span>
                  <p className="font-medium">{viewReq.mother_occupation || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">অভিভাবকের নাম:</span>
                  <p className="font-medium">{viewReq.guardian_name || viewReq.father_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">অভিভাবকের সাথে সম্পর্ক:</span>
                  <p className="font-medium">{viewReq.guardian_relation || (viewReq.father_name ? "পিতা" : "—")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">অভিভাবকের পেশা:</span>
                  <p className="font-medium">{viewReq.guardian_occupation || viewReq.father_occupation || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">অভিভাবকের ফোন:</span>
                  <p className="font-medium">{viewReq.phone ? bn(viewReq.phone) : "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">রক্তের গ্রুপ:</span>
                  <p className="font-medium">{viewReq.blood_group || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">প্রতিষ্ঠান / স্কুল:</span>
                  <p className="font-medium">{viewReq.school_name || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">ঠিকানা:</span>
                  <p className="font-medium">{viewReq.address || "—"}</p>
                </div>
                <div className="col-span-2 border-t border-border/60 pt-2 mt-1">
                  <span className="text-muted-foreground">অনুরোধকারী শিক্ষক:</span>
                  <p className="font-medium">{viewReq.teacher_name ?? "শিক্ষক"} {viewReq.teacher_short_name ? `(${viewReq.teacher_short_name})` : ""}</p>
                </div>
              </div>

              {role === "ADMIN" && viewReq.status === "PENDING" && (
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const r = viewReq;
                      setViewReq(null);
                      setRejectModalReq(r);
                      setRejectNote("");
                    }}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <X className="h-4 w-4 mr-1" /> আবেদন বাতিল
                  </Button>
                  <Button
                    onClick={async () => {
                      const id = viewReq.id;
                      setViewReq(null);
                      await handleApprove(id);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-1" /> অনুমোদন করুন
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* create / edit dialog */}
      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form?.id
                ? "শিক্ষার্থী সম্পাদনা"
                : role === "TEACHER"
                ? "নতুন শিক্ষার্থী (অনুমোদনের আবেদন)"
                : "নতুন শিক্ষার্থী সংযোজন"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              {role === "TEACHER" && !form.id && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <span>
                    শিক্ষক হিসেবে তথ্য পূরণ করে সাবমিট করলে তা সরাসরি যুক্ত হবে না। তথ্যগুলো প্রশাসনের কাছে অনুমোদনের জন্য যাবে এবং অ্যাডমিন অনুমোদন করলে সিস্টেমে যুক্ত হবে।
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>শিক্ষার্থীর নাম</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11"
                  placeholder="পূর্ণ নাম"
                />
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
                  <Input
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="h-11"
                    placeholder="ক / খ"
                    list="sections"
                  />
                  <datalist id="sections">
                    {SECTION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>রোল</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.roll}
                    onChange={(e) => setForm({ ...form, roll: e.target.value })}
                    className="h-11"
                    placeholder="যেমন: ৭"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ইউজারনেম (লগইন)</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="h-11"
                    placeholder="student025"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>পাসওয়ার্ড {form.id ? "(খালি রাখলে অপরিবর্তিত)" : ""}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-11"
                    placeholder="••••"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>পিতার নাম (ঐচ্ছিক)</Label>
                  <Input
                    value={form.fatherName ?? ""}
                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    className="h-10"
                    placeholder="পিতার নাম"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>পিতার পেশা (ঐচ্ছিক)</Label>
                  <Input
                    value={form.fatherOccupation ?? ""}
                    onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
                    className="h-10"
                    placeholder="যেমন: কৃষক, শিক্ষক, ব্যবসায়ী, চাকরিজীবী"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>মাতার নাম (ঐচ্ছিক)</Label>
                  <Input
                    value={form.motherName ?? ""}
                    onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                    className="h-10"
                    placeholder="মাতার নাম"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>মাতার পেশা (ঐচ্ছিক)</Label>
                  <Input
                    value={form.motherOccupation ?? ""}
                    onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })}
                    className="h-10"
                    placeholder="যেমন: গৃহিণী, শিক্ষিকা, চাকরিজীবী"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>অভিভাবকের নাম (ঐচ্ছিক)</Label>
                  <Input
                    value={form.guardianName ?? ""}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    className="h-10"
                    placeholder="পিতা/মাতা ছাড়া অন্য হলে"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>অভিভাবকের সাথে সম্পর্ক</Label>
                  <Input
                    value={form.guardianRelation ?? ""}
                    onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}
                    className="h-10"
                    placeholder="যেমন: পিতা / মাতা / বড় ভাই / চাচা"
                    list="guardian-relations-list"
                  />
                  <datalist id="guardian-relations-list">
                    <option value="পিতা" />
                    <option value="মাতা" />
                    <option value="বড় ভাই" />
                    <option value="বড় বোন" />
                    <option value="চাচা" />
                    <option value="মামা" />
                    <option value="দাদা" />
                    <option value="নানা" />
                    <option value="অন্যান্য" />
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>অভিভাবকের পেশা</Label>
                  <Input
                    value={form.guardianOccupation ?? ""}
                    onChange={(e) => setForm({ ...form, guardianOccupation: e.target.value })}
                    className="h-10"
                    placeholder="যেমন: ব্যবসায়ী / চাকরিজীবী"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>বিদ্যালয় / প্রতিষ্ঠানের নাম (ঐচ্ছিক)</Label>
                  <Input
                    value={form.schoolName ?? ""}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    className="h-10"
                    placeholder="বিদ্যালয় বা প্রতিষ্ঠানের নাম"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>অভিভাবকের ফোন নম্বর (ঐচ্ছিক)</Label>
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: toEnDigits(e.target.value) })}
                    className="h-10"
                    placeholder="0171XXXXXXXX"
                    inputMode="tel"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ঠিকানা (ঐচ্ছিক)</Label>
                  <Input
                    value={form.address ?? ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-10"
                    placeholder="গ্রাম/এলাকা, থানা, জেলা"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>রক্তের গ্রুপ (ঐচ্ছিক)</Label>
                  <Input
                    value={form.bloodGroup ?? ""}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="h-10"
                    placeholder="A+ / B+ / O+ ইত্যাদি"
                  />
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
                      {pendingPreview ? (
                        <img src={pendingPreview} alt="শিক্ষার্থীর ছবি" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">ছবি নেই</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[13px] font-medium">শিক্ষার্থীর ছবি</p>
                      <p className="text-[12px] text-muted-foreground">JPG / JPEG / PNG — সর্বোচ্চ ৫ MB</p>
                      <Input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast({ title: "ফাইলটি অনেক বড় (সর্বোচ্চ ৫ MB)।", variant: "destructive" });
                            e.target.value = "";
                            setPendingPhoto(null);
                            return;
                          }
                          setPendingPhoto(f);
                        }}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Photo privacy rule — Point 04 */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-800">ছবি হাইড করুন -(অন্য শিক্ষার্থী)</Label>
                  <p className="text-[11px] text-slate-500">
                    এটা সিলেক্ট করলে এডমিন, ডিরেক্টর, শিক্ষক ও নিজে ব্যতীত অন্য কোনো শিক্ষার্থী এই ছবি দেখতে পারবে না।
                  </p>
                </div>
                <Switch
                  checked={!!form.hidePhotoFromStudents}
                  onCheckedChange={(c) => setForm({ ...form, hidePhotoFromStudents: c })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setForm(null)} className="h-11 px-5">
                  বাতিল
                </Button>
                <Button onClick={save} disabled={saving} className="h-11 gap-2 px-5 bg-blue-600 hover:bg-blue-700">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : form.id ? null : (
                    <Plus className="h-4 w-4" />
                  )}
                  {form.id
                    ? "আপডেট করুন"
                    : role === "TEACHER"
                    ? "অনুমোদনের জন্য পাঠান"
                    : "তথ্য সংযুক্ত করুন"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* view dialog */}
      <StudentViewDialog
        studentId={viewId}
        onClose={() => setViewId(null)}
        students={rows}
        role={role}
        onRevealPassword={(st) => setBioStudent(st)}
      />

      {/* Biometric Fingerprint Password Dialog for Admin */}
      <BiometricPasswordDialog
        open={!!bioStudent}
        onOpenChange={(open) => !open && setBioStudent(null)}
        student={bioStudent}
      />

      {/* SMS MODAL FOR ADMIN — Point 05 */}
    <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] text-slate-900">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            শিক্ষার্থীদের এসএমএস (SMS) প্রেরণ করুন
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSendSms} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">প্রাপক নির্বাচন (Scope)</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSmsScope("ALL")}
                className={cn(
                  "rounded-lg border p-2 text-xs font-semibold transition-all",
                  smsScope === "ALL"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                সকল শ্রেণি
              </button>
              <button
                type="button"
                onClick={() => setSmsScope("CLASS")}
                className={cn(
                  "rounded-lg border p-2 text-xs font-semibold transition-all",
                  smsScope === "CLASS"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                নির্দিষ্ট শ্রেণি
              </button>
              <button
                type="button"
                onClick={() => setSmsScope("SELECTED")}
                className={cn(
                  "rounded-lg border p-2 text-xs font-semibold transition-all",
                  smsScope === "SELECTED"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                বাছাইকৃত
              </button>
            </div>
          </div>

          {smsScope === "CLASS" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">শ্রেণি নির্বাচন করুন</Label>
              <Select value={smsClass} onValueChange={setSmsClass}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="শ্রেণি" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {smsScope === "SELECTED" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">
              {selectedStudentIds.size > 0
                ? `তালিকা থেকে ${bn(selectedStudentIds.size)} জন শিক্ষার্থী নির্বাচন করা হয়েছে।`
                : "তালিকা থেকে চেকবক্স (✓) দিয়ে অন্তত একজন শিক্ষার্থী নির্বাচন করুন।"}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">বার্তার বিবরণ (SMS Text) *</Label>
              <span className="text-[11px] text-slate-400">
                অক্ষর: {bn(smsMessage.length)} (১ এসএমএস ≈ ১৬০/৭০)
              </span>
            </div>
            <Textarea
              placeholder="অভিভাবকদের জন্য বার্তা লিখুন... যেমন: সম্মানিত অভিভাবক, আগামীকাল বিশেষ ক্লাস পরীক্ষা অনুষ্ঠিত হবে।"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={4}
              required
              className="text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSmsOpen(false)}
              disabled={smsSending}
              className="text-xs h-8"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              disabled={smsSending}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8 font-semibold shadow-xs"
            >
              {smsSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  প্রেরণ হচ্ছে...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  এসএমএস পাঠান
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Student Class Promotion Modal for Admin */}
    {role === "ADMIN" && (
      <StudentPromotionModal
        open={promotionOpen}
        onClose={() => setPromotionOpen(false)}
        onSuccess={() => {
          load();
        }}
      />
    )}
    </div>
  );
}

function StudentViewDialog({
  studentId,
  onClose,
  students,
  role = "ADMIN",
  onRevealPassword,
}: {
  studentId: number | null;
  onClose: () => void;
  students: Row[];
  role?: "ADMIN" | "TEACHER" | "DIRECTOR";
  onRevealPassword?: (student: Row) => void;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "results">("profile");
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
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [studentId, year]);

  const student = students.find((s) => s.id === studentId);
  if (!studentId || !student) return null;

  const rows = data && data.forId === studentId && data.forYear === year ? data.rows : null;

  return (
    <Dialog open={studentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <StudentAvatar photoKey={student.photo_key} name={student.name} size="lg" />
            <div>
              <DialogTitle className="text-lg">{student.name}</DialogTitle>
              <p className="text-[12px] text-muted-foreground">
                {classLabel(student.class_name)}
                {student.division ? ` — ${divisionLabel(student.division)}` : ""} • রোল {bn(student.roll)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-border pb-2 pt-1 text-[13px]">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === "profile" ? "bg-primary text-white" : "hover:bg-accent"
            )}
          >
            ব্যক্তিগত তথ্য
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === "results" ? "bg-primary text-white" : "hover:bg-accent"
            )}
          >
            ফলাফল হিস্টোরি
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="grid gap-2 text-[13px] pt-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
              <div>
                <span className="text-muted-foreground">ইউজারনেম:</span>
                <p className="font-mono font-medium">@{student.username}</p>
              </div>
              <div>
                <span className="text-muted-foreground">শাখা:</span>
                <p className="font-medium">{student.section ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">পিতার নাম:</span>
                <p className="font-medium">{student.father_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">পিতার পেশা:</span>
                <p className="font-medium">{student.father_occupation || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">মাতার নাম:</span>
                <p className="font-medium">{student.mother_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">মাতার পেশা:</span>
                <p className="font-medium">{student.mother_occupation || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">অভিভাবকের নাম:</span>
                <p className="font-medium">{student.guardian_name || student.father_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">অভিভাবকের সাথে সম্পর্ক:</span>
                <p className="font-medium">{student.guardian_relation || (student.father_name ? "পিতা" : "—")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">অভিভাবকের পেশা:</span>
                <p className="font-medium">{student.guardian_occupation || student.father_occupation || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">অভিভাবকের ফোন:</span>
                <p className="font-medium">{student.phone ? bn(student.phone) : "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">রক্তের গ্রুপ:</span>
                <p className="font-medium">{student.blood_group || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">প্রতিষ্ঠান / স্কুল:</span>
                <p className="font-medium">{student.school_name || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">ঠিকানা:</span>
                <p className="font-medium">{student.address || "—"}</p>
              </div>

              {/* অ্যাডমিনের জন্য ফিঙ্গারপ্রিন্ট দিয়ে পাসওয়ার্ড দেখার কার্ড */}
              {role === "ADMIN" && (
                <div className="col-span-2 mt-2 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-indigo-50/70 p-3.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Fingerprint className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-indigo-950">
                          শিক্ষার্থীর পাসওয়ার্ড (বায়োমেট্রিক নিরাপত্তা)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          পাসওয়ার্ড দেখতে এডমিনকে ফিঙ্গারপ্রিন্ট স্পর্শ করতে হবে
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRevealPassword?.(student)}
                      className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shrink-0"
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      ফিঙ্গার দিয়ে পাসওয়ার্ড দেখুন
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-muted-foreground">বছর নির্বাচন:</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-8 w-28 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2027, 2026, 2025, 2024].map((y) => (
                    <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
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
                        <TableCell className="text-[13px] font-medium">{r.subjectName}</TableCell>
                        <TableCell className="text-[13px]">{r.title}</TableCell>
                        <TableCell className="text-center text-[13px]">{MONTHS_BN[r.month - 1]}</TableCell>
                        <TableCell className="text-right text-[13px]">{fmtNum(r.total)}</TableCell>
                        <TableCell className={cn("text-right text-[13px] font-semibold", r.attendance === "ABSENT" && "text-red-600")}>
                          {r.attendance === "ABSENT" ? "অনুপস্থিত (০)" : fmtNum(r.obtained)}
                        </TableCell>
                        <TableCell className="text-right text-[13px]">{fmtNum(r.highest)}</TableCell>
                        <TableCell className="text-center text-[13px]">
                          <span className="inline-block rounded px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700">
                            {r.grade}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
