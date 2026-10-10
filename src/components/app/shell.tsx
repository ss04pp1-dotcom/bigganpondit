"use client";

// Application shell — matches the reference image:
// dark navy sidebar (#0f172a), blue active state (#0d6efd), light content
// area (#f3f4f6), white cards. Mobile: hamburger + Sheet drawer.

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  Menu,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE } from "./nav";
import { ROLE_LABELS, type Role, bn, APP_TITLE } from "@/lib/constants";
import { NoticeTicker } from "./notice-ticker";
import { TodayRoutineModal } from "./today-routine-modal";

export interface ShellUser {
  name: string;
  role: Role;
  shortName?: string;
  photoUrl?: string | null;
}

export function AppShell({
  user,
  academyName,
  logoUrl,
  children,
}: {
  user: ShellUser;
  academyName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = NAV_BY_ROLE[user.role] ?? [];

  // Change password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [userRequest, setUserRequest] = useState<{
    id: number;
    status: string;
    reason?: string | null;
    admin_notes?: string | null;
    created_at: string;
    reviewed_at?: string | null;
  } | null>(null);
  const [savingPass, setSavingPass] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const { toast } = useToast();

  async function loadUserRequest() {
    if (user.role === "ADMIN") return;
    try {
      const res = await fetch("/api/auth/password-request");
      const json = await res.json();
      if (json.ok) {
        setUserRequest(json.request || null);
      }
    } catch {
      // ignore
    }
  }

  function handleOpenPasswordModal() {
    setPasswordModalOpen(true);
    if (user.role !== "ADMIN") {
      loadUserRequest();
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast({ title: "বর্তমান পাসওয়ার্ড দিন।", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast({ title: "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।", variant: "destructive" });
      return;
    }
    setSavingPass(true);
    try {
      if (user.role === "ADMIN") {
        // Admin changes directly
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast({ title: json.error ?? "পাসওয়ার্ড পরিবর্তন করা যায়নি।", variant: "destructive" });
          return;
        }
        toast({ title: json.message });
        setPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // Teacher/Student sends request for Admin approval
        const res = await fetch("/api/auth/password-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            reason: requestReason,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast({ title: json.error ?? "অনুরোধ পাঠানো যায়নি।", variant: "destructive" });
          return;
        }
        toast({ title: json.message });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setRequestReason("");
        await loadUserRequest();
      }
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSavingPass(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const today = new Date();
  const dateBn = `${bn(today.getDate())} ${
    ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"][today.getMonth()]
  } ${bn(today.getFullYear())}`;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const brand = (
    <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
        {logoUrl ? (
          <img src={logoUrl} alt={academyName} className="h-8 w-8 rounded object-contain" />
        ) : (
          <GraduationCap className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{academyName}</p>
        <p className="truncate text-[11px] leading-tight text-slate-400">{APP_TITLE}</p>
      </div>
    </div>
  );

  const navList = (
    <nav className="app-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-300 hover:bg-sidebar-accent hover:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userCard = (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="h-9 w-9 rounded-full object-cover border border-white/20 shrink-0"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[13px] font-semibold text-blue-200">
            {user.shortName ?? user.name.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
          <p className="text-[11px] text-slate-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-slate-400 hover:bg-white/10 hover:text-amber-300"
          onClick={handleOpenPasswordModal}
          title={user.role === "ADMIN" ? "পাসওয়ার্ড পরিবর্তন" : "পাসওয়ার্ড পরিবর্তনের অনুরোধ"}
        >
          <KeyRound className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-slate-400 hover:bg-white/10 hover:text-white"
          onClick={logout}
          title="লগআউট"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="app-shell min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="app-sidebar no-print fixed inset-y-0 left-0 z-40 hidden w-[176px] flex-col bg-[#0f172a] lg:flex">
        {brand}
        {navList}
        {userCard}
      </aside>

      <div className="print:pl-0 lg:pl-[176px]">
        {/* Top bar */}
        <header className="app-topbar no-print sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
          <div className="flex h-12 items-center gap-3 px-4 sm:px-6">
            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden" aria-label="মেনু">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-0 bg-[#0f172a] p-0 [&>button]:text-white">
                <SheetTitle className="sr-only">নেভিগেশন</SheetTitle>
                <div className="flex h-full flex-col">
                  {brand}
                  {navList}
                  {userCard}
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">{academyName}</p>
              <p className="hidden text-[12px] text-muted-foreground sm:block">{dateBn}</p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Daily Class Routine Button */}
              <TodayRoutineModal triggerButtonOnly />

              <div className="flex items-center gap-2 rounded-full border border-[#d8e3f0] bg-white px-2.5 py-1 shadow-xs">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0d6efd] text-[11px] font-bold text-white shadow-xs shrink-0">
                    {user.shortName ?? user.name.slice(0, 2)}
                  </span>
                )}
                <span className="text-[13px] font-semibold text-[#18314d]">
                  {user.name} {user.shortName ? `(${user.shortName})` : ""}
                </span>
              </div>

            </div>
          </div>
        </header>

        {/* Floating Notice Ticker */}
        <div className="no-print">
          <NoticeTicker />
        </div>

        {/* Content */}
        <main className="app-main mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:py-6 print:m-0 print:p-0 print:max-w-none print:w-auto">{children}</main>
      </div>

      {/* Password Change / Request Dialog */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] text-slate-900">
              <KeyRound className="h-5 w-5 text-amber-600" />
              {user.role === "ADMIN" ? "অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন" : "পাসওয়ার্ড পরিবর্তনের অনুরোধ"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              {user.role === "ADMIN"
                ? "বর্তমান পাসওয়ার্ড যাচাই সাপেক্ষে আপনার নতুন পাসওয়ার্ড নির্ধারণ করুন।"
                : "সাধারণ ব্যবহারকারীদের (শিক্ষক/শিক্ষার্থী) পাসওয়ার্ড পরিবর্তনের অনুরোধ অ্যাডমিন অনুমোদন করার পর কার্যকর হবে।"}
            </DialogDescription>
          </DialogHeader>

          {/* Teacher/Student Status Notifications */}
          {user.role !== "ADMIN" && userRequest && (
            <div className="pt-1">
              {userRequest.status === "PENDING" && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[12px] text-amber-900">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">অনুরোধ অপেক্ষমাণ আছে</p>
                    <p className="text-amber-700 mt-0.5">
                      আপনার একটি পাসওয়ার্ড পরিবর্তনের অনুরোধ বর্তমানে অ্যাডমিনের অনুমোদনের অপেক্ষায় আছে। আপনি চাইলে নিচের ফর্মে নতুন অনুরোধ পাঠাতে পারেন।
                    </p>
                  </div>
                </div>
              )}
              {userRequest.status === "REJECTED" && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-[12px] text-rose-900">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">পূর্ববর্তী অনুরোধ প্রত্যাখ্যান করা হয়েছে</p>
                    <p className="text-rose-700 mt-0.5">
                      মন্তব্য: {userRequest.admin_notes || "অনুরোধটি বাতিল করা হয়েছে।"}
                    </p>
                  </div>
                </div>
              )}
              {userRequest.status === "APPROVED" && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-[12px] text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">অনুরোধ অনুমোদিত হয়েছিল</p>
                    <p className="text-emerald-700 mt-0.5">
                      আপনার সর্বশেষ পাসওয়ার্ড পরিবর্তনের অনুরোধটি অ্যাডমিন অনুমোদন করেছেন।
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">
                বর্তমান পাসওয়ার্ড <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showOldPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="আপনার বর্তমান পাসওয়ার্ড দিন"
                  className="h-10 pr-9 text-[13px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">
                {user.role === "ADMIN" ? "নতুন পাসওয়ার্ড" : "কাঙ্ক্ষিত নতুন পাসওয়ার্ড"} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড"
                  className="h-10 pr-9 text-[13px]"
                  required
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
              <Label className="text-[12px] font-medium text-slate-700">
                নতুন পাসওয়ার্ড পুনরায় লিখুন <span className="text-red-500">*</span>
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                className="h-10 text-[13px]"
                required
              />
            </div>

            {user.role !== "ADMIN" && (
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-slate-700">
                  পরিবর্তনের কারণ / নোট (ঐচ্ছিক)
                </Label>
                <Input
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="যেমন: পাসওয়ার্ড ভুলে যাওয়ার আশঙ্কা / ফোন নম্বর"
                  className="h-10 text-[13px]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                disabled={savingPass}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                disabled={savingPass}
                className={user.role === "ADMIN" ? "bg-blue-600 hover:bg-blue-700 text-white gap-2" : "bg-amber-600 hover:bg-amber-700 text-white gap-2"}
              >
                {savingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {user.role === "ADMIN" ? "পাসওয়ার্ড পরিবর্তন করুন" : "অ্যাডমিনের কাছে অনুরোধ পাঠান"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auto-popup Today's Routine Modal for Logged-in Users */}
      <TodayRoutineModal />
    </div>
  );
}
