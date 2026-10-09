"use client";

// Academy settings form (admin).

import { useState } from "react";
import { Loader2, Save, Trash2, AlertTriangle, Sparkles, ShieldCheck, Key, Mail, Eye, EyeOff, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";
import { CardBgModal } from "@/components/app/card-bg-modal";
import { PasswordRequestsManager } from "@/components/admin/password-requests-manager";
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
import { useToast } from "@/hooks/use-toast";

export function AdminSettingsForm({
  initialName,
  logoKey,
  initialCoverBg = null,
  adminUser,
  initialAdminEmail = "",
  hasResendKey = false,
  initialResendFrom = "",
}: {
  initialName: string;
  logoKey: string | null;
  initialCoverBg?: string | null;
  adminUser?: { name: string; username: string };
  initialAdminEmail?: string;
  hasResendKey?: boolean;
  initialResendFrom?: string;
}) {
  const [name, setName] = useState(initialName);
  const [coverBgUrl, setCoverBgUrl] = useState<string | null>(initialCoverBg ?? null);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [savingCoverBg, setSavingCoverBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Admin credentials state
  const [adminName, setAdminName] = useState(adminUser?.name ?? "প্রশাসক");
  const [adminUsername, setAdminUsername] = useState(adminUser?.username ?? "admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail);
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFrom, setResendFrom] = useState(initialResendFrom);
  const [savingCreds, setSavingCreds] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const { toast } = useToast();

  async function save() {
    if (!name.trim()) {
      toast({ title: "একাডেমির নাম লিখুন।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academyName: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
    } finally {
      setSaving(false);
    }
  }

  async function saveCoverBg(url: string | null) {
    setSavingCoverBg(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardBgUrl: url || "", cardCoverBgUrl: url || "" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "কভার ব্যাকগ্রাউন্ড সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      setCoverBgUrl(url || null);
      toast({ title: url ? "✅ রেজাল্ট কার্ড কভারের স্থায়ী ব্যাকগ্রাউন্ড সংরক্ষিত হয়েছে!" : "ডিফল্ট ব্যাকগ্রাউন্ডে ফিরিয়ে নেওয়া হয়েছে।" });
    } catch {
      toast({ title: "সংরক্ষণে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingCoverBg(false);
    }
  }

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast({ title: "বর্তমান পাসওয়ার্ড প্রদান আবশ্যক।", variant: "destructive" });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।", variant: "destructive" });
      return;
    }
    if (newPassword && newPassword.length < 4) {
      toast({ title: "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।", variant: "destructive" });
      return;
    }

    setSavingCreds(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          name: adminName,
          username: adminUsername,
          newPassword: newPassword || undefined,
          adminEmail,
          resendApiKey: resendApiKey || undefined,
          resendFromEmail: resendFrom || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "আপডেট করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleClearDemo(scope: "students_and_marks" | "all_demo") {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/clear-demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "ডেমো ডেটা মুছা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      // Reload page after a short delay so the dashboard and tables refresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">একাডেমির নাম</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label>নাম</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <Button className="mt-4 h-11 gap-2 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সংরক্ষণ করুন
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-[16px]">একাডেমির লোগো</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ImageUpload
              type="logo"
              label="লোগো (JPG/PNG/WebP)"
              currentUrl={logoKey ? `/api/files/${logoKey}` : null}
            />
          </CardContent>
        </Card>
      </div>

      {/* রেজাল্ট কার্ড কভার পেজের স্থায়ী ব্যাকগ্রাউন্ড ও ডিজাইন */}
      <Card className="border-indigo-200 bg-white shadow-xs">
        <CardHeader className="border-b border-indigo-100 pb-3 bg-indigo-50/40 rounded-t-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-[16px] text-slate-900 flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              রেজাল্ট কার্ড কভার পেজের স্থায়ী ব্যাকগ্রাউন্ড ও ডিজাইন
            </CardTitle>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 w-fit">
              শুধুমাত্র কভার পেজে কার্যকর (পৃষ্ঠা ১)
            </span>
          </div>
          <CardDescription className="text-[12px] text-slate-600 mt-1">
            রেজাল্ট কার্ডের ১ম পৃষ্ঠা (কভার)-এর ব্যাকগ্রাউন্ড ছবি বা শৈল্পিক ফ্রেম এখান থেকে নির্বাচন বা আপলোড করে স্থায়ীভাবে সংরক্ষণ করতে পারেন। <strong>রেজাল্ট শিট (পৃষ্ঠা ২) সর্বদা অফিশিয়াল স্ট্যান্ডার্ড ব্যাকগ্রাউন্ডে থাকবে, কোনোভাবেই পরিবর্তন হবে না।</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-24 rounded-lg border border-slate-300 shadow-xs flex items-center justify-center overflow-hidden bg-cover bg-center shrink-0"
                style={
                  coverBgUrl
                    ? { backgroundImage: `url(${coverBgUrl})` }
                    : { background: "linear-gradient(135deg, #f4f7fb 0%, #eaf2dd 100%)" }
                }
              >
                {!coverBgUrl && <span className="text-[10px] text-slate-500 font-medium">ডিফল্ট আর্ট</span>}
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-800">
                  {coverBgUrl ? "কাস্টম / প্রিসেট ব্যাকগ্রাউন্ড সংরক্ষিত" : "ডিফল্ট ব্যাকগ্রাউন্ড সক্রিয়"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  সব শিক্ষার্থীর রেজাল্ট কার্ডের কভার পেজে এটি স্থায়ীভাবে সংরক্ষিত থাকবে।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-10 text-[12px] gap-1.5 border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-medium"
                onClick={() => setBgModalOpen(true)}
              >
                <Palette className="h-4 w-4 text-indigo-600" />
                ডিজাইন পরিবর্তন / আপলোড
              </Button>
              {coverBgUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-[12px] text-slate-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => saveCoverBg(null)}
                  disabled={savingCoverBg}
                >
                  ডিফল্টে ফিরুন
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Account & Security Settings Card */}
      <Card className="border-blue-200 bg-white shadow-xs">
        <CardHeader className="border-b border-border pb-3 bg-slate-50/60 rounded-t-xl">
          <CardTitle className="text-[16px] text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            অ্যাডমিন ক্রেডেনশিয়াল ও সিকিউরিটি ব্যবস্থাপনা
          </CardTitle>
          <CardDescription className="text-[12px] text-slate-500">
            অ্যাডমিনের ইউজারনেম, পাসওয়ার্ড পরিবর্তন এবং Resend ইমেইলের মাধ্যমে পাসওয়ার্ড রিকভারি সেটআপ করুন।
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={saveCredentials} className="space-y-6">
            {/* Account identity & password change */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-slate-700">অ্যাডমিনের নাম</Label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="h-10 text-[13px]"
                  placeholder="প্রশাসক"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-slate-700">অ্যাডমিন ইউজারনেম (লগইন আইডি)</Label>
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="h-10 text-[13px]"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-[13px]">
                <Key className="h-4 w-4 text-amber-600" />
                পাসওয়ার্ড পরিবর্তন (নতুন পাসওয়ার্ড দিতে চাইলে পূরণ করুন)
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-slate-600">
                    বর্তমান পাসওয়ার্ড <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="বর্তমান পাসওয়ার্ড দিন"
                      className="h-10 pr-9 text-[13px]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-slate-600">নতুন পাসওয়ার্ড (ঐচ্ছিক)</Label>
                  <div className="relative">
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="কমপক্ষে ৪ অক্ষর"
                      className="h-10 pr-9 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-slate-600">নতুন পাসওয়ার্ড পুনরায় লিখুন</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="একই পাসওয়ার্ড লিখুন"
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Resend Email & Recovery Configuration */}
            <div className="rounded-lg border border-blue-200/80 bg-blue-50/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-[13px]">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Resend ইমেইল ও পাসওয়ার্ড রিকভারি সেটিংস
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${hasResendKey || resendApiKey ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {hasResendKey || resendApiKey ? "✓ Resend কনফিগার করা আছে" : "⚠️ Resend কী সংযুক্ত নেই"}
                </span>
              </div>
              <p className="text-[12px] text-slate-600">
                পাসওয়ার্ড ভুলে গেলে লগইন পৃষ্ঠা থেকে এই ইমেইলে একটি <strong>৬-সংখ্যার স্বয়ংক্রিয় ওটিপি (OTP) কোড</strong> যাবে, যার মাধ্যমে অ্যাডমিন নিরাপদে পাসওয়ার্ড রিসেট করতে পারবেন।
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-[12px] text-slate-600">
                    অ্যাডমিন রিকভারি ইমেইল (Recovery Email)
                  </Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-[12px] text-slate-600">
                    Resend API Key (re_...)
                  </Label>
                  <Input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder={hasResendKey ? "•••••••••••••••• (সংরক্ষিত আছে)" : "re_xxxxxxxxxxxx"}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-[12px] text-slate-600">
                    ইমেইল প্রেরক (From Email)
                  </Label>
                  <Input
                    value={resendFrom}
                    onChange={(e) => setResendFrom(e.target.value)}
                    placeholder="onboarding@resend.dev"
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingCreds}
              className="h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {savingCreds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ক্রেডেনশিয়াল ও সিকিউরিটি সংরক্ষণ করুন
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Requests Manager (Teacher/Student -> Admin Approval) */}
      <PasswordRequestsManager />

      {/* Fresh Start / Demo Data Wipe Card */}
      <Card className="border-amber-200 bg-amber-50/30 shadow-xs">
        <CardHeader className="border-b border-amber-200/60 pb-3">
          <CardTitle className="text-[16px] text-amber-950 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            ফ্রেশ প্রোডাকশন রিসেট ও ডেমো ডেটা মুছে ফেলা (Clean Slate)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-[13px] text-slate-700">
            আপনি কি আপনার আসল প্রতিষ্ঠানের জন্য সম্পূর্ণ খালি ও নতুন (Fresh) ডেটাবেস দিয়ে শুরু করতে চান? নিচের বোতামের সাহায্যে সব ডেমো শিক্ষার্থী, পরীক্ষা, নম্বর ও ডেমো শিক্ষক মুছে ফেলতে পারবেন। আপনার <strong>অ্যাডমিন অ্যাকাউন্ট, ৬ষ্ঠ-১০ম শ্রেণি ও পাঠ্যবইসমূহ অপরিবর্তিত থাকবে</strong>।
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={clearing}
                  className="h-11 gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  ডেমো শিক্ষার্থী, পরীক্ষা ও নম্বর মুছুন
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" /> ডেমো শিক্ষার্থী ও নম্বর মুছবেন?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 text-[13px]">
                    এটি সব ডেমো শিক্ষার্থী, পরীক্ষার এন্ট্রি ও নম্বর স্থায়ীভাবে মুছে দেবে। শিক্ষক অ্যাকাউন্টগুলো থাকবে।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClearDemo("students_and_marks")}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    হ্যাঁ, ডেমো শিক্ষার্থী ও নম্বর মুছুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={clearing}
                  className="h-11 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                >
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  সম্পূর্ণ ফ্রেশ রিসেট (সব ডেমো মুছুন)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" /> সম্পূর্ণ ফ্রেশ রিসেট নিশ্চিতকরণ
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 text-[13px]">
                    এটি সব ডেমো শিক্ষার্থী, পরীক্ষা, নম্বর এবং ডেমো শিক্ষক একাউন্ট (রাকিবুল ও মেহেদী) স্থায়ীভাবে মুছে দেবে। শুধুমাত্র আপনার বর্তমান অ্যাডমিন একাউন্ট, ৬ষ্ঠ-১০ম শ্রেণি ও বিষয়সমূহ বজায় থাকবে। পরবর্তীতে ডেমো ডেটা আর পুনরায় লোড হবে না।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClearDemo("all_demo")}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    হ্যাঁ, সম্পূর্ণ ফ্রেশ রিসেট করুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <CardBgModal
        open={bgModalOpen}
        onOpenChange={setBgModalOpen}
        currentBgUrl={coverBgUrl}
        onBgChange={(newUrl) => {
          setCoverBgUrl(newUrl);
          if (newUrl !== undefined) {
            saveCoverBg(newUrl);
          }
        }}
      />
    </div>
  );
}
