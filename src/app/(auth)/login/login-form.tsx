"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, User, Eye, EyeOff, Fingerprint, Key, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fromBase64Url, toBase64Url } from "@/lib/auth/webauthn";
import { DEVELOPER_INFO } from "@/lib/constants";

export function LoginForm({
  academyName,
  logoUrl,
  appTitle,
  demoHint,
}: {
  academyName: string;
  logoUrl: string | null;
  appTitle: string;
  demoHint: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const postLoginTarget = (fallback: string): string => {
    try {
      const n = new URLSearchParams(window.location.search).get("next");
      if (
        n &&
        n.startsWith("/") &&
        !n.startsWith("//") &&
        !n.startsWith("/\\") &&
        !n.startsWith("/api/")
      ) {
        return n;
      }
    } catch {
      /* ignore */
    }
    return fallback;
  };

  // Forgot password -> Admin approval request state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotReason, setForgotReason] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  async function handlePasswordChangeRequest(e: React.FormEvent) {
    e.preventDefault();
    const target = forgotUsername.trim() || username.trim();
    if (!target) {
      toast({ title: "ইউজারনেম বা আইডি লিখুন।", variant: "destructive" });
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 4) {
      toast({ title: "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।", variant: "destructive" });
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      toast({ title: "নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।", variant: "destructive" });
      return;
    }

    setForgotBusy(true);
    try {
      const res = await fetch("/api/auth/password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: target,
          newPassword: forgotNewPass.trim(),
          reason: forgotReason.trim() || "পাসওয়ার্ড ভুলে গেছি — অ্যাডমিন অনুমোদনের অনুরোধ",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "অনুরোধ পাঠানো যায়নি। সঠিক ইউজারনেম দিন।", variant: "destructive" });
        return;
      }
      setRequestSuccess(true);
      toast({ title: "অনুরোধ সফলভাবে পাঠানো হয়েছে!" });
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setForgotBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "লগইন ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }
      if (json.mustChangePassword) {
        toast({
          title: "পাসওয়ার্ড পরিবর্তন করুন!",
          description: "আপনি এখনো প্রাথমিক পাসওয়ার্ড ব্যবহার করছেন। নিরাপত্তার জন্য এখনই পাসওয়ার্ড বদলে ফেলুন।",
          variant: "destructive",
        });
      }
      toast({ title: `স্বাগতম, ${json.name}!` });
      window.location.href = postLoginTarget(json.redirect);
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function loginWithFingerprint() {
    if (busy) return;
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast({
        title: "বায়োমেট্রিক অসমর্থিত",
        description: "আপনার ব্রাউজার বা ডিভাইসে ফিঙ্গারপ্রিন্ট সেন্সর উপলব্ধ নেই।",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const optUrl = username.trim()
        ? `/api/auth/webauthn/login?username=${encodeURIComponent(username.trim())}`
        : "/api/auth/webauthn/login";
      const optRes = await fetch(optUrl);
      const optJson = await optRes.json();
      if (!optRes.ok || !optJson.ok) {
        toast({ title: optJson.error ?? "বায়োমেট্রিক প্রস্তুতি ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }
      const { challenge, rpId, allowCredentials, userVerification, timeout } = optJson;
      const challengeBytes = fromBase64Url(challenge);
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes as unknown as BufferSource,
          rpId: rpId || window.location.hostname,
          allowCredentials: (allowCredentials || []).map((c: any) => ({
            id: fromBase64Url(c.id) as unknown as BufferSource,
            type: "public-key" as const,
          })),
          userVerification: userVerification || "preferred",
          timeout: timeout || 60000,
        },
      })) as (PublicKeyCredential & { rawId: ArrayBuffer; response: AuthenticatorAssertionResponse }) | null;

      if (!credential) {
        toast({ title: "ফিঙ্গারপ্রিন্ট যাচাই করা যায়নি।", variant: "destructive" });
        return;
      }

      const rawId = toBase64Url(new Uint8Array(credential.rawId));
      const clientDataJSON = new TextDecoder().decode(credential.response.clientDataJSON);
      const authenticatorData = toBase64Url(new Uint8Array(credential.response.authenticatorData));
      const signature = toBase64Url(new Uint8Array(credential.response.signature));

      const verifyRes = await fetch("/api/auth/webauthn/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: rawId,
          rawClientData: clientDataJSON,
          authenticatorData,
          signature,
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok) {
        toast({ title: verifyJson.error ?? "ফিঙ্গারপ্রিন্ট দিয়ে লগইন ব্যর্থ হয়েছে।", variant: "destructive" });
        return;
      }
      toast({ title: `স্বাগতম, ${verifyJson.name}! বায়োমেট্রিক লগইন সফল।` });
      window.location.href = postLoginTarget(verifyJson.redirect);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast({ title: "ফিঙ্গারপ্রিন্ট অনুরোধ বাতিল করা হয়েছে।", variant: "destructive" });
      } else {
        toast({ title: "ফিঙ্গারপ্রিন্ট দিয়ে লগইন করা যায়নি। সাধারণ পাসওয়ার্ড ব্যবহার করুন।", variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#022851] via-[#07366b] to-[#e8eef6] flex flex-col items-center justify-between px-4 py-8">
      {/* Top Header Branding */}
      <header className="w-full max-w-lg text-center text-white pt-2 pb-6">
        <div className="mb-3 flex justify-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur-xs transition"
          >
            <span>← হোমপেজ ও কোর্সসমূহ দেখুন</span>
          </a>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
          নম্বর সংগ্রাহক ও রিপোর্ট সফটওয়্যার
        </h1>
        <p className="mt-3 text-lg sm:text-xl font-bold text-white tracking-wide">
          {academyName || "বিজ্ঞান পণ্ডিত একাডেমি"}
        </p>
        <p className="mt-1 text-xs sm:text-sm font-medium text-blue-200">
          সঠিক মূল্যায়ন, উজ্জ্বল ভবিষ্যৎ
        </p>
        <p className="mt-1 text-[11px] font-mono text-blue-200/75">
          Developed by {DEVELOPER_INFO.name} • {DEVELOPER_INFO.company}
        </p>
      </header>

      {/* Main Single Unified Login Card — Exactly one login option */}
      <main className="w-full max-w-[420px]">
        <div className="w-full rounded-[28px] border border-white/60 bg-white p-7 sm:p-8 shadow-[0_16px_45px_rgba(2,40,81,0.18)]">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f1fc] border border-blue-100 p-2 shadow-inner overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={academyName} className="h-full w-full object-contain rounded-full" />
              ) : (
                <img
                  src="/logo.png"
                  alt={academyName}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                  className="h-full w-full object-contain rounded-full"
                />
              )}
            </div>
            <h2 className="text-[22px] font-bold text-[#142942]">অ্যাকাউন্ট লগইন</h2>
            <p className="mt-1 text-[12px] text-slate-500">পরিচালক • শিক্ষক • শিক্ষার্থী • অ্যাডমিন</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ইউজারনেম (আইডি / রোল / শিক্ষক / অ্যাডমিন)"
                className="h-11 pl-10 rounded-lg border-[#cfdbe8] bg-white text-[13px] focus-visible:ring-[#0d6efd]"
                autoComplete="username"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড"
                className="h-11 pl-10 pr-10 rounded-lg border-[#cfdbe8] bg-white text-[13px] focus-visible:ring-[#0d6efd]"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="পাসওয়ার্ড দেখান/লুকান"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end -mt-1 pb-1">
              <button
                type="button"
                onClick={() => {
                  setForgotUsername(username);
                  setRequestSuccess(false);
                  setForgotOpen(true);
                }}
                className="text-[12px] font-medium text-[#0d6efd] hover:text-[#0b5ed7] hover:underline cursor-pointer"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-[#0d6efd] text-[15px] font-semibold text-white shadow-md hover:bg-[#0b5ed7] transition-all cursor-pointer"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} লগইন
            </Button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-2 text-[11px] text-slate-400">অথবা বায়োমেট্রিক</span>
            </div>

            <Button
              type="button"
              onClick={loginWithFingerprint}
              disabled={busy}
              className="h-11 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Fingerprint className="h-5 w-5 text-emerald-100" />
              <span>আঙুলের ছাপ (Fingerprint) দিয়ে লগইন</span>
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-400 font-medium">সঠিক মূল্যায়ন, উজ্জ্বল ভবিষ্যৎ</p>

          {/* Forgot Password Request to Admin Dialog */}
          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[17px] text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  পাসওয়ার্ড রিসেট অনুরোধ (অ্যাডমিন অনুমোদন)
                </DialogTitle>
                <DialogDescription className="text-[12px] text-slate-500">
                  আপনার ইউজারনেম এবং কাঙ্ক্ষিত নতুন পাসওয়ার্ড দিন। অনুরোধটি অ্যাডমিনের কাছে অনুমোদনের জন্য যাবে। অ্যাডমিন Accept করলেই আপনার নতুন পাসওয়ার্ড কার্যকর হবে।
                </DialogDescription>
              </DialogHeader>

              {requestSuccess ? (
                <div className="space-y-4 pt-3 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">অনুরোধ সফলভাবে গৃহীত হয়েছে!</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      আপনার পাসওয়ার্ড পরিবর্তনের অনুরোধটি অ্যাডমিন প্যানেলে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন (Accept) করার পর আপনি নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setForgotOpen(false);
                      setRequestSuccess(false);
                      setForgotNewPass("");
                      setForgotConfirmPass("");
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    ঠিক আছে
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChangeRequest} className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-700">ইউজারনেম (আইডি / রোল)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="যেমন: student01 বা আপনার ইউজারনেম"
                        className="pl-9 h-10 text-[13px]"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-700">নতুন পাসওয়ার্ড</label>
                    <div className="relative">
                      <Input
                        type={showForgotPass ? "text" : "password"}
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        placeholder="কমপক্ষে ৪ অক্ষর"
                        className="h-10 pr-9 text-[13px]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showForgotPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-700">নতুন পাসওয়ার্ড পুনরায় লিখুন</label>
                    <Input
                      type="password"
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="একই পাসওয়ার্ড লিখুন"
                      className="h-10 text-[13px]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-700">কারণ (ঐচ্ছিক)</label>
                    <Input
                      type="text"
                      value={forgotReason}
                      onChange={(e) => setForgotReason(e.target.value)}
                      placeholder="যেমন: পাসওয়ার্ড ভুলে গেছি"
                      className="h-9 text-[12px]"
                    />
                  </div>

                  <div className="rounded-lg bg-blue-50/70 p-2.5 border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
                    ℹ️ কোনো ওটিপি বা ইমেইল কোডের প্রয়োজন নেই। অনুরোধটি সরাসরি অ্যাডমিনের কাছে যাবে।
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForgotOpen(false)}
                      disabled={forgotBusy}
                    >
                      বাতিল
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotBusy}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      {forgotBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      অনুরোধ পাঠান
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>

      {/* Developer Signature & Branding Footer */}
      <footer className="mt-6 text-center text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700">
          Developed by {DEVELOPER_INFO.name} • <span className="text-blue-700">{DEVELOPER_INFO.company}</span>
        </p>
        <p className="text-[11px] text-slate-500 font-mono">
          Gmail: <a href={`mailto:${DEVELOPER_INFO.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">{DEVELOPER_INFO.email}</a>
        </p>
      </footer>
    </div>
  );
}
