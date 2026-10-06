"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, User, Eye, EyeOff, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
      toast({ title: `স্বাগতম, ${json.name}!` });
      router.replace(json.redirect);
      router.refresh();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="reference-login">
      <section className="reference-login-brand">
        <div className="reference-login-brand-inner">
          <div className="reference-login-brand-title" aria-hidden="true">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
        </div>
      </section>

      <section className="reference-login-form-side">
        <div className="reference-login-card">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf3ff] text-[#087cf5] ring-1 ring-[#cfe3fb]">
              {logoUrl ? <img src={logoUrl} alt={academyName} className="h-11 w-11 rounded-full object-contain" /> : <GraduationCap className="h-7 w-7" />}
            </div>
            <h1 className="text-[18px] font-bold text-[#18314d]">শিক্ষক লগইন</h1>
            <p className="mt-1 text-[11px] text-slate-500">{academyName} • {appTitle}</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="ইউজারনেম (RI / MH)" className="h-10 pl-9" autoComplete="username" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="পাসওয়ার্ড" className="h-10 pl-9 pr-10" autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="পাসওয়ার্ড দেখান/লুকান">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="h-10 w-full bg-[#087cf5] text-[13px] hover:bg-[#076bd2]" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} লগইন
            </Button>
          </form>

          {demoHint && (
            <div className="mt-4 rounded border border-dashed border-[#cdd9e7] bg-[#f7faff] p-2.5 text-[10px] leading-relaxed text-slate-500">
              শিক্ষক: <b>rakibul / 0092</b> · <b>mehedi / 2732</b>
            </div>
          )}
          <p className="mt-4 text-center text-[10px] text-slate-400">{appTitle}</p>
        </div>
      </section>
    </div>
  );
}
