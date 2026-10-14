"use client";

// Push-notification management for the admin panel:
//   * compose manual / scheduled / recurring / draft notifications
//   * audience targeting (all / students / teachers / class)
//   * queue inspection: pending / sent / failed / cancelled + delivery counts
//   * actions: cancel, activate draft, retry failed, delete draft/cancelled
//   * "process now" (manual cron tick) and FCM setup status
//
// The mobile app has NO admin panel — this page is the only place academy
// pushes are authored from.

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Users,
  GraduationCap,
  BookOpen,
  Zap,
  Repeat,
  FileEdit,
  Ban,
  RotateCcw,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { classLabel, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TargetType = "ALL" | "STUDENTS" | "TEACHERS" | "CLASS";
type When = "now" | "later" | "draft";
type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

interface PushNotificationItem {
  id: number;
  title: string;
  body: string;
  deep_link: string | null;
  target_type: TargetType | "USER";
  target_class_id: number | null;
  target_user_id: number | null;
  kind: "MANUAL" | "NOTICE" | "ROUTINE" | "RESULT" | "SYSTEM";
  status: "DRAFT" | "PENDING" | "PROCESSING" | "SENT" | "PARTIAL" | "FAILED" | "CANCELLED";
  scheduled_at: string;
  recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  recurrence_until: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  total_devices: number;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
}

interface ClassItem {
  id: number;
  name: string;
  student_count: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "ড্রাফট",
  PENDING: "অপেক্ষমাণ",
  PROCESSING: "প্রসেস হচ্ছে",
  SENT: "পাঠানো হয়েছে",
  PARTIAL: "আংশিক সফল",
  FAILED: "ব্যর্থ",
  CANCELLED: "বাতিল",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SENT: "bg-green-100 text-green-800",
  PARTIAL: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const KIND_LABELS: Record<string, string> = {
  MANUAL: "ম্যানুয়াল",
  NOTICE: "নোটিশ",
  ROUTINE: "রুটিন",
  RESULT: "ফলাফল",
  SYSTEM: "সিস্টেম",
};

/** UTC SQL → Dhaka display (e.g. "2026-01-05 14:30" → "০৫ জানু, ২০২৬ ৮:৩০ PM"). */
function fmtDhaka(utc: string | null | undefined): string {
  if (!utc) return "—";
  try {
    const d = new Date(utc.replace(" ", "T") + "Z");
    return new Intl.DateTimeFormat("bn-BD", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return utc;
  }
}

export function PushNotificationManager({
  user,
}: {
  user: { id: number; name: string; role: Role };
}) {
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [devices, setDevices] = useState({ total: 0, students: 0, teachers: 0 });
  const [fcmConfigured, setFcmConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Compose form state
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("ALL");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [when, setWhen] = useState<When>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("NONE");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [deepLink, setDeepLink] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const json = await res.json();
      if (json.ok) {
        setNotifications(json.notifications ?? []);
        setClasses(json.classes ?? []);
        setDevices(json.devices ?? { total: 0, students: 0, teachers: 0 });
        setFcmConfigured(!!json.fcmConfigured);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({ title: "শিরোনাম ও বার্তা লিখুন।", variant: "destructive" });
      return;
    }
    if (targetType === "CLASS" && !targetClassId) {
      toast({ title: "শ্রেণি নির্বাচন করুন।", variant: "destructive" });
      return;
    }
    if (when === "later" && !scheduledAt) {
      toast({ title: "তারিখ ও সময় নির্ধারণ করুন।", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          targetType,
          targetClassId: targetType === "CLASS" ? Number(targetClassId) : null,
          when,
          scheduledAt: when === "later" ? scheduledAt : null,
          recurrence,
          recurrenceUntil: recurrence !== "NONE" && recurrenceUntil ? recurrenceUntil : null,
          deepLink: deepLink === "none" ? null : deepLink,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message ?? "যোগ হয়েছে।" });
      setCreateOpen(false);
      setTitle("");
      setBody("");
      setTargetType("ALL");
      setTargetClassId("");
      setWhen("now");
      setScheduledAt("");
      setRecurrence("NONE");
      setRecurrenceUntil("");
      setDeepLink("none");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function action(id: number, act: "cancel" | "activate" | "retry" | "delete") {
    const res = await fetch(`/api/admin/notifications/${id}`, {
      method: act === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      ...(act === "delete" ? {} : { body: JSON.stringify({ action: act }) }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !json.ok) {
      toast({ title: json.error ?? "কাজটি করা যায়নি।", variant: "destructive" });
      return;
    }
    toast({ title: json.message ?? "সম্পন্ন হয়েছে।" });
    load();
  }

  async function processNow() {
    setProcessing(true);
    try {
      const res = await fetch("/api/cron/push", { method: "POST" });
      const json = await res.json().catch(() => ({ ok: false }));
      if (json.ok) {
        const s = json.summary ?? {};
        toast({
          title: `প্রসেস সম্পন্ন — সফল ${s.sent ?? 0}, আংশিক ${s.partial ?? 0}, ব্যর্থ ${s.failed ?? 0}, পুনরায় চেষ্টা ${s.retried ?? 0}`,
        });
        load();
      } else {
        toast({ title: json.error ?? "প্রসেস করা যায়নি।", variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  }

  const filtered =
    statusFilter === "ALL"
      ? notifications
      : notifications.filter((n) => n.status === statusFilter);

  const counts = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.status] = (acc[n.status] ?? 0) + 1;
    return acc;
  }, {});
  const nextPending = notifications
    .filter((n) => (n.status === "PENDING" || n.status === "DRAFT") && n.scheduled_at)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">সক্রিয় ডিভাইস</p>
                <p className="text-2xl font-bold">{devices.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  শিক্ষার্থী {devices.students} • শিক্ষক {devices.teachers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">অপেক্ষমাণ</p>
                <p className="text-2xl font-bold">{(counts.PENDING ?? 0) + (counts.PROCESSING ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  পরবর্তী: {fmtDhaka(nextPending?.scheduled_at)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">পাঠানো হয়েছে</p>
                <p className="text-2xl font-bold">{(counts.SENT ?? 0) + (counts.PARTIAL ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">ব্যর্থ {counts.FAILED ?? 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ক্রন স্ট্যাটাস</p>
                <p className="text-sm font-semibold">প্রতি ৫ মিনিটে</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={processNow}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              এখনই প্রসেস করুন
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FCM setup warning */}
      {!fcmConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">FCM কনফিগার করা হয়নি</p>
            <p className="mt-1">
              নোটিফিকেশন কিউতে জমা হবে, কিন্তু পাঠানো যাবে না। Firebase service-account JSON key
              যোগ করুন: <code className="px-1 rounded bg-amber-100">bunx wrangler secret put FCM_SERVICE_ACCOUNT</code>
              — বিস্তারিত docs/FCM_SETUP.md দেখুন।
            </p>
          </div>
        </div>
      )}

      {/* Compose + list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> পুশ নোটিফিকেশন
            </CardTitle>
            <CardDescription>
              ম্যানুয়াল, নির্ধারিত সময়ের এবং পুনরাবৃত্ত নোটিফিকেশন পাঠান। নোটিশ / রুটিন / ফলাফল
              প্রকাশ হলে স্বয়ংক্রিয় নোটিফিকেশনও এখানে দেখা যাবে।
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> নতুন নোটিফিকেশন
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["ALL", "PENDING", "SENT", "PARTIAL", "FAILED", "DRAFT", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >
                {STATUS_LABELS[s] ?? s}
                {s !== "ALL" && counts[s] ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">
              কোনো নোটিফিকেশন নেই।
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border p-4 space-y-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={STATUS_COLORS[n.status]} variant="secondary">
                          {STATUS_LABELS[n.status] ?? n.status}
                        </Badge>
                        <Badge variant="outline">{KIND_LABELS[n.kind] ?? n.kind}</Badge>
                        {n.recurrence && (
                          <Badge variant="outline" className="gap-1">
                            <Repeat className="h-3 w-3" />
                            {n.recurrence === "DAILY"
                              ? "দৈনিক"
                              : n.recurrence === "WEEKLY"
                                ? "সাপ্তাহিক"
                                : "মাসিক"}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          নির্ধারিত: {fmtDhaka(n.scheduled_at)}
                        </span>
                      </div>
                      <p className="font-semibold mt-1.5 truncate">{n.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          {n.target_type === "ALL" ? (
                            <Users className="h-3.5 w-3.5" />
                          ) : n.target_type === "TEACHERS" ? (
                            <BookOpen className="h-3.5 w-3.5" />
                          ) : (
                            <GraduationCap className="h-3.5 w-3.5" />
                          )}
                          {n.target_type === "ALL"
                            ? "সবাই"
                            : n.target_type === "STUDENTS"
                              ? "শিক্ষার্থীরা"
                              : n.target_type === "TEACHERS"
                                ? "শিক্ষকরা"
                                : `শ্রেণি ${n.target_class_id ?? ""}`}
                        </span>
                        {n.status === "SENT" || n.status === "PARTIAL" ? (
                          <span>
                            ডিভাইস: {n.total_devices} • সফল: {n.sent_count}
                            {n.failed_count ? ` • ব্যর্থ: ${n.failed_count}` : ""}
                          </span>
                        ) : n.status === "FAILED" ? (
                          <span>চেষ্টা: {n.attempts}/{n.max_attempts}</span>
                        ) : null}
                        {n.next_attempt_at && (
                          <span>পরবর্তী চেষ্টা: {fmtDhaka(n.next_attempt_at)}</span>
                        )}
                      </div>
                      {n.error_message && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2 bg-red-50 rounded p-2">
                          {n.error_message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {n.status === "PENDING" && (
                        <Button size="sm" variant="outline" onClick={() => action(n.id, "cancel")}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> বাতিল
                        </Button>
                      )}
                      {n.status === "DRAFT" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => action(n.id, "activate")}>
                            <Send className="h-3.5 w-3.5 mr-1" /> পাঠান
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => action(n.id, "delete")}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {n.status === "FAILED" && (
                        <Button size="sm" variant="outline" onClick={() => action(n.id, "retry")}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> আবার
                        </Button>
                      )}
                      {n.status === "CANCELLED" && (
                        <Button size="sm" variant="outline" onClick={() => action(n.id, "delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compose dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> নতুন পুশ নোটিফিকেশন
            </DialogTitle>
            <DialogDescription>
              মোবাইল অ্যাপে ব্যবহারকারীদের নোটিফিকেশন পাঠান। বার্তা প্রতি ৫ মিনিটে চলা ক্রনের
              মাধ্যমে পাঠানো হয়।
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pn-title">শিরোনাম *</Label>
              <Input
                id="pn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: আগামীকাল ছুটি"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pn-body">বার্তা *</Label>
              <Textarea
                id="pn-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="বিস্তারিত লিখুন…"
                rows={3}
                maxLength={1000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>শ্রোতা</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">সবাই (শিক্ষার্থী + শিক্ষক)</SelectItem>
                    <SelectItem value="STUDENTS">শুধু শিক্ষার্থীরা</SelectItem>
                    <SelectItem value="TEACHERS">শুধু শিক্ষকরা</SelectItem>
                    <SelectItem value="CLASS">নির্দিষ্ট শ্রেণি</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "CLASS" && (
                <div className="space-y-1.5">
                  <Label>শ্রেণি</Label>
                  <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="শ্রেণি নির্বাচন" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {classLabel(c.name)} ({c.student_count} জন)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>কখন পাঠাবেন</Label>
                <Select value={when} onValueChange={(v) => setWhen(v as When)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">এখনই</SelectItem>
                    <SelectItem value="later">নির্ধারিত সময়ে</SelectItem>
                    <SelectItem value="draft">ড্রাফট হিসেবে রাখুন</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {when === "later" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pn-at">তারিখ ও সময় (ঢাকা)</Label>
                  <Input
                    id="pn-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}
            </div>
            {when !== "draft" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>পুনরাবৃত্তি</Label>
                  <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">একবার</SelectItem>
                      <SelectItem value="DAILY">প্রতিদিন</SelectItem>
                      <SelectItem value="WEEKLY">প্রতি সপ্তাহে</SelectItem>
                      <SelectItem value="MONTHLY">প্রতি মাসে</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {recurrence !== "NONE" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pn-until">যে তারিখ পর্যন্ত</Label>
                    <Input
                      id="pn-until"
                      type="date"
                      value={recurrenceUntil}
                      onChange={(e) => setRecurrenceUntil(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>অ্যাপে ট্যাপ করলে কোথায় যাবে (ঐচ্ছিক)</Label>
              <Select value={deepLink} onValueChange={setDeepLink}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">কোথাও নয়</SelectItem>
                  <SelectItem value="notices">নোটিশ পেজ</SelectItem>
                  <SelectItem value="routine">রুটিন পেজ</SelectItem>
                  <SelectItem value="results">ফলাফল পেজ</SelectItem>
                  <SelectItem value="home">হোম</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                বাতিল
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                {when === "draft" ? (
                  <>
                    <FileEdit className="h-4 w-4 mr-1" /> ড্রাফট সংরক্ষণ
                  </>
                ) : when === "later" ? (
                  <>
                    <Clock className="h-4 w-4 mr-1" /> নির্ধারিত সময়ে পাঠান
                  </>
                ) : (
                  "কিউতে যোগ করুন"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
