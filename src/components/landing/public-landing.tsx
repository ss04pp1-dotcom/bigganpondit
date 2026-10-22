"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Users,
  ShieldCheck,
  Monitor,
  BarChart3,
  Award,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
  Play,
  Star,
  CheckCircle2,
  X,
  Settings,
  LayoutDashboard,
  LogIn,
  FileText,
  Sparkles,
  Calendar,
} from "lucide-react";
import type {
  LandingPageConfig,
  LandingCourse,
  LandingNotice,
  CourseColorTheme,
  CourseSymbolType,
} from "@/lib/landing-config";

interface PublicLandingProps {
  academyName: string;
  logoUrl: string | null;
  appTitle: string;
  config: LandingPageConfig;
  dashboardUrl?: string | null;
  isAdmin?: boolean;
}

function FeatureIcon({ name }: { name: string }) {
  switch (name) {
    case "graduation":
      return <GraduationCap className="h-5 w-5" />;
    case "monitor":
      return <Monitor className="h-5 w-5" />;
    case "users":
      return <Users className="h-5 w-5" />;
    case "chart":
      return <BarChart3 className="h-5 w-5" />;
    case "book":
      return <BookOpen className="h-5 w-5" />;
    case "shield":
      return <ShieldCheck className="h-5 w-5" />;
    case "award":
      return <Award className="h-5 w-5" />;
    default:
      return <GraduationCap className="h-5 w-5" />;
  }
}

function StatIcon({ name }: { name: string }) {
  switch (name) {
    case "users":
      return <Users className="h-5 w-5" />;
    case "graduation":
      return <GraduationCap className="h-5 w-5" />;
    case "book":
      return <BookOpen className="h-5 w-5" />;
    case "award":
      return <Award className="h-5 w-5" />;
    default:
      return <Award className="h-5 w-5" />;
  }
}

