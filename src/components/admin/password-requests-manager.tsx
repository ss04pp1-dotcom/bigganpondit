"use client";

import { useEffect, useState, useCallback } from "react";
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  GraduationCap,
  Users,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { bn } from "@/lib/constants";

interface PasswordRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  username: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function PasswordRequestsManager({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [actingId, setActingId] = useState<number | null>(null);

  // Reject modal state
  const [rejectModalReq, setRejectModalReq] = useState<PasswordRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { toast } = useToast();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/password-requests?status=${filter}`);
      const json = await res.json();
      if (json.ok) {
        setRequests(json.requests || []);
        setPendingCount(json.pendingCount || 0);
        if (onCountChange) onCountChange(json.pendingCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, onCountChange]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleApprove(req: PasswordRequest) {
    setActingId(req.id);
    try {
      const res = await fetch(`/api/admin/password-requests/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", adminNotes: "অনুমোদিত" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "অনুমোদন করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      loadRequests();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectModalReq) return;
    setActingId(rejectModalReq.id);
    try {
      const res = await fetch(`/api/admin/password-requests/${rejectModalReq.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          adminNotes: rejectReason.trim() || "অনুরোধটি বাতিল করা হয়েছে",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "প্রত্যাখ্যান করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setRejectModalReq(null);
      setRejectReason("");
      loadRequests();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card id="password-requests" className="border-amber-200 bg-white shadow-xs">
      <CardHeader className="border-b border-border pb-3 bg-amber-50/40 rounded-t-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[16px] text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              পাসওয়ার্ড পরিবর্তনের অনুরোধসমূহ (শিক্ষক ও শিক্ষার্থী)
            </CardTitle>
            <CardDescription className="text-[12px] text-slate-500 mt-0.5">
              শিক্ষক ও শিক্ষার্থীরা পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠালে এখানে প্রদর্শিত হবে। অ্যাডমিন অনুমোদন করলে তা কার্যকর হবে।
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-0.5 text-xs shadow-xs">
                {bn(pendingCount)} টি অপেক্ষমাণ
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              disabled={loading}
              className="h-8 gap-1.5 text-xs text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              রিফ্রেশ
            </Button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 pt-3">
          <Button
            size="sm"
            variant={filter === "PENDING" ? "default" : "outline"}
            className={`h-8 text-xs font-semibold ${filter === "PENDING" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
            onClick={() => setFilter("PENDING")}
          >
            অপেক্ষমাণ ({bn(pendingCount)})
          </Button>
          <Button
            size="sm"
            variant={filter === "ALL" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setFilter("ALL")}
          >
            সকল অনুরোধ
          </Button>
          <Button
            size="sm"
            variant={filter === "APPROVED" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setFilter("APPROVED")}
          >
            অনুমোদিত
          </Button>
          <Button
            size="sm"
            variant={filter === "REJECTED" ? "default" : "outline"}
            className="h-8 text-xs font-semibold"
            onClick={() => setFilter("REJECTED")}
          >
            প্রত্যাখ্যাত
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading && requests.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            অনুরোধ লোড হচ্ছে...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-[14px] font-semibold text-slate-700">কোনো পাসওয়ার্ড অনুরোধ নেই</p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {filter === "PENDING"
                ? "বর্তমানে কোনো শিক্ষক বা শিক্ষার্থীর পাসওয়ার্ড পরিবর্তনের অনুরোধ অপেক্ষমাণ নেই।"
                : "এই ফিল্টারে কোনো অনুরোধ পাওয়া যায়নি।"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {requests.map((r) => {
              const isTeacher = r.user_role === "TEACHER";
              const isActing = actingId === r.id;

              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-xs ${
                        isTeacher ? "bg-blue-600" : "bg-emerald-600"
                      }`}
                    >
                      {isTeacher ? <GraduationCap className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] text-slate-900">{r.user_name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono px-1.5 py-0 border-slate-300 text-slate-600"
                        >
                          @{r.username}
                        </Badge>
                        <Badge
                          className={`text-[11px] font-semibold px-2 py-0.5 ${
                            isTeacher
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {isTeacher ? "শিক্ষক" : "শিক্ষার্থী"}
                        </Badge>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            r.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {r.status === "PENDING"
                            ? "অপেক্ষমাণ"
                            : r.status === "APPROVED"
                            ? "অনুমোদিত"
                            : "প্রত্যাখ্যাত"}
                        </span>
                      </div>

                      {r.reason && (
                        <p className="text-[12px] text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>কারণ/নোট: <strong>{r.reason}</strong></span>
                        </p>
                      )}

                      {r.admin_notes && r.status !== "PENDING" && (
                        <p className="text-[11px] text-slate-500 italic">
                          অ্যাডমিন মন্তব্য: {r.admin_notes}
                        </p>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>অনুরোধের সময়: {r.created_at}</span>
                        {r.reviewed_at && <span>• পর্যালোচিত: {r.reviewed_at}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {r.status === "PENDING" ? (
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        disabled={isActing}
                        onClick={() => handleApprove(r)}
                        className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                      >
                        {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        অনুমোদন করুন
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActing}
                        onClick={() => {
                          setRejectModalReq(r);
                          setRejectReason("");
                        }}
                        className="h-9 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        প্রত্যাখ্যান
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right self-end sm:self-center">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {r.status === "APPROVED" ? "✓ নতুন পাসওয়ার্ড কার্যকর" : "✗ বাতিলকৃত"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectModalReq} onOpenChange={(open) => !open && setRejectModalReq(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              অনুরোধ প্রত্যাখ্যান নিশ্চিতকরণ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              আপনি কি নিশ্চিত যে {rejectModalReq?.user_name} (@{rejectModalReq?.username})-এর পাসওয়ার্ড পরিবর্তনের অনুরোধটি প্রত্যাখ্যান করতে চান?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-slate-700">
              প্রত্যাখ্যানের কারণ / মন্তব্য (ঐচ্ছিক)
            </label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="যেমন: তথ্যের অসামঞ্জস্য / বর্তমান পাসওয়ার্ড ঠিক আছে"
              className="text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalReq(null)}
              disabled={actingId !== null}
            >
              বাতিল
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRejectSubmit}
              disabled={actingId !== null}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {actingId !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              হ্যাঁ, প্রত্যাখ্যান করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
