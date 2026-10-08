"use client";

// Academy settings form (admin).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, AlertTriangle, Sparkles, ShieldCheck, Key, Mail, Eye, EyeOff, Palette, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";
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
  cardBgKey = null,
  initialPublicationName = "বিজ্ঞান পণ্ডিত প্রকাশনী",
  publicationLogoKey = null,
  initialPublicationDescription = "অনলাইনে প্রকাশনীর বই ও লেকচার শিট পড়ার সুরক্ষিত মাধ্যম (রিড-অনলি মোড)",
  adminUser,
  initialAdminEmail = "",
  hasResendKey = false,
  initialResendFrom = "",
}: {
  initialName: string;
  logoKey: string | null;
  cardBgKey?: string | null;
  initialPublicationName?: string;
  publicationLogoKey?: string | null;
  initialPublicationDescription?: string;
  adminUser?: { name: string; username: string };
  initialAdminEmail?: string;
  hasResendKey?: boolean;
  initialResendFrom?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currentLogoKey, setCurrentLogoKey] = useState<string | null>(logoKey);
  const [cardBg, setCardBg] = useState<string | null>(cardBgKey);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Publication settings state
  const [pubName, setPubName] = useState(initialPublicationName);
  const [pubDesc, setPubDesc] = useState(initialPublicationDescription);
  const [pubLogoKey, setPubLogoKey] = useState<string | null>(publicationLogoKey ?? null);
  const [savingPub, setSavingPub] = useState(false);

  // Sync state if props change (e.g. after router.refresh())
  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setCurrentLogoKey(logoKey);
  }, [logoKey]);

  useEffect(() => {
    setPubName(initialPublicationName);
  }, [initialPublicationName]);

  useEffect(() => {
    setPubDesc(initialPublicationDescription);
  }, [initialPublicationDescription]);

  useEffect(() => {
    setPubLogoKey(publicationLogoKey ?? null);
  }, [publicationLogoKey]);

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

  async function savePublication() {
    if (!pubName.trim()) {
      toast({ title: "প্রকাশনীর নাম লিখুন।", variant: "destructive" });
      return;
    }
    setSavingPub(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationName: pubName.trim(),
          publicationDescription: pubDesc.trim(),
          publicationLogoKey: pubLogoKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: "প্রকাশনীর তথ্য সফলভাবে সংরক্ষিত হয়েছে।" });
      router.refresh();
    } finally {
      setSavingPub(false);
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
              label="লোগো (JPG/PNG/WebP, সর্বোচ্চ ১০ MB)"
              currentUrl={currentLogoKey ? `/api/files/${currentLogoKey}` : null}
              onUploaded={(key) => {
                setCurrentLogoKey(key);
                toast({ title: "একাডেমির লোগো সংরক্ষিত হয়েছে।" });
                router.refresh();
              }}
              onRemove={async () => {
                try {
                  const res = await fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ academyLogoKey: "" }),
                  });
                  if (res.ok) {
                    setCurrentLogoKey(null);
                    toast({ title: "একাডেমির লোগো মুছে ফেলা হয়েছে।" });
                    router.refresh();
                  }
                } catch {
                  toast({ title: "লোগো মুছতে সমস্যা হয়েছে।", variant: "destructive" });
                }
              }}
            />
          </CardContent>
        </Card>

        {/* প্রকাশনী সেটিংস কার্ড (নাম, লোগো, ডেসক্রিপশন - ১০ MB JPG/PNG) */}
        <Card className="lg:col-span-2 border-cyan-200/80 shadow-xs">
          <CardHeader className="border-b border-slate-100 bg-cyan-50/40 pb-3">
            <CardTitle className="text-[16px] flex items-center gap-2 text-cyan-950 font-bold">
              <BookMarked className="h-5 w-5 text-cyan-600" />
              প্রকাশনী সেটিংস (নাম, লোগো ও ডেসক্রিপশন)
            </CardTitle>
            <CardDescription className="text-[12px] text-slate-500 mt-0.5">
              ডিজিটাল লাইব্রেরি ও বুক রিডারে প্রদর্শিত প্রকাশনীর নাম, লোগো ও বর্ণনা কনফিগার করুন (১০ MB পর্যন্ত JPG/PNG/WebP লোগো সমর্থন করে)।
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">প্রকাশনীর নাম</Label>
                  <Input
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    placeholder="যেমন: বিজ্ঞান পণ্ডিত প্রকাশনী"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">প্রকাশনীর ডেসক্রিপশন / পরিচিতি</Label>
                  <textarea
                    value={pubDesc}
                    onChange={(e) => setPubDesc(e.target.value)}
                    placeholder="অনলাইনে প্রকাশনীর বই ও লেকচার শিট পড়ার সুরক্ষিত মাধ্যম..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-[11px] text-slate-400">
                    * শিক্ষার্থী ও শিক্ষক প্যানেলে প্রকাশনী পেজে এই বিবরণটি প্রদর্শিত হবে।
                  </p>
                </div>
                <Button
                  className="h-10 gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                  onClick={savePublication}
                  disabled={savingPub}
                >
                  {savingPub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  প্রকাশনীর তথ্য সংরক্ষণ করুন
                </Button>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-2 block">
                  প্রকাশনীর অফিসিয়াল লোগো (১০ MB JPG/PNG)
                </Label>
                <ImageUpload
                  type="publication-logo"
                  label="প্রকাশনীর লোগো (JPG/PNG/WebP, সর্বোচ্চ ১০ MB)"
                  currentUrl={pubLogoKey ? `/api/files/${pubLogoKey}` : null}
                  onUploaded={(key) => {
                    setPubLogoKey(key);
                    toast({ title: "প্রকাশনীর লোগো সংরক্ষিত হয়েছে।" });
                    router.refresh();
                  }}
                  onRemove={async () => {
                    try {
                      const res = await fetch("/api/settings", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ publicationLogoKey: "" }),
                      });
                      if (res.ok) {
                        setPubLogoKey(null);
                        toast({ title: "প্রকাশনীর লোগো মুছে ফেলা হয়েছে।" });
                        router.refresh();
                      }
                    } catch {
                      toast({ title: "লোগো মুছতে সমস্যা হয়েছে।", variant: "destructive" });
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* রেজাল্ট কার্ডের কভার ব্যাকগ্রাউন্ড কার্ড */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[16px] flex items-center gap-2">
                <Palette className="h-4 w-4 text-emerald-600" />
                রেজাল্ট কার্ডের কভার ব্যাকগ্রাউন্ড (স্থায়ী সংরক্ষণ)
              </CardTitle>
              <CardDescription className="text-[12px] text-slate-500 mt-0.5">
                শুধুমাত্র কভার পেজে এই ব্যাকগ্রাউন্ড প্রদর্শিত হবে। রেজাল্ট কার্ড শিট (নম্বর টেবিল) স্বাভাবিক সাদা ও পরিষ্কার থাকবে।
              </CardDescription>
            </div>
            {cardBg && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 gap-1.5"
                onClick={async () => {
                  await fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cardBgUrl: "" }),
                  });
                  setCardBg(null);
                  toast({ title: "কভার ব্যাকগ্রাউন্ড রিমুভ করা হয়েছে (ডিফল্ট আর্ট বহাল)।" });
                  router.refresh();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                ডিফল্টে ফিরুন
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <ImageUpload
              type="card-bg"
              label="কভার ব্যাকগ্রাউন্ড ছবি (JPG / PNG / WebP — সর্বোচ্চ ৫ MB)"
              currentUrl={
                cardBg
                  ? cardBg.startsWith("http") || cardBg.startsWith("data:") || cardBg.startsWith("/card")
                    ? cardBg
                    : `/api/files/${cardBg}`
                  : null
              }
              onUploaded={(_, url) => {
                setCardBg(url);
                toast({ title: "নতুন কভার ব্যাকগ্রাউন্ড স্থায়ীভাবে সংরক্ষণ করা হয়েছে!" });
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
