"use client";

// Role-based navigation (client). Icons are lucide components.

import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  Search,
  FileText,
  CalendarRange,
  Trophy,
  Settings,
  DatabaseBackup,
  BookOpen,
  User,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import type { Role } from "@/lib/constants";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  TEACHER: [
    { href: "/teacher/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/teacher/students", label: "শিক্ষার্থী", icon: Users },
    { href: "/teacher/marks", label: "নম্বর দিন", icon: ClipboardEdit },
    { href: "/teacher/results", label: "ফলাফল অনুসন্ধান", icon: Search },
    { href: "/teacher/monthly-report", label: "মাসিক রিপোর্ট", icon: FileText },
    { href: "/teacher/annual-report", label: "বার্ষিক রিপোর্ট", icon: CalendarRange },
    { href: "/teacher/merit-list", label: "মেধা তালিকা", icon: Trophy },
    { href: "/teacher/settings", label: "সেটিংস", icon: Settings },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/admin/teachers", label: "শিক্ষক", icon: GraduationCap },
    { href: "/admin/students", label: "শিক্ষার্থী", icon: Users },
    { href: "/admin/subjects", label: "বিষয়", icon: BookOpen },
    { href: "/admin/results", label: "ফলাফল", icon: Search },
    { href: "/admin/settings", label: "সেটিংস", icon: Settings },
    { href: "/admin/backup", label: "ব্যাকআপ", icon: DatabaseBackup },
  ],
  STUDENT: [
    { href: "/student/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/student/profile", label: "আমার প্রোফাইল", icon: User },
    { href: "/student/results", label: "ফলাফল", icon: Search },
    { href: "/student/monthly-result", label: "মাসিক ফলাফল", icon: FileText },
    { href: "/student/annual-result", label: "বার্ষিক ফলাফল", icon: CalendarRange },
  ],
};

export const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string; size?: number }>> = {
  ADMIN: ShieldCheck,
  TEACHER: GraduationCap,
  STUDENT: Users,
};
