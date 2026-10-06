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
  const [savingPass, setSavingPass] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const { toast } = useToast();

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
          onClick={() => setPasswordModalOpen(true)}
          title="পাসওয়ার্ড পরিবর্তন"
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
      <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[176px] flex-col bg-[#0f172a] lg:flex">
        {brand}
        {navList}
        {userCard}
      </aside>

      <div className="lg:pl-[176px]">
        {/* Top bar */}
        <header className="app-topbar sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
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

            <div className="flex items-center gap-3">
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
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setPasswordModalOpen(true)}
                title="পাসওয়ার্ড পরিবর্তন করুন"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden sm:inline">পাসওয়ার্ড</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[12px] font-semibold text-[#0d6efd] hover:bg-[#eef5fc] hover:text-[#0b5ed7]"
                onClick={logout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>লগআউট</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="app-main mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:py-6">{children}</main>
      </div>

      {/* Password Change Dialog for Logged-in User */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px] text-slate-900">
              <KeyRound className="h-5 w-5 text-amber-600" />
              পাসওয়ার্ড পরিবর্তন করুন
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখতে বর্তমান পাসওয়ার্ড নিশ্চিত করে নতুন পাসওয়ার্ড দিন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
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
                নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
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
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {savingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                পাসওয়ার্ড পরিবর্তন করুন
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
