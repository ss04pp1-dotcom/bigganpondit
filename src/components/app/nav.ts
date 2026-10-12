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
  Building2,
  CheckSquare,
  Bell,
  BookMarked,
  UserCheck,
  Award,
  CalendarDays,
  Layers,
} from "lucide-react";
import type { Role } from "@/lib/constants";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  DIRECTOR: [
    { href: "/director/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/director/teachers", label: "শিক্ষক পরিদর্শক", icon: GraduationCap },
    { href: "/director/classes", label: "শ্রেণি ও ব্যাচ", icon: Layers },
    { href: "/director/students", label: "শিক্ষার্থী", icon: Users },
    { href: "/director/attendance", label: "হাজিরা শিট", icon: CheckSquare },
    { href: "/director/routine", label: "ক্লাস রুটিন", icon: CalendarDays },
    { href: "/director/results", label: "ফলাফল ও মার্কশিট", icon: Search },
    { href: "/director/result-cards", label: "রেজাল্ট কার্ড", icon: Award },
    { href: "/director/notebooks", label: "প্রকাশনী", icon: BookMarked },
    { href: "/director/notices", label: "নোটিশ বোর্ড", icon: Bell },
  ],
  TEACHER: [
    { href: "/teacher/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/teacher/students", label: "শিক্ষার্থী", icon: Users },
    { href: "/teacher/attendance", label: "হাজিরা শিট", icon: CheckSquare },
    { href: "/teacher/routine", label: "ক্লাস রুটিন", icon: CalendarDays },
    { href: "/teacher/marks", label: "নম্বর দিন", icon: ClipboardEdit },
    { href: "/teacher/results", label: "ফলাফল অনুসন্ধান", icon: Search },
    { href: "/teacher/result-cards", label: "রেজাল্ট কার্ড", icon: Award },
    { href: "/teacher/monthly-report", label: "মাসিক রিপোর্ট", icon: FileText },
    { href: "/teacher/annual-report", label: "বার্ষিক রিপোর্ট", icon: CalendarRange },
    { href: "/teacher/merit-list", label: "মেধা তালিকা", icon: Trophy },
    { href: "/teacher/notebooks", label: "প্রকাশনী", icon: BookMarked },
    { href: "/teacher/notices", label: "নোটিশ বোর্ড", icon: Bell },
    { href: "/teacher/settings", label: "সেটিংস", icon: Settings },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/admin/directors", label: "পরিচালক", icon: Building2 },
    { href: "/admin/teachers", label: "শিক্ষক", icon: GraduationCap },
    { href: "/admin/classes", label: "শ্রেণি ও ব্যাচ", icon: Layers },
    { href: "/admin/students", label: "শিক্ষার্থী", icon: Users },
    { href: "/admin/attendance", label: "হাজিরা শিট", icon: CheckSquare },
    { href: "/admin/routine", label: "ক্লাস রুটিন", icon: CalendarDays },
    { href: "/admin/subjects", label: "বিষয়", icon: BookOpen },
    { href: "/admin/marks", label: "নম্বর এন্ট্রি", icon: ClipboardEdit },
    { href: "/admin/results", label: "ফলাফল ও মার্কশিট", icon: Search },
    { href: "/admin/result-cards", label: "রেজাল্ট কার্ড", icon: Award },
    { href: "/admin/notebooks", label: "প্রকাশনী", icon: BookMarked },
    { href: "/admin/notices", label: "নোটিশ বোর্ড", icon: Bell },
    { href: "/admin/settings", label: "সেটিংস", icon: Settings },
    { href: "/admin/backup", label: "ব্যাকআপ", icon: DatabaseBackup },
  ],
  STUDENT: [
    { href: "/student/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/student/profile", label: "আমার প্রোফাইল", icon: User },
    { href: "/student/routine", label: "ক্লাস রুটিন", icon: CalendarDays },
    { href: "/student/results", label: "ফলাফল", icon: Search },
    { href: "/student/monthly-result", label: "মাসিক ফলাফল", icon: FileText },
    { href: "/student/annual-result", label: "বার্ষিক ফলাফল", icon: CalendarRange },
    { href: "/student/notebooks", label: "প্রকাশনী", icon: BookMarked },
    { href: "/student/notices", label: "নোটিশ বোর্ড", icon: Bell },
  ],
};

export const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string; size?: number }>> = {
  ADMIN: ShieldCheck,
  DIRECTOR: Building2,
  TEACHER: GraduationCap,
  STUDENT: Users,
};