function SubjectSymbolBadge({
  symbol,
  theme,
}: {
  symbol: CourseSymbolType;
  theme: CourseColorTheme;
}) {
  const bgMap: Record<CourseColorTheme, string> = {
    blue: "bg-gradient-to-br from-blue-500 to-indigo-700 text-white",
    green: "bg-gradient-to-br from-emerald-500 to-green-700 text-white",
    purple: "bg-gradient-to-br from-purple-500 to-indigo-700 text-white",
    emerald: "bg-gradient-to-br from-teal-500 to-emerald-700 text-white",
    orange: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
  };

  return (
    <div className="mx-auto -mt-7 relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white p-1 shadow-md">
      <div
        className={`flex h-full w-full items-center justify-center rounded-full font-serif text-xl font-bold shadow-inner ${bgMap[theme] || bgMap.blue}`}
      >
        {symbol === "atom" && (
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(30 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(90 12 12)" />
          </svg>
        )}
        {symbol === "flask" && (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
            <path d="M9 3h6M10 3v6.2L4.8 18.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.5L14 9.2V3" />
            <path d="M7 15h10" />
          </svg>
        )}
        {symbol === "pi" && <span className="text-2xl font-extrabold tracking-tight">π</span>}
        {symbol === "dna" && (
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="hidden" />
            <path d="M17 3c-5 0-7 5-10 9s-5 9-5 9" />
            <path d="M7 3c5 0 7 5 10 9s5 9 5 9" />
            <path d="M11 6c2 2 4 4 4 6s-2 4-4 6" />
            <path d="M5 12c2-3 6-6 12-6" />
          </svg>
        )}
        {symbol === "sigma" && <span className="text-2xl font-extrabold">∑</span>}
        {symbol === "book" && <BookOpen className="h-6 w-6" />}
      </div>
    </div>
  );
}

function SubjectBannerIllustration({
  course,
}: {
  course: LandingCourse;
}) {
  if (course.imageUrl && course.imageUrl.trim() !== "") {
    return (
      <div className="relative h-32 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.imageUrl}
          alt={course.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>
    );
  }

  const theme = course.colorTheme || "blue";

  if (theme === "blue") {
    // Physics: Blue cosmos + E=mc2 + atom & pendulum
    return (
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#0f296b] via-[#1d4ed8] to-[#38bdf8]">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-cyan-300/20 blur-xl" />
        <div className="absolute left-3 top-3 rounded bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-cyan-100 backdrop-blur-sm">
          E = mc²
        </div>
        <svg
          viewBox="0 0 200 100"
          className="absolute inset-0 h-full w-full opacity-35"
          fill="none"
        >
          <circle cx="150" cy="48" r="28" stroke="#bae6fd" strokeWidth="1.5" strokeDasharray="3 3" />
          <ellipse cx="150" cy="48" rx="38" ry="14" transform="rotate(25 150 48)" stroke="#fff" strokeWidth="1.5" />
          <ellipse cx="150" cy="48" rx="38" ry="14" transform="rotate(-25 150 48)" stroke="#7dd3fc" strokeWidth="1.5" />
          <path d="M20 80 Q 50 20, 80 80 T 140 80" stroke="#e0f2fe" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-100/90">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>বলবিদ্যা ও তড়িৎ</span>
        </div>
      </div>
    );
  }

  if (theme === "green") {
    // Chemistry: Green lab flasks, molecules, H2O
    return (
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#059669] to-[#34d399]">
        <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-emerald-200/20 blur-xl" />
        <div className="absolute right-3 top-3 rounded bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-50 backdrop-blur-sm">
          H₂SO₄ • C₆H₆
        </div>
        <svg
          viewBox="0 0 200 100"
          className="absolute inset-0 h-full w-full opacity-35"
          fill="none"
        >
          {/* Hexagon benzene ring */}
          <polygon
            points="55,22 75,34 75,56 55,68 35,56 35,34"
            stroke="#d1fae5"
            strokeWidth="2"
          />
          <circle cx="55" cy="45" r="11" stroke="#a7f3d0" strokeWidth="1.5" />
          {/* Lab flasks */}
          <path d="M140 25 h12 M143 25 v15 l-14 28 h34 l-14-28 v-15" stroke="#fff" strokeWidth="2" />
          <circle cx="146" cy="58" r="3" fill="#fde047" />
          <circle cx="152" cy="50" r="2" fill="#fde047" />
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-50/90">
          <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
          <span>জৈব ও অজৈব রসায়ন</span>
        </div>
      </div>
    );
  }

  if (theme === "purple") {
    // Math: Purple geometry, Pi, graphs
    return (
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#3b0764] via-[#6d28d9] to-[#a855f7]">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-xl" />
        <div className="absolute left-3 top-3 rounded bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-purple-100 backdrop-blur-sm">
          sin²θ + cos²θ = 1
        </div>
        <svg
          viewBox="0 0 200 100"
          className="absolute inset-0 h-full w-full opacity-35"
          fill="none"
        >
          <polygon points="145,20 180,75 115,75" stroke="#f3e8ff" strokeWidth="2" />
          <rect x="25" y="45" width="32" height="32" stroke="#e9d5ff" strokeWidth="1.8" transform="rotate(-12 25 45)" />
          <path d="M70 70 Q 95 20, 120 70" stroke="#fde047" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-purple-100/90">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>বীজগণিত ও জ্যামিতি</span>
        </div>
      </div>
    );
  }

  if (theme === "emerald") {
    // Biology: Lush green leaf, DNA helix & microscope
    return (
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#14532d] via-[#15803d] to-[#4ade80]">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-lime-200/25 blur-xl" />
        <div className="absolute right-3 top-3 rounded bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-lime-50 backdrop-blur-sm">
          DNA • জেনেটিক্স
        </div>
        <svg
          viewBox="0 0 200 100"
          className="absolute inset-0 h-full w-full opacity-35"
          fill="none"
        >
          <path d="M25 75 C 40 25, 85 25, 100 75 C 115 25, 160 25, 175 75" stroke="#dcfce7" strokeWidth="2" />
          <path d="M25 25 C 40 75, 85 75, 100 25 C 115 75, 160 75, 175 25" stroke="#bbf7d0" strokeWidth="2" />
          <line x1="45" y1="38" x2="45" y2="62" stroke="#fff" strokeWidth="1.5" />
          <line x1="75" y1="36" x2="75" y2="64" stroke="#fff" strokeWidth="1.5" />
          <line x1="125" y1="36" x2="125" y2="64" stroke="#fff" strokeWidth="1.5" />
          <line x1="155" y1="38" x2="155" y2="62" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-green-50/90">
          <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
          <span>উদ্ভিদ ও প্রাণিবিজ্ঞান</span>
        </div>
      </div>
    );
  }

  // Default / Orange: Higher Math (Calculus, Sigma, vectors)
  return (
    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#7c2d12] via-[#ea580c] to-[#fbbf24]">
      <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-amber-200/25 blur-xl" />
      <div className="absolute left-3 top-3 rounded bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-amber-50 backdrop-blur-sm">
        ∫ f(x)dx • lim
      </div>
      <svg
        viewBox="0 0 200 100"
        className="absolute inset-0 h-full w-full opacity-35"
        fill="none"
      >
        <line x1="120" y1="15" x2="120" y2="85" stroke="#ffedd5" strokeWidth="1.5" />
        <line x1="95" y1="65" x2="185" y2="65" stroke="#ffedd5" strokeWidth="1.5" />
        <path d="M100 75 Q 135 10, 180 30" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-50/95">
        <Sparkles className="h-3.5 w-3.5 text-white" />
        <span>ক্যালকুলাস ও ভেক্টর</span>
      </div>
    </div>
  );
}

export function PublicLanding({
  academyName,
  logoUrl,
  config,
  dashboardUrl,
  isAdmin,
}: PublicLandingProps) {
  const [selectedCourse, setSelectedCourse] = useState<LandingCourse | null>(null);
  const [showAllCoursesModal, setShowAllCoursesModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<LandingNotice | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const testimonials = config.testimonials?.length ? config.testimonials : [];
  const activeTestimonial =
    testimonials[testimonialIdx % Math.max(1, testimonials.length)] || null;

  const handlePrevTestimonial = () => {
    if (!testimonials.length) return;
    setTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNextTestimonial = () => {
    if (!testimonials.length) return;
    setTestimonialIdx((prev) => (prev + 1) % testimonials.length);
  };

  const themeCardStyles: Record<
    CourseColorTheme,
    {
      cardBg: string;
      border: string;
      btnBg: string;
      iconColor: string;
    }
  > = {
    blue: {
      cardBg: "bg-gradient-to-b from-[#eff6ff] via-[#f8fafc] to-white",
      border: "border-blue-200/80 hover:border-blue-400",
      btnBg: "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-600/20",
      iconColor: "text-blue-600",
    },
    green: {
      cardBg: "bg-gradient-to-b from-[#ecfdf5] via-[#f8fafc] to-white",
      border: "border-emerald-200/80 hover:border-emerald-400",
      btnBg: "bg-[#16a34a] hover:bg-[#15803d] shadow-emerald-600/20",
      iconColor: "text-emerald-600",
    },
    purple: {
      cardBg: "bg-gradient-to-b from-[#f5f3ff] via-[#f8fafc] to-white",
      border: "border-purple-200/80 hover:border-purple-400",
      btnBg: "bg-[#7c3aed] hover:bg-[#6d28d9] shadow-purple-600/20",
      iconColor: "text-purple-600",
    },
    emerald: {
      cardBg: "bg-gradient-to-b from-[#f0fdf4] via-[#f8fafc] to-white",
      border: "border-green-200/80 hover:border-green-400",
      btnBg: "bg-[#15803d] hover:bg-[#166534] shadow-green-700/20",
      iconColor: "text-green-600",
    },
    orange: {
      cardBg: "bg-gradient-to-b from-[#fff7ed] via-[#f8fafc] to-white",
      border: "border-orange-200/80 hover:border-orange-400",
      btnBg: "bg-[#ea580c] hover:bg-[#c2410c] shadow-orange-600/20",
      iconColor: "text-orange-600",
    },
  };

  const filteredCourses = searchQuery.trim()
    ? config.courses.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : config.courses;

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* ==================== TOP NAVBAR ==================== */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Academy Logo + Stacked Name */}
          <a href="#home" className="flex items-center gap-3 group">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={academyName}
                className="h-11 w-11 rounded-xl object-contain border border-emerald-100 bg-emerald-50/50 p-1"
              />
            ) : (
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#064e3b] to-[#10b981] text-white shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
            )}
            <div className="leading-tight">
              <span className="block text-lg sm:text-xl font-extrabold tracking-tight text-[#06392c]">
                {config.heroTitleLine1 || academyName}
              </span>
              <span className="block text-xs sm:text-sm font-bold text-[#129460]">
                {config.heroTitleLine2 || "একাডেমি"}
              </span>
            </div>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-semibold text-slate-700">
            <a
              href="#home"
              className="relative py-1 text-[#0f8a58] font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[#0f8a58]"
            >
              হোম
            </a>
            <a href="#courses" className="hover:text-[#0f8a58] transition-colors py-1">
              কোর্সসমূহ
            </a>
            <a href="#about" className="hover:text-[#0f8a58] transition-colors py-1">
              আমাদের সম্পর্কে
            </a>
            <a href="#notices" className="hover:text-[#0f8a58] transition-colors py-1">
              নোটিশ
            </a>
            <a href="#features" className="hover:text-[#0f8a58] transition-colors py-1">
              রিসোর্স
            </a>
            <a href="#contact" className="hover:text-[#0f8a58] transition-colors py-1">
              যোগাযোগ
            </a>
          </nav>

          {/* Right: Search Icon + Admin Quick Edit + Login / Registration Pill */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="কোর্স খুঁজুন"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              <Search className="h-4 w-4" />
            </button>

            {isAdmin && (
              <Link
                href="/admin/website"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition"
              >
                <Settings className="h-3.5 w-3.5 text-emerald-700" />
                <span>ওয়েবসাইট এডিট</span>
              </Link>
            )}

            {dashboardUrl ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-[#139460] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#0e7a4e] transition"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>ড্যাশবোর্ডে যান</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#139460] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#0e7a4e] transition"
              >
                <LogIn className="h-4 w-4" />
                <span>{config.loginBtnText || "লগইন / রেজিস্ট্রেশন"}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Instant Search Drawer */}
        {searchOpen && (
          <div className="border-t border-slate-100 bg-emerald-50/60 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <Search className="h-4 w-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোনো বিষয় বা কোর্সের নাম লিখে খুঁজুন (যেমন: পদার্থবিজ্ঞান, রসায়ন, গণিত)..."
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  মুছুন
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO BANNER ==================== */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-r from-[#042b22] via-[#094738] to-[#23533d] text-white"
      >
        {/* Warm sunlit atmospheric glow on the right + subtle science formulas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -right-20 top-0 h-[420px] w-[520px] rounded-full bg-gradient-to-bl from-amber-200/30 via-emerald-400/15 to-transparent blur-3xl" />
          <div className="absolute left-1/3 top-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          {/* Subtle decorative scientific watermarks */}
          <div className="hidden lg:block absolute left-[46%] top-12 font-serif text-2xl font-bold text-white/10 select-none rotate-[-8deg]">
            E = mc²
          </div>
          <div className="hidden lg:block absolute left-[54%] bottom-16 font-serif text-xl font-bold text-white/10 select-none">
            ∫ f(x)dx
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Top dotted tagline */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{config.heroTagline}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>

              {/* Main 2-Tone Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.12]">
                <span className="text-white">{config.heroTitleLine1} </span>
                <span className="text-[#22c55e]">{config.heroTitleLine2}</span>
              </h1>

              {/* Sub-heading */}
              <h2 className="text-lg sm:text-2xl font-bold text-white/95">
                {config.heroSubtitleHeading}
              </h2>

              {/* Description */}
              <p className="max-w-xl text-sm sm:text-[15px] leading-relaxed text-emerald-50/85">
                {config.heroDescription}
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <a
                  href="#courses"
                  className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 hover:bg-[#15803d] transition"
                >
                  <span>{config.heroPrimaryBtnText}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <a
                  href="#about"
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/20 transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#064e3b]">
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  </span>
                  <span>{config.heroSecondaryBtnText}</span>
                </a>
              </div>
            </div>

            {/* Right Visual Column: Quote + Books Stack & Student Scene */}
            <div className="lg:col-span-5 relative flex flex-col items-center lg:items-end">
              {/* Floating Quote with green brush underline */}
              {config.heroQuote && (
                <div className="mb-4 lg:mb-5 text-center lg:text-right">
                  <p className="text-lg sm:text-xl font-bold text-white drop-shadow-xs">
                    {config.heroQuote}
                  </p>
                  <svg
                    viewBox="0 0 180 12"
                    className="mx-auto lg:ml-auto lg:mr-2 mt-1 h-2.5 w-36 text-[#22c55e]"
                    fill="none"
                  >
                    <path
                      d="M3 9 C 55 2, 125 2, 177 8"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              {config.heroImageUrl && config.heroImageUrl.trim() !== "" ? (
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={config.heroImageUrl}
                    alt={academyName}
                    className="h-64 sm:h-72 w-full object-cover"
                  />
                </div>
              ) : (
                /* Built-in Rich Artwork matching the screenshot: sunlit study window, student silhouette & stack of Physics/Chemistry/Math/Biology textbooks */
                <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-[#0d4a3a]/90 via-[#165b45]/85 to-[#785c38]/60 p-5 shadow-2xl backdrop-blur-md overflow-hidden">
                  {/* Sunlit window panes in background */}
                  <div className="absolute right-4 top-4 grid grid-cols-2 gap-1.5 opacity-30">
                    <div className="h-14 w-12 rounded-xs bg-amber-100/60" />
                    <div className="h-14 w-12 rounded-xs bg-amber-100/60" />
                    <div className="h-14 w-12 rounded-xs bg-amber-100/40" />
                    <div className="h-14 w-12 rounded-xs bg-amber-100/40" />
                  </div>

                  <div className="relative z-10 flex items-end justify-between gap-4 pt-4">
                    {/* Stack of 4 Science Books (BIOLOGY, MATHEMATICS, CHEMISTRY, PHYSICS) */}
                    <div className="flex flex-col gap-1.5 w-3/5">
                      <div className="rounded-md bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-2 text-[11px] font-extrabold tracking-wider text-white shadow-md border-l-4 border-amber-300 flex items-center justify-between">
                        <span>BIOLOGY</span>
                        <span className="text-[10px] font-normal text-emerald-100">জীববিজ্ঞান</span>
                      </div>
                      <div className="rounded-md bg-gradient-to-r from-amber-700 to-orange-600 px-3 py-2 text-[11px] font-extrabold tracking-wider text-white shadow-md border-l-4 border-yellow-200 ml-1.5 flex items-center justify-between">
                        <span>MATHEMATICS</span>
                        <span className="text-[10px] font-normal text-amber-100">গণিত</span>
                      </div>
                      <div className="rounded-md bg-gradient-to-r from-teal-800 to-emerald-700 px-3 py-2 text-[11px] font-extrabold tracking-wider text-white shadow-md border-l-4 border-emerald-300 flex items-center justify-between">
                        <span>CHEMISTRY</span>
                        <span className="text-[10px] font-normal text-teal-100">রসায়ন</span>
                      </div>
                      <div className="rounded-md bg-gradient-to-r from-blue-900 to-indigo-800 px-3 py-2.5 text-xs font-extrabold tracking-wider text-white shadow-md border-l-4 border-cyan-300 ml-1 flex items-center justify-between">
                        <span>PHYSICS</span>
                        <span className="text-[10px] font-normal text-blue-100">পদার্থবিজ্ঞান</span>
                      </div>
                    </div>

                    {/* Student / Scholar Badge Card */}
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white/15 p-3.5 text-center backdrop-blur-md border border-white/20 w-2/5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-emerald-500 text-[#042b22] shadow-inner">
                        <GraduationCap className="h-8 w-8" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-white">স্মার্ট লার্নিং</p>
                      <p className="text-[10px] text-emerald-100/90">অনলাইন ও অফলাইন</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 6-COLUMN FEATURE STRIP ==================== */}
      <section id="features" className="relative z-20 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/75">
            {config.features.map((feat) => (
              <div
                key={feat.id}
                className="flex items-start gap-2.5 p-3.5 sm:p-4 hover:bg-emerald-50/40 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3f6ec] text-[#0e8a56]">
                  <FeatureIcon name={feat.iconName} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[13.5px] font-extrabold text-slate-800 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SUBJECT-WISE COURSE PROGRAM SECTION ==================== */}
      <section id="courses" className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#128a58]">
                <span className="h-0.5 w-5 rounded-full bg-[#128a58]" />
                <span>{config.coursesSectionTag}</span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-800">
                {config.coursesSectionTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAllCoursesModal(true)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              <span>{config.coursesViewAllText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 5 Subject Course Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {filteredCourses.map((course) => {
              const theme = course.colorTheme || "blue";
              const style = themeCardStyles[theme] || themeCardStyles.blue;

              return (
                <div
                  key={course.id}
                  className={`group flex flex-col rounded-2xl border ${style.border} ${style.cardBg} overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300`}
                >
                  {/* Top Banner Artwork */}
                  <SubjectBannerIllustration course={course} />

                  {/* Overlapping Circular Symbol Badge */}
                  <SubjectSymbolBadge
                    symbol={course.symbol || "atom"}
                    theme={theme}
                  />

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col px-4 pt-2.5 pb-4">
                    <h3 className="text-center text-lg font-extrabold text-slate-800">
                      {course.title}
                    </h3>
                    <p className="mt-1 text-center text-[11.5px] text-slate-600 leading-snug min-h-[2rem]">
                      {course.subtitle}
                    </p>

                    <div className="my-3 border-t border-slate-200/80" />

                    {/* 3 Bullet Points */}
                    <ul className="space-y-1.5 text-xs font-medium text-slate-700 mb-4 flex-1">
                      <li className="flex items-center gap-2">
                        <BookOpen className={`h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
                        <span>{course.bullet1}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className={`h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
                        <span>{course.bullet2}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${style.iconColor}`} />
                        <span>{course.bullet3}</span>
                      </li>
                    </ul>

                    {/* Bottom Colored Action Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(course)}
                      className={`mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 px-4 text-xs font-bold text-white shadow-md transition ${style.btnBg}`}
                    >
                      <span>{course.buttonText || "বিস্তারিত দেখুন"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== ABOUT US + 2x2 STATS SECTION ==================== */}
      <section id="about" className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-12">
              {/* Left Column: Study Desk & Books Visual ("Dream Learn Achieve") */}
              <div className="lg:col-span-4">
                {config.aboutImageUrl && config.aboutImageUrl.trim() !== "" ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={config.aboutImageUrl}
                      alt={config.aboutTitle}
                      className="h-60 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative h-60 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#e2ece9] via-[#cfe3dc] to-[#b5d4c9] p-5 shadow-inner flex flex-col justify-between border border-emerald-200/60">
                    {/* Decorative soft blurred window light */}
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/50 blur-xl" />
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-emerald-900 shadow-2xs">
                        বিজ্ঞান পণ্ডিত লাইব্রেরি
                      </span>
                      <BookOpen className="h-5 w-5 text-emerald-800" />
                    </div>

                    {/* Center Mug + Stacked Books Graphic */}
                    <div className="relative z-10 my-auto flex items-end justify-center gap-4 pt-2">
                      {/* Stacked Notebooks */}
                      <div className="space-y-1.5 w-36">
                        <div className="h-5 rounded bg-[#1e3a8a] px-2 text-[9px] font-bold text-white flex items-center shadow-xs">
                          SCIENCE NOTES
                        </div>
                        <div className="h-5 rounded bg-[#047857] px-2 text-[9px] font-bold text-white flex items-center shadow-xs ml-2">
                          FORMULA BOOK
                        </div>
                        <div className="h-6 rounded bg-[#b45309] px-2 text-[9px] font-bold text-white flex items-center shadow-xs">
                          QUESTION BANK
                        </div>
                      </div>

                      {/* "Dream Learn Achieve" Mug */}
                      <div className="relative flex h-24 w-20 flex-col items-center justify-center rounded-xl bg-white p-2 text-center shadow-md border border-slate-200">
                        <div className="absolute -right-2.5 top-5 h-10 w-3 rounded-r-full border-4 border-white" />
                        <span className="font-serif text-xs font-extrabold leading-tight text-slate-800">
                          Dream
                          <br />
                          <span className="text-emerald-600">Learn</span>
                          <br />
                          Achieve
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 text-center text-[11px] font-semibold text-emerald-950/80">
                      মানসম্মত শিক্ষা ও আধুনিক গাইডলাইন
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Column: About Text & Button */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#128a58]">
                  <span className="h-0.5 w-5 rounded-full bg-[#128a58]" />
                  <span>{config.aboutTag}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                  {config.aboutTitle}
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  {config.aboutDescription}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAboutModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#139460] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#0e7a4e] transition"
                  >
                    <span>{config.aboutBtnText || "আরও জানুন"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: 2x2 Stats Grid */}
              <div className="lg:col-span-4">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#e6f4ed] p-3.5 border border-[#cbe6d8]">
                  {config.stats.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-3 rounded-xl bg-white/90 p-3.5 shadow-2xs border border-emerald-100"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcf2e6] text-[#0f8a58]">
                        <StatIcon name={st.iconName} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg sm:text-xl font-extrabold text-[#064e3b] leading-tight">
                          {st.value}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 leading-tight mt-0.5">
                          {st.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BOTTOM SPLIT: NOTICES & STUDENT TESTIMONIALS ==================== */}
      <section id="notices" className="py-6 sm:py-10 mb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
            {/* Left 6 Cols: Recent Notices */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                  {config.noticesSectionTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (config.notices.length > 0) {
                      setSelectedNotice(config.notices[0]);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
                >
                  <span>{config.noticesViewAllText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {config.notices.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => setSelectedNotice(notice)}
                    className="w-full text-left flex items-center justify-between gap-3.5 rounded-xl bg-white p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-emerald-500 hover:shadow-md transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Green Date Box */}
                      <div className="flex flex-col items-center justify-center rounded-lg bg-[#e3f5ec] px-3 py-1.5 text-center min-w-[60px] border border-emerald-200/70">
                        <span className="text-base sm:text-lg font-extrabold text-[#0c7a4d] leading-none">
                          {notice.day}
                        </span>
                        <span className="mt-0.5 text-[11px] font-bold text-[#149460]">
                          {notice.month}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#0c7a4d] transition line-clamp-2">
                        {notice.title}
                      </h3>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right 6 Cols: Student Testimonials */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                  {config.testimonialsSectionTitle}
                </h2>
                {testimonials.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextTestimonial}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition"
                  >
                    <span>{config.testimonialsViewAllText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {activeTestimonial && (
                <div className="flex-1 flex flex-col justify-between rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-xs">
                  <div>
                    {/* Student Header */}
                    <div className="flex items-center gap-3.5">
                      {activeTestimonial.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeTestimonial.avatarUrl}
                          alt={activeTestimonial.studentName}
                          className="h-13 w-13 rounded-full object-cover border-2 border-emerald-500"
                        />
                      ) : (
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-lg font-extrabold text-white shadow-xs">
                          {activeTestimonial.studentName.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800">
                          {activeTestimonial.studentName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {activeTestimonial.studentBatch}
                        </p>
                      </div>
                    </div>

                    {/* Quote */}
                    <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-700 italic">
                      “{activeTestimonial.comment}”
                    </p>
                  </div>

                  {/* Bottom Rating Stars + Dots + Prev/Next Buttons */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {/* 5 Golden Stars */}
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: activeTestimonial.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex items-center gap-1.5">
                      {testimonials.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTestimonialIdx(idx)}
                          aria-label={`মতামত ${idx + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            idx === testimonialIdx % testimonials.length
                              ? "w-5 bg-[#139460]"
                              : "w-2 bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Prev / Next Arrows */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevTestimonial}
                        aria-label="পূর্ববর্তী মতামত"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTestimonial}
                        aria-label="পরবর্তী মতামত"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#139460] text-white hover:bg-[#0e7a4e] transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== DARK FOREST-GREEN FOOTER ==================== */}
      <footer id="contact" className="mt-auto bg-[#052920] text-white">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12 pb-8 border-b border-white/10">
            {/* Col 1: Brand & Tagline */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-lg font-extrabold text-white leading-none">
                    {config.heroTitleLine1}
                  </span>
                  <span className="block text-sm font-bold text-emerald-400 mt-0.5">
                    {config.heroTitleLine2}
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold tracking-wider text-emerald-200/90 pt-1">
                {config.footerTagline}
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="lg:col-span-2 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">দ্রুত লিংক</h3>
              <ul className="space-y-1.5 text-xs text-emerald-100/80">
                <li>
                  <a href="#home" className="hover:text-white transition">
                    • হোম
                  </a>
                </li>
                <li>
                  <a href="#courses" className="hover:text-white transition">
                    • কোর্সসমূহ
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition">
                    • আমাদের সম্পর্কে
                  </a>
                </li>
                <li>
                  <a href="#notices" className="hover:text-white transition">
                    • নোটিশ
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition">
                    • পোর্টাল লগইন
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Contact Info */}
            <div className="lg:col-span-3 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">যোগাযোগ</h3>
              <ul className="space-y-2 text-xs text-emerald-100/85">
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{config.contactAddress}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <a href={`tel:${config.contactPhone}`} className="hover:underline">
                    {config.contactPhone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <a href={`mailto:${config.contactEmail}`} className="hover:underline">
                    {config.contactEmail}
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Newsletter */}
            <div className="lg:col-span-3 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">
                {config.newsletterTitle}
              </h3>
              <p className="text-xs text-emerald-100/80">
                {config.newsletterSubtitle}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) {
                    setNewsletterSubscribed(true);
                    setNewsletterEmail("");
                  }
                }}
                className="flex items-center overflow-hidden rounded-full bg-white/10 p-1 border border-white/15 focus-within:border-emerald-400"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={config.newsletterPlaceholder}
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-emerald-200/60 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="সাবস্ক্রাইব"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-white hover:bg-[#15803d] transition"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
              {newsletterSubscribed && (
                <p className="text-[11px] font-semibold text-emerald-300">
                  ধন্যবাদ! আপনার ইমেইল সফলভাবে যুক্ত হয়েছে।
                </p>
              )}
            </div>
          </div>

          {/* Bottom Copyright & Motto */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200/75">
            <p>{config.copyrightText}</p>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{config.footerMotto}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== MODALS FOR COURSE DETAILS, ALL COURSES, NOTICE, ABOUT ==================== */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SubjectBannerIllustration course={selectedCourse} />
            <button
              type="button"
              onClick={() => setSelectedCourse(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {selectedCourse.targetClass}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedCourse.schedule}
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
                {selectedCourse.title}
              </h3>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                {selectedCourse.subtitle}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {selectedCourse.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-center text-xs font-bold text-slate-700">
                <div className="rounded-lg bg-white p-2 shadow-2xs">
                  {selectedCourse.bullet1}
                </div>
                <div className="rounded-lg bg-white p-2 shadow-2xs">
                  {selectedCourse.bullet2}
                </div>
                <div className="rounded-lg bg-white p-2 shadow-2xs">
                  {selectedCourse.bullet3}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900">
                <span>{selectedCourse.feeLabel}</span>
                <span>যোগাযোগ: {config.contactPhone}</span>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <a
                  href={`tel:${config.contactPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>কল করুন</span>
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#139460] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e7a4e]"
                >
                  <span>পোর্টালে লগইন</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {selectedNotice.day} {selectedNotice.month}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">
              {selectedNotice.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              {selectedNotice.details}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="rounded-full bg-[#139460] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e7a4e]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Details Modal */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAboutModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs font-bold text-emerald-700">{config.aboutTag}</div>
            <h3 className="mt-1 text-xl font-extrabold text-slate-900">
              {config.aboutTitle}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {config.aboutDescription}
            </p>
            {config.aboutDetails && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {config.aboutDetails}
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="rounded-full bg-[#139460] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e7a4e]"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Courses Modal */}
      {showAllCoursesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setShowAllCoursesModal(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                {config.coursesSectionTitle} ({config.courses.length}টি কোর্স)
              </h3>
              <button
                type="button"
                onClick={() => setShowAllCoursesModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {config.courses.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-400"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-800">
                        {c.title}
                      </h4>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        {c.targetClass}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                      <span>• {c.bullet1}</span>
                      <span>• {c.bullet2}</span>
                      <span>• {c.bullet3}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllCoursesModal(false);
                      setSelectedCourse(c);
                    }}
                    className="shrink-0 rounded-full bg-[#139460] px-4 py-2 text-xs font-bold text-white hover:bg-[#0e7a4e]"
                  >
                    বিস্তারিত
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
