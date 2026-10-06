"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Volume2,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
  User,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bn, ROLE_LABELS, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NoticeItem {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  author_role: Role;
  status: "APPROVED" | "PENDING_APPROVAL";
  is_ticker: number;
  created_at: string;
  approved_at: string | null;
}

export function NoticeBoard({
  user,
}: {
  user: { id: number; name: string; role: Role };
}) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // New notice modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isTicker, setIsTicker] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notices");
      const json = await res.json();
      if (json.ok && Array.isArray(json.notices)) {
        setNotices(json.notices);
        setPendingCount(json.pendingCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "নোটিশের শিরোনাম ও বিস্তারিত লিখুন।", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_ticker: isTicker,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "নোটিশ সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }

      toast({ title: json.message });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setIsTicker(true);
      loadNotices();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: number) {
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "নোটিশ অনুমোদন করা হয়েছে।" });
        loadNotices();
      } else {
        toast({ title: json.error ?? "অনুমোদন করা যায়নি।", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("নোটিশটি মুছে ফেলতে চান?")) return;
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "নোটিশ মুছে ফেলা হয়েছে।" });
        loadNotices();
      } else {
        toast({ title: json.error ?? "মুছতে সমস্যা হয়েছে।", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    }
  }

  const pendingNotices = notices.filter((n) => n.status === "PENDING_APPROVAL");
  const approvedNotices = notices.filter((n) => n.status === "APPROVED");

  const canPost = user.role === "ADMIN" || user.role === "DIRECTOR" || user.role === "TEACHER";

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-amber-100 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
              <Bell className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">নোটিশ বোর্ড ও জরুরি বার্তা</h2>
              <p className="text-[12px] text-slate-500">
                একাডেমির সকল জরুরি ঘোষণা ও নোটিশ ট্র্যাকার
              </p>
            </div>
          </div>

          {canPost && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600 shadow-xs text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              নতুন নোটিশ লিখুন
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Admin Pending Approvals Box */}
      {user.role === "ADMIN" && pendingNotices.length > 0 && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-amber-200 bg-amber-100/40">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-bold text-amber-900">
                অনুমোদনের জন্য অপেক্ষারত নোটিশ ({bn(pendingNotices.length)} টি)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-amber-800/80">
              শিক্ষক ও পরিচালকদের প্রেরিত নোটিশগুলো যাচাই করে অনুমোদন দিন।
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-amber-200/60 p-0">
            {pendingNotices.map((n) => (
              <div key={n.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between bg-white/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      {ROLE_LABELS[n.author_role] || n.author_role}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[11px] text-slate-400">
                    লেখক: {n.author_name} • তারিখ: {bn(n.created_at.split("T")[0] || n.created_at.slice(0, 10))}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(n.id)}
                    className="h-8 gap-1 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    অনুমোদন করুন
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(n.id)}
                    className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    বাতিল
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Published Notices */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          নোটিশ লোড হচ্ছে...
        </div>
      ) : approvedNotices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          <Bell className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold">বর্তমানে কোনো প্রকাশিত নোটিশ নেই।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvedNotices.map((n) => (
            <Card key={n.id} className="border border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4 sm:p-5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {n.is_ticker === 1 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        <Volume2 className="h-3 w-3 text-amber-600" /> জরুরি নোটিশ
                      </span>
                    )}
                    <h3 className="text-[15px] font-bold text-slate-900">{n.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {ROLE_LABELS[n.author_role] || n.author_role}: {n.author_name}
                    </span>
                    <span>•</span>
                    <span>{bn(n.created_at.split("T")[0] || n.created_at.slice(0, 10))}</span>

                    {user.role === "ADMIN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(n.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 ml-1"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap rounded-lg bg-slate-50/60 p-3.5 border border-slate-100">
                  {n.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE NOTICE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] text-slate-900">
              <Bell className="h-5 w-5 text-amber-500" />
              নতুন নোটিশ প্রকাশ করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {user.role === "ADMIN"
                ? "অ্যাডমিন কর্তৃক নোটিশ সরাসরি সিস্টেমে প্রকাশিত হবে।"
                : "শিক্ষক ও পরিচালকদের নোটিশ অ্যাডমিনের অনুমোদনের পর নোটিশ বোর্ডে ও ভেসে যাওয়া টিকারে প্রদর্শিত হবে।"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">নোটিশের শিরোনাম *</Label>
              <Input
                placeholder="যেমন: আগামী সোমবারের বিশেষ ক্লাস টেস্ট"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">বিস্তারিত বিবরণ *</Label>
              <Textarea
                placeholder="নোটিশের বিস্তারিত বক্তব্য লিখুন..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-amber-950">স্ক্রলিং টিকারে প্রদর্শন</Label>
                <p className="text-[11px] text-amber-800">অ্যাপের উপরে জরুরি নোটিশ হিসেবে ভেসে যাবে</p>
              </div>
              <Switch checked={isTicker} onCheckedChange={setIsTicker} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={saving}
                className="text-xs h-8"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600 text-xs h-8 font-semibold shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5" />
                    {user.role === "ADMIN" ? "প্রকাশ করুন" : "অনুরোধ পাঠান"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
