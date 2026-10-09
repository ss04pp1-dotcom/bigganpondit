"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentAvatar } from "@/components/app/student-avatar";
import { useToast } from "@/hooks/use-toast";
import { bn, classLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BiometricPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: number;
    name: string;
    username: string;
    roll: number;
    class_name: string;
    photo_key?: string | null;
  } | null;
}

/**
 * Admin password-reveal dialog.
 *
 * SECURITY NOTE: the old version faked "fingerprint verification" with a
 * 650ms spinner plus a device-capability probe — no real verification ever
 * happened. Revealing a student password now requires re-entering the
 * ADMIN's own password, which the server verifies (with its own attempt
 * limit) before returning anything.
 */
export function BiometricPasswordDialog({
  open,
  onOpenChange,
  student,
}: BiometricPasswordDialogProps) {
  const { toast } = useToast();
  const [authState, setAuthState] = useState<"IDLE" | "VERIFYING" | "VERIFIED" | "ERROR">("IDLE");
  const [adminPassword, setAdminPassword] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit / Reset password state
  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      setAuthState("IDLE");
      setAdminPassword("");
      setPassword(null);
      setShowPassword(false);
      setCopied(false);
      setErrorMsg(null);
      setIsEditing(false);
      setNewPassword("");
    }
  }, [open, student?.id]);

  async function handleReveal() {
    if (!student) return;
    if (!adminPassword) {
      setErrorMsg("পাসওয়ার্ড দেখতে প্রথমে আপনার (অ্যাডমিনের) নিজের পাসওয়ার্ড লিখুন।");
      setAuthState("ERROR");
      return;
    }
    setErrorMsg(null);
    setAuthState("VERIFYING");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/students/${student.id}/reveal-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "পাসওয়ার্ড দেখা সম্ভব হয়নি। শুধুমাত্র অ্যাডমিন অনুমতিপ্রাপ্ত।");
      }

      setAdminPassword("");
      // SECURITY: never fabricate a fallback password — show a clear message
      // when no stored password is available (e.g. after OTP reset).
      if (data.passwordAvailable && data.password) {
        setPassword(data.password);
        setAuthState("VERIFIED");
        toast({
          title: "পরিচয় যাচাই সম্পন্ন",
          description: `${student.name}-এর পাসওয়ার্ড উন্মুক্ত করা হয়েছে।`,
        });
      } else {
        setPassword("");
        setErrorMsg("এই শিক্ষার্থীর পাসওয়ার্ড পুনরুদ্ধার করা যাচ্ছে না (রিসেট হয়ে থাকতে পারে)। নতুন পাসওয়ার্ড সেট করুন।");
        setAuthState("ERROR");
      }
    } catch (err: any) {
      setAuthState("ERROR");
      setErrorMsg(err?.message || "যাচাই ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
      toast({
        title: "যাচাই ব্যর্থ",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast({ title: "পাসওয়ার্ড ক্লিপবোর্ডে কপি করা হয়েছে! 📋" });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveNewPassword() {
    if (!student || !newPassword.trim()) {
      toast({ title: "নতুন পাসওয়ার্ড লিখুন।", variant: "destructive" });
      return;
    }
    if (newPassword.trim().length < 4) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।", variant: "destructive" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/reveal-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।");
      }

      setPassword(newPassword.trim());
      setIsEditing(false);
      setNewPassword("");
      toast({
        title: "পাসওয়ার্ড সফলভাবে আপডেট হয়েছে! 🎉",
        description: `শিক্ষার্থী এখন এই নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবে। পুরোনো সেশনগুলো বাতিল করা হয়েছে।`,
      });
    } catch (err: any) {
      toast({
        title: "আপডেট ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[430px] p-0 overflow-hidden border-indigo-200 bg-white shadow-2xl rounded-2xl">
        {/* হেডার ব্যানার */}
        <div className="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <StudentAvatar photoKey={student.photo_key} name={student.name} size="lg" />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="h-3 w-3" /> অ্যাডমিন ভেরিফিকেশন প্রয়োজন
              </div>
              <DialogTitle className="text-base font-bold text-white mt-1 truncate">
                {student.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-indigo-200/80">
                শ্রেণি: {classLabel(student.class_name)} • রোল: {bn(student.roll)} • @{student.username}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* এখনও যাচাই হয়নি -> অ্যাডমিন পাসওয়ার্ড যাচাই ফর্ম */}
          {authState !== "VERIFIED" && (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-indigo-200 bg-indigo-50">
                <Lock className={cn("h-7 w-7", authState === "ERROR" ? "text-rose-500" : "text-indigo-600")} />
              </div>

              <p className="text-sm font-bold text-slate-800">
                {authState === "ERROR" ? "যাচাই ব্যর্থ হয়েছে" : "অ্যাডমিন পাসওয়ার্ড দিন"}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                {authState === "ERROR" && errorMsg
                  ? errorMsg
                  : "শিক্ষার্থীর পাসওয়ার্ড দেখার আগে আপনার (অ্যাডমিনের) নিজের পাসওয়ার্ড দিয়ে পরিচয় যাচাই করতে হবে।"}
              </p>

              <form
                className="mt-4 w-full space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading) handleReveal();
                }}
              >
                <Input
                  type="password"
                  placeholder="আপনার (অ্যাডমিন) পাসওয়ার্ড"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (authState === "ERROR") setAuthState("IDLE");
                  }}
                  autoComplete="current-password"
                  className="h-10 text-xs bg-white border-slate-300"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs h-10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      যাচাই হচ্ছে...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      যাচাই করে পাসওয়ার্ড দেখুন
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* যাচাই সফল -> পাসওয়ার্ড প্রদর্শন বক্স */}
          {authState === "VERIFIED" && password && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>অ্যাডমিন পরিচয় সফলভাবে যাচাই করা হয়েছে।</span>
              </div>

              {/* পাসওয়ার্ড বক্স */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-slate-50 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-900">
                    <KeyRound className="h-4 w-4 text-indigo-600" />
                    শিক্ষার্থীর বর্তমান পাসওয়ার্ড
                  </span>
                  <span className="text-[10px] text-slate-400">@{student.username}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-indigo-300 bg-white p-3 shadow-inner">
                  <div className="font-mono text-lg font-extrabold tracking-wider text-indigo-950">
                    {showPassword ? password : "•".repeat(Math.min(12, password.length || 6))}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      title={showPassword ? "লুকান" : "পাসওয়ার্ড দেখুন"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className={cn(
                        "h-8 gap-1 px-2.5 text-xs font-semibold transition-all",
                        copied
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      )}
                      title="কপি করুন"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> কপি হয়েছে
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> কপি
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>ইউজারনেম: <b className="text-slate-800">{student.username}</b></span>
                  <span>রোল: <b className="text-slate-800">{bn(student.roll)}</b></span>
                </div>
              </div>

              {/* পাসওয়ার্ড পরিবর্তন / রিসেট অপশন */}
              {!isEditing ? (
                <div className="flex justify-between items-center pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1 font-semibold p-0 h-auto"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    পাসওয়ার্ড পরিবর্তন বা রিসেট করবেন?
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs h-8"
                  >
                    বন্ধ করুন
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    নতুন পাসওয়ার্ড নির্ধারণ করুন:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড লিখুন"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-9 text-xs bg-white border-slate-300"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveNewPassword}
                      disabled={savingPassword}
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                    >
                      {savingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "সংরক্ষণ"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="h-9 text-xs shrink-0"
                    >
                      বাতিল
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
