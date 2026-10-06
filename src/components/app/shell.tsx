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
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE } from "./nav";
import { ROLE_LABELS, type Role, bn, APP_TITLE } from "@/lib/constants";

export interface ShellUser {
  name: string;
  role: Role;
  shortName?: string;
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
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-[13px] font-semibold text-blue-200">
          {user.shortName ?? user.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
          <p className="text-[11px] text-slate-400">{ROLE_LABELS[user.role]}</p>
        </div>
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

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-accent px-3 py-1.5 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {user.shortName ?? user.name.slice(0, 2)}
                </span>
                <span className="text-[13px] font-medium text-accent-foreground">{user.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-input text-[13px]"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">লগআউট</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="app-main mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
