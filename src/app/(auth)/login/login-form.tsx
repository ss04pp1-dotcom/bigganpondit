"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, User, Eye, EyeOff, GraduationCap, Fingerprint, Mail, Key, ShieldCheck, ArrowLeft } from "lucide-react";
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

  // Forgot password & Resend OTP state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotUserId, setForgotUserId] = useState<number | null>(null);
  const [forgotEmailMasked, setForgotEmailMasked] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const target = forgotUsername.trim() || username.trim();
    if (!target) {
      toast({ title: "ইউজারনেম বা আইডি লিখুন।", variant: "destructive" });
      return;
    }
    setForgotBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: target }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "ওটিপি পাঠানো যায়নি।", variant: "destructive" });
        return;
      }
      setForgotUserId(json.userId);
      setForgotEmailMasked(json.emailMasked);
      setForgotStep("verify");
      toast({ title: json.message });
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      toast({ title: "৬-সংখ্যার ওটিপি কোড লিখুন।", variant: "destructive" });
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: forgotUserId,
          otp: forgotOtp.trim(),
          newPassword: forgotNewPass.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "পাসওয়ার্ড রিসেট করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setForgotOpen(false);
      setForgotStep("request");
      if (forgotUsername) setUsername(forgotUsername);
      setPassword("");
      setForgotOtp("");
      setForgotNewPass("");
      setForgotConfirmPass("");
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
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
          description: "আপনি এখনো প্রাথমিক (ডিফল্ট) পাসওয়ার্ড ব্যবহার করছেন। নিরাপত্তার জন্য এখনই পাসওয়ার্ড বদলে ফেলুন।",
          variant: "destructive",
        });
      }
      toast({ title: `স্বাগতম, ${json.name}!` });
      window.location.href = json.redirect;
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    } finally { setBusy(false); }
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
      // authenticatorData + signature are REQUIRED for server-side
      // cryptographic verification of the assertion.
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
      window.location.href = verifyJson.redirect;
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
    <div className="reference-login flex min-h-screen w-full flex-col md:flex-row bg-[#edf2f8]">
      {/* Left Brand Side — exact to Panel 1 */}
      <section className="relative flex flex-col justify-between w-full md:w-[52%] min-h-[280px] md:min-h-screen p-8 sm:p-12 bg-[#0a2749] text-white overflow-hidden shadow-2xl">
        {/* Subtle decorative glow & overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c315d] via-[#092546] to-[#05182e] opacity-95" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-4 pt-6 md:pt-0">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <GraduationCap className="h-11 w-11 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white drop-shadow-md">
            নম্বর সংগ্রাহক ও রিপোর্ট সফটওয়্যার
          </h1>
          <p className="text-base sm:text-lg font-semibold text-blue-200">
            {academyName || "বিজ্ঞান পণ্ডিত একাডেমি"}
          </p>
        </div>

        <div className="relative z-10 text-center pb-2">
          <p className="text-xs sm:text-sm font-medium tracking-wider text-blue-300/80">
            সঠিক মূল্যায়ন, উজ্জ্বল ভবিষ্যৎ
          </p>
        </div>
      </section>

      {/* Right Login Card Side */}
      <section className="flex flex-1 items-center justify-center p-4 sm:p-8 md:p-12 bg-[#f4f7fc]">
        <div className="w-full max-w-[390px] rounded-xl border border-[#d8e2ee] bg-white p-7 sm:p-8 shadow-[0_12px_40px_rgba(11,35,68,0.12)]">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-[#edf4ff] text-[#0d6efd] border border-[#d0e2fc] shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt={academyName} className="h-12 w-12 rounded-full object-contain" />
              ) : (
                <User className="h-8 w-8 text-[#0d6efd]" />
              )}
            </div>
            <h2 className="text-[20px] font-bold text-[#142942]">অ্যাকাউন্ট লগইন</h2>
            <p className="mt-1 text-[12px] text-slate-500">পরিচালক • শিক্ষক • শিক্ষার্থী • অ্যাডমিন</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ইউজারনেম (RI / MH)"
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
                onChange={e => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড"
                className="h-11 pl-10 pr-10 rounded-lg border-[#cfdbe8] bg-white text-[13px] focus-visible:ring-[#0d6efd]"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
                  setForgotStep("request");
                  setForgotOpen(true);
                }}
                className="text-[12px] font-medium text-[#0d6efd] hover:text-[#0b5ed7] hover:underline"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-[#0d6efd] text-[14px] font-semibold text-white shadow-md hover:bg-[#0b5ed7] transition-all cursor-pointer"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} লগইন
            </Button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-2 text-[11px] text-slate-400">
                অথবা বায়োমেট্রিক
              </span>
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

          {demoHint && (
            <div className="mt-5 rounded-lg border border-dashed border-[#c6d7ea] bg-[#f8fbff] p-3 text-[11px] leading-relaxed text-slate-600">
              শিক্ষক: <b>rakibul / 0092</b> · <b>mehedi / 2732</b>
            </div>
          )}
          <p className="mt-5 text-center text-[11px] text-slate-400 font-medium">সঠিক মূল্যায়ন, উজ্জ্বল ভবিষ্যৎ</p>

          {/* Forgot Password & Resend OTP Dialog */}
          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[17px] text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  {forgotStep === "request" ? "পাসওয়ার্ড রিসেট ও ওটিপি" : "ওটিপি যাচাই ও নতুন পাসওয়ার্ড"}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-slate-500">
                  {forgotStep === "request"
                    ? "আপনার ইউজারনেম দিন। অ্যাকাউন্টে যুক্ত রিকভারি ইমেইলে Resend-এর মাধ্যমে একটি ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।"
                    : `${forgotEmailMasked || "ইমেইলে"} পাঠানো ৬-সংখ্যার ওটিপি কোডটি লিখুন এবং নতুন পাসওয়ার্ড সেট করুন।`}
                </DialogDescription>
              </DialogHeader>

              {forgotStep === "request" ? (
                <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-slate-700">ইউজারনেম (লগইন আইডি)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="যেমন: admin"
                        className="pl-9 h-10 text-[13px]"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
                    <Mail className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>অ্যাকাউন্টে যুক্ত রিকভারি ইমেইলে ওটিপি যাবে। ওটিপিটির মেয়াদ ১০ মিনিট থাকবে।</span>
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
                      {forgotBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      ওটিপি পাঠান
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-slate-700">৬-সংখ্যার ওটিপি কোড (OTP)</label>
                    <Input
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="যেমন: 123456"
                      className="h-11 text-center font-mono tracking-widest text-lg font-bold"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-slate-700">নতুন পাসওয়ার্ড</label>
                    <div className="relative">
                      <Input
                        type={showForgotNewPass ? "text" : "password"}
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        placeholder="কমপক্ষে ৪ অক্ষর"
                        className="h-10 pr-9 text-[13px]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showForgotNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
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

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep("request")}
                      className="text-[12px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> পুনরায় কোড পাঠান
                    </button>
                    <div className="flex gap-2">
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      >
                        {forgotBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                        পাসওয়ার্ড রিসেট করুন
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
