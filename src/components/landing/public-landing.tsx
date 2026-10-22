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
  Target,
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
  Calendar,
  ClipboardList,
  Calculator,
  Facebook,
  Youtube,
  Instagram,
  Send,
  PenTool,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type {
  LandingPageConfig,
  LandingCourse,
  LandingNotice,
  CourseHeaderColor,
  CourseSymbolType,
  WidgetAccentColor,
} from "@/lib/landing-config";

interface PublicLandingProps {
  academyName: string;
  logoUrl: string | null;
  appTitle: string;
  config: LandingPageConfig;
  dashboardUrl?: string | null;
  isAdmin?: boolean;
}

/* ------------------------------------------------------------------ */
/* Icon helpers                                                        */
/* ------------------------------------------------------------------ */

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "h-5 w-5";
  switch (name) {
    case "graduation":
      return <GraduationCap className={cls} />;
    case "monitor":
      return <Monitor className={cls} />;
    case "users":
      return <Users className={cls} />;
    case "chart":
      return <BarChart3 className={cls} />;
    case "book":
      return <BookOpen className={cls} />;
    case "shield":
      return <ShieldCheck className={cls} />;
    case "award":
      return <Award className={cls} />;
    case "target":
      return <Target className={cls} />;
    case "clipboard":
      return <ClipboardList className={cls} />;
    case "calculator":
      return <Calculator className={cls} />;
    case "pen":
      return <PenTool className={cls} />;
    case "file":
      return <FileText className={cls} />;
    case "trend":
      return <TrendingUp className={cls} />;
    case "play":
      return <Play className={cls} />;
    default:
      return <GraduationCap className={cls} />;
  }
}

const ACCENT_STYLES: Record<
  WidgetAccentColor,
  { bg: string; text: string; ring: string; solid: string }
> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", ring: "ring-blue-500/30", solid: "bg-blue-600" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", ring: "ring-cyan-500/30", solid: "bg-cyan-500" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/30", solid: "bg-emerald-600" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400", ring: "ring-rose-500/30", solid: "bg-rose-600" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-500/30", solid: "bg-amber-500" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", ring: "ring-violet-500/30", solid: "bg-violet-600" },
};

const STAT_ACCENT_STYLES: Record<
  WidgetAccentColor,
  { bg: string; text: string }
> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  rose: { bg: "bg-rose-50", text: "text-rose-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-600" },
};

/* ------------------------------------------------------------------ */
/* Course card header (colored block with white symbol icon)           */
/* ------------------------------------------------------------------ */

const HEADER_BG: Record<CourseHeaderColor, string> = {
  navy: "bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#2547b8]",
  teal: "bg-gradient-to-br from-[#115e59] via-[#0f766e] to-[#14b8a6]",
  emerald: "bg-gradient-to-br from-[#065f46] via-[#059669] to-[#10b981]",
  violet: "bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed]",
  orange: "bg-gradient-to-br from-[#9a3412] via-[#c2410c] to-[#ea580c]",
  slate: "bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#374151]",
};

function CourseSymbol({ symbol }: { symbol: CourseSymbolType }) {
  switch (symbol) {
    case "atom":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="1.5">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(90 12 12)" />
        </svg>
      );
    case "flask":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="1.8">
          <path d="M9 3h6M10 3v6.2L4.8 18.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.5L14 9.2V3" />
          <path d="M7 15h10" />
        </svg>
      );
    case "pi":
      return <span className="text-3xl font-extrabold">π</span>;
    case "dna":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="1.8">
          <path d="M17 3c-5 0-7 5-10 9s-5 9-5 9" />
          <path d="M7 3c5 0 7 5 10 9s5 9 5 9" />
          <path d="M11 6c2 2 4 4 4 6s-2 4-4 6" />
          <path d="M5 12c2-3 6-6 12-6" />
        </svg>
      );
    case "sigma":
      return <span className="text-3xl font-extrabold">∑</span>;
    case "monitor":
      return <Monitor className="h-8 w-8" strokeWidth={1.6} />;
    case "calculator":
      return <Calculator className="h-8 w-8" strokeWidth={1.6} />;
    case "clipboard":
      return <ClipboardList className="h-8 w-8" strokeWidth={1.6} />;
    case "target":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </svg>
      );
    case "book":
    default:
      return <BookOpen className="h-8 w-8" strokeWidth={1.6} />;
  }
}

function CourseCardHeader({
  course,
  onOpen,
}: {
  course: LandingCourse;
  onOpen?: () => void;
}) {
  return (
    <div className={`relative h-32 w-full overflow-hidden ${HEADER_BG[course.headerColor]}`}>
      {/* background photo mode */}
      {course.imageUrl && course.imageUrl.trim() !== "" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.imageUrl}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* decorative formula watermark (only when no photo) */}
      {!course.imageUrl && (
        <div className="absolute right-3 top-3 select-none font-serif text-sm font-bold text-white/25">
          {course.symbol === "atom" && "E = mc²"}
          {course.symbol === "flask" && "H₂SO₄"}
          {course.symbol === "pi" && "π = 3.14"}
          {course.symbol === "dna" && "DNA"}
          {course.symbol === "sigma" && "∫f(x)dx"}
          {course.symbol === "monitor" && "0101"}
          {course.symbol === "calculator" && "∑ x²"}
          {course.symbol === "clipboard" && "A+"}
          {course.symbol === "target" && "96%"}
          {course.symbol === "book" && "ABC"}
        </div>
      )}

      {/* Semi-transparent symbol icon — top-left */}
      <div className="absolute left-4 top-4 text-white/60">
        <CourseSymbol symbol={course.symbol} />
      </div>

      {/* Title + subtitle — bottom-left */}
      <div className="absolute bottom-3 left-4 right-16">
        <h3 className="text-[15px] sm:text-base font-extrabold leading-tight text-white drop-shadow-sm">
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="mt-0.5 text-[11px] font-medium leading-tight text-white/85">
            {course.subtitle}
          </p>
        )}
      </div>

      {/* Arrow circle — bottom-right, overlapping body */}
      <button
        type="button"
        onClick={onOpen ?? (() => {})}
        aria-label={`${course.title} বিস্তারিত`}
        className="absolute bottom-0 right-4 z-10 flex h-9 w-9 translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-2 ring-black/5 transition hover:scale-105 hover:text-[#2563eb]"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const filteredCourses = searchQuery.trim()
    ? config.courses.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.subjects.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : config.courses;

  const heroImage =
    config.heroImageUrl && config.heroImageUrl.trim() !== ""
      ? config.heroImageUrl
      : "/landing/hero-student.jpg";
  const campusImage =
    config.aboutImageUrl && config.aboutImageUrl.trim() !== ""
      ? config.aboutImageUrl
      : "/landing/campus.jpg";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ==================== TOP NAVBAR (dark navy) ==================== */}
      <header className="sticky top-0 z-40 w-full bg-[#0f172a] text-white shadow-lg shadow-black/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Logo + Academy name */}
          <a href="#home" className="flex items-center gap-3 group shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={academyName}
                className="h-11 w-11 rounded-xl object-contain border border-white/15 bg-white/5 p-1"
              />
            ) : (
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] text-white shadow-md">
                <GraduationCap className="h-6 w-6" />
              </div>
            )}
            <div className="leading-tight">
              <span className="block text-base sm:text-lg font-extrabold tracking-tight text-white">
                {config.heroBadgeText.includes("বিজ্ঞান পণ্ডিত")
                  ? "বিজ্ঞান পণ্ডিত"
                  : academyName}
              </span>
              <span className="block text-[11px] sm:text-xs font-bold text-cyan-300 tracking-wide">
                একাডেমি
              </span>
            </div>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-200">
            {config.navItems.map((item) => (
              <a
                key={item.id}
                href={item.href || "#"}
                className="rounded-md px-1 py-1.5 text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right: Search + Login/Register */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((p) => !p)}
              aria-label="কোর্স খুঁজুন"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition"
            >
              <Search className="h-4 w-4" />
            </button>

            {isAdmin && (
              <Link
                href="/admin/website"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/20 transition"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>ওয়েবসাইট এডিট</span>
              </Link>
            )}

            {dashboardUrl ? (
              <Link
                href={dashboardUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/30 hover:bg-[#1d4ed8] transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">ড্যাশবোর্ডে যান</span>
                <span className="sm:hidden">ড্যাশবোর্ড</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-white/10 transition"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{config.loginBtnText}</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/30 hover:bg-[#1d4ed8] transition"
                >
                  <span>{config.registerBtnText}</span>
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              aria-label="মেনু"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20 transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-white/10 bg-[#0f172a] px-4 py-3 space-y-1">
            {config.navItems.map((item) => (
              <a
                key={item.id}
                href={item.href || "#"}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {/* Instant Search Drawer */}
        {searchOpen && (
          <div className="border-t border-white/10 bg-[#15213b] px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <Search className="h-4 w-4 text-cyan-300 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোনো বিষয় বা কোর্সের নাম লিখে খুঁজুন (যেমন: পদার্থবিজ্ঞান, রসায়ন, গণিত)..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  মুছুন
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO (photo bg + overlay) ==================== */}
      <section id="home" className="relative overflow-hidden bg-[#0f172a]">
        {/* Background photo */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={academyName}
            className="h-full w-full object-cover object-center"
          />
          {/* Left-dark → right-lighter overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/95 via-[#0f172a]/75 to-[#0f172a]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left content column */}
            <div className="lg:col-span-7 space-y-5">
              {/* Location badge chip */}
              {config.heroBadgeText && (
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                  <span className="text-xs sm:text-sm font-semibold text-cyan-200">
                    {config.heroBadgeText}
                  </span>
                </div>
              )}

              {/* Tagline */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span>{config.heroTagline}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              </div>

              {/* Main headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.12] text-white">
                {config.heroTitleLine1}{" "}
                <span className="bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent">
                  {config.heroTitleLine2}
                </span>
              </h1>

              {/* Description */}
              <p className="max-w-xl text-sm sm:text-[15px] leading-relaxed text-slate-300">
                {config.heroDescription}
              </p>

              {/* CTA buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-3.5">
                <a
                  href="#courses"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/40 hover:bg-[#1d4ed8] transition"
                >
                  <span>{config.heroPrimaryBtnText}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#about"
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0f172a]">
                    <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                  </span>
                  <span>{config.heroSecondaryBtnText}</span>
                </a>
              </div>

              {/* Quick-entry chips (HSC 2026 / SSC 2026 ...) */}
              {config.heroChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {config.heroChips.map((chip) => (
                    <a
                      key={chip.id}
                      href="#courses"
                      className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-200 backdrop-blur-sm hover:border-cyan-300/50 hover:bg-cyan-400/10 hover:text-white transition"
                    >
                      <Sparkles className="h-3 w-3 text-cyan-300" />
                      <span>{chip.label}</span>
                      <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-cyan-300 transition" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Right visual column: floating glass widget */}
            <div className="lg:col-span-5 relative flex flex-col items-center gap-6">
              {/* Decorative handwritten-style text */}
              {config.heroDecorText && (
                <p className="hidden lg:block -rotate-3 select-none text-2xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rose-400 drop-shadow-sm">
                  {config.heroDecorText}
                </p>
              )}

              {config.heroWidget.length > 0 && (
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/60 p-3 shadow-2xl backdrop-blur-md">
                  <div className="divide-y divide-white/5">
                    {config.heroWidget.map((item) => {
                      const accent = ACCENT_STYLES[item.color] || ACCENT_STYLES.blue;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3.5 px-2 py-3"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md ${accent.solid}`}
                          >
                            <FeatureIcon name={item.iconName} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold leading-tight text-white">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="mt-0.5 truncate text-[11px] font-medium leading-tight text-slate-300">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURE STRIP (dark navy) ==================== */}
      <section id="features" className="relative z-10 bg-[#0f172a] border-t border-white/5">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-white/5 sm:divide-x">
            {config.features.map((feat) => (
              <div
                key={feat.id}
                className="flex items-start gap-2.5 p-4 hover:bg-white/5 transition rounded-lg"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                  <FeatureIcon name={feat.iconName} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[13px] font-extrabold text-white leading-snug">
                    {feat.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-tight">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COURSES (light) ==================== */}
      <section id="courses" className="py-12 sm:py-16 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2563eb]">
                <span className="h-1 w-6 rounded-full bg-[#2563eb]" />
                <span>{config.coursesSectionTag}</span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {config.coursesSectionTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAllCoursesModal(true)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-700 transition"
            >
              <span>{config.coursesViewAllText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Course cards grid — 6 compact cards in a row on wide screens */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {filteredCourses.map((course) => {
              return (
                <div
                  key={course.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Colored header with arrow */}
                  <CourseCardHeader
                    course={course}
                    onOpen={() => setSelectedCourse(course)}
                  />

                  {/* Card body */}
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                    {course.subjects && (
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                        {course.subjects}
                      </p>
                    )}

                    {/* 3 bullets */}
                    <ul className="mt-2 space-y-1 text-[11px] font-medium text-slate-700 mb-3 flex-1">
                      {[course.bullet1, course.bullet2, course.bullet3]
                        .filter((b) => b && b.trim() !== "")
                        .map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#2563eb]" />
                            <span className="leading-tight">{b}</span>
                          </li>
                        ))}
                    </ul>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(course)}
                      className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#2563eb] py-2 px-3 text-[11px] font-bold text-white shadow-md shadow-blue-600/25 hover:bg-[#1d4ed8] transition"
                    >
                      <span className="truncate">{course.buttonText || "বিস্তারিত দেখুন"}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCourses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-500">
                “{searchQuery}” — এই নামে কোনো কোর্স পাওয়া যায়নি।
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ==================== ABOUT (dark navy) ==================== */}
      <section id="about" className="relative overflow-hidden bg-[#0f172a] py-12 sm:py-16">
        {/* decorative glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left: title + description */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-cyan-300">
                <span className="h-1 w-6 rounded-full bg-cyan-300" />
                <span>{config.aboutTag}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {config.aboutSectionTitle}
              </h2>
              <p className="max-w-xl text-sm sm:text-[15px] leading-relaxed text-slate-300">
                {config.aboutSectionDescription}
              </p>
            </div>

            {/* Center: circular icon row with labels */}
            {config.aboutFeatures.length > 0 && (
              <div className="lg:col-span-5">
                <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
                  {config.aboutFeatures.map((af) => (
                    <div
                      key={af.id}
                      className="flex w-[74px] flex-col items-center gap-2 text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-400/25 text-blue-200">
                        <FeatureIcon name={af.iconName} className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-bold leading-tight text-slate-200">
                        {af.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right: decorative paper plane + stacked text */}
            <div className="lg:col-span-2 flex items-center justify-center lg:justify-end gap-3">
              {config.aboutDecorText && (
                <p className="select-none text-right text-lg sm:text-xl font-serif italic font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-400">
                  {config.aboutDecorText.split(" • ").map((word, i) => (
                    <span key={i} className="block">
                      {word}
                    </span>
                  ))}
                </p>
              )}
              <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 text-cyan-300/80" fill="none">
                <path
                  d="M4 30 L52 8 L36 56 L26 40 Z"
                  className="fill-cyan-400/20 stroke-current"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path d="M4 30 L26 40" strokeWidth="2.5" className="stroke-current" />
                <path d="M26 40 L30 52" strokeWidth="2.5" className="stroke-current" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS + CAMPUS (light) ==================== */}
      <section className="py-12 sm:py-16 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left: campus image with blob mask */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-blue-100" preserveAspectRatio="none" aria-hidden>
                  <path d="M 50 0 C 75 0 100 20 100 45 C 100 70 85 95 55 100 C 25 100 0 80 0 50 C 0 20 25 0 50 0 Z" fill="currentColor" transform="translate(-8,-4) scale(1.08)" />
                </svg>
                <div className="relative m-3 overflow-hidden rounded-[40% 60% 55% 45% / 50% 45% 55% 50%] border-4 border-white shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campusImage}
                    alt={config.aboutTitle}
                    className="h-64 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/40 via-transparent to-transparent" />
                </div>
              </div>
            </div>

            {/* Middle: about text */}
            <div className="lg:col-span-4 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {config.aboutTitle}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {config.aboutDescription}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[#2563eb] bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#2563eb] hover:bg-[#2563eb] hover:text-white transition"
                >
                  <span>{config.aboutBtnText || "আরও জানুন"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right: 2x2 stats grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-2 gap-3">
                {config.stats.map((st) => {
                  const accent = STAT_ACCENT_STYLES[st.iconColor] || STAT_ACCENT_STYLES.blue;
                  return (
                    <div
                      key={st.id}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${accent.bg} ${accent.text}`}
                      >
                        <FeatureIcon name={st.iconName} />
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 leading-none">
                        {st.value}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 leading-tight">
                        {st.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== NOTICES & TESTIMONIALS (light) ==================== */}
      <section id="notices" className="py-8 sm:py-12 pb-14 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left 6: notices */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {config.noticesSectionTitle}
                </h2>
                {config.notices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedNotice(config.notices[0])}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-500 hover:text-blue-700 transition"
                  >
                    <span>{config.noticesViewAllText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3 flex-1">
                {config.notices.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => setSelectedNotice(notice)}
                    className="w-full text-left flex items-center justify-between gap-3.5 rounded-xl bg-white p-3 sm:p-3.5 border border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow-md transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Blue date box */}
                      <div className="flex flex-col items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-center min-w-[62px] shadow-md shadow-blue-600/25">
                        <span className="text-base sm:text-lg font-extrabold text-white leading-none">
                          {notice.day}
                        </span>
                        <span className="mt-0.5 text-[11px] font-bold text-blue-100">
                          {notice.month}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-700 transition line-clamp-2">
                        {notice.title}
                      </h3>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
                {config.notices.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                    এখনো কোনো নোটিশ প্রকাশ করা হয়নি।
                  </div>
                )}
              </div>
            </div>

            {/* Right 6: testimonials */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {config.testimonialsSectionTitle}
                </h2>
                {testimonials.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextTestimonial}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-500 hover:text-blue-700 transition"
                  >
                    <span>{config.testimonialsViewAllText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {activeTestimonial && (
                <div className="flex-1 flex flex-col justify-between rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/90 shadow-sm">
                  <div>
                    <div className="flex items-center gap-3.5">
                      {activeTestimonial.avatarUrl &&
                      activeTestimonial.avatarUrl.trim() !== "" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeTestimonial.avatarUrl}
                          alt={activeTestimonial.studentName}
                          className="h-13 w-13 rounded-full object-cover border-2 border-blue-500"
                        />
                      ) : (
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-lg font-extrabold text-white shadow-md">
                          {activeTestimonial.studentName.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {activeTestimonial.studentName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {activeTestimonial.studentBatch}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-700 italic">
                      “{activeTestimonial.comment}”
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: activeTestimonial.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {testimonials.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTestimonialIdx(idx)}
                          aria-label={`মতামত ${idx + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            idx === testimonialIdx % testimonials.length
                              ? "w-5 bg-[#2563eb]"
                              : "w-2 bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevTestimonial}
                        aria-label="পূর্ববর্তী মতামত"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTestimonial}
                        aria-label="পরবর্তী মতামত"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition"
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

      {/* ==================== FOOTER (deep dark) ==================== */}
      <footer id="contact" className="mt-auto relative overflow-hidden bg-[#0b1120] text-white">
        {/* watermark */}
        {config.footerWatermark && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 bottom-10 hidden lg:block select-none font-serif text-3xl italic font-bold text-white/5"
          >
            {config.footerWatermark}
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12 pb-8 border-b border-white/10">
            {/* Col 1: brand + about + socials */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={academyName}
                    className="h-10 w-10 rounded-xl object-contain border border-white/15 bg-white/5 p-1"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] text-white">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <span className="block text-lg font-extrabold text-white leading-none">
                    বিজ্ঞান পণ্ডিত
                  </span>
                  <span className="block text-sm font-bold text-cyan-300 mt-0.5">
                    একাডেমি
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-bold tracking-wider text-cyan-200/90 pt-1">
                {config.footerTagline}
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                {config.footerAboutText}
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-2 pt-1.5">
                {config.facebookUrl && (
                  <a
                    href={config.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-blue-600 hover:text-white transition"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {config.youtubeUrl && (
                  <a
                    href={config.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-red-600 hover:text-white transition"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {config.instagramUrl && (
                  <a
                    href={config.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-pink-600 hover:text-white transition"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {config.telegramUrl && (
                  <a
                    href={config.telegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Telegram"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-sky-500 hover:text-white transition"
                  >
                    <Send className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Col 2: quick links */}
            <div className="lg:col-span-2 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">
                {config.quickLinksTitle}
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {config.navItems.map((item) => (
                  <li key={item.id}>
                    <a href={item.href || "#"} className="hover:text-cyan-300 transition">
                      • {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/login" className="hover:text-cyan-300 transition">
                    • পোর্টাল লগইন
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: support links */}
            <div className="lg:col-span-2 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">
                {config.supportLinksTitle}
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {config.supportLinks.map((item) => (
                  <li key={item.id}>
                    <a href={item.href || "#"} className="hover:text-cyan-300 transition">
                      • {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: contact + newsletter */}
            <div className="lg:col-span-4 space-y-2.5">
              <h3 className="text-sm font-extrabold text-white">
                {config.contactTitle}
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                  <span>{config.contactAddress}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                  <a href={`tel:${config.contactPhone}`} className="hover:underline">
                    {config.contactPhone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                  <a href={`mailto:${config.contactEmail}`} className="hover:underline">
                    {config.contactEmail}
                  </a>
                </li>
              </ul>

              <div className="pt-2">
                <h4 className="text-sm font-extrabold text-white">
                  {config.newsletterTitle}
                </h4>
                <p className="mt-1 text-xs text-slate-400">
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
                  className="mt-2 flex items-center overflow-hidden rounded-full bg-white/10 p-1 border border-white/15 focus-within:border-cyan-400"
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={config.newsletterPlaceholder}
                    className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="সাবস্ক্রাইব"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
                {newsletterSubscribed && (
                  <p className="mt-1.5 text-[11px] font-semibold text-cyan-300">
                    ধন্যবাদ! আপনার ইমেইল সফলভাবে যুক্ত হয়েছে।
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom copyright */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>{config.copyrightText}</p>
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300/80">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>{config.footerMotto}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== MODALS ==================== */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CourseCardHeader course={selectedCourse} />
            <button
              type="button"
              onClick={() => setSelectedCourse(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                  {selectedCourse.targetClass}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedCourse.schedule}
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
                {selectedCourse.title}
              </h3>
              <p className="text-xs font-semibold text-blue-700 mt-0.5">
                {selectedCourse.subtitle}
              </p>
              {selectedCourse.subjects && (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {selectedCourse.subjects}
                </p>
              )}

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {selectedCourse.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-center text-xs font-bold text-slate-700">
                {[selectedCourse.bullet1, selectedCourse.bullet2, selectedCourse.bullet3]
                  .filter((b) => b && b.trim() !== "")
                  .map((b, i) => (
                    <div key={i} className="rounded-lg bg-white p-2 shadow-sm">
                      {b}
                    </div>
                  ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-900">
                <span>{selectedCourse.feeLabel}</span>
                <span>যোগাযোগ: {config.contactPhone}</span>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <a
                  href={`tel:${config.contactPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-600 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>কল করুন</span>
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] px-5 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                >
                  <span>পোর্টালে লগইন</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice details modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
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
                className="rounded-full bg-[#2563eb] px-5 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About details modal */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAboutModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs font-bold text-blue-700">{config.aboutTag}</div>
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
                className="rounded-full bg-[#2563eb] px-5 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All courses modal */}
      {showAllCoursesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-400"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-800">
                        {c.title}
                      </h4>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        {c.targetClass}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                      {[c.bullet1, c.bullet2, c.bullet3]
                        .filter((b) => b && b.trim() !== "")
                        .map((b, i) => (
                          <span key={i}>• {b}</span>
                        ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllCoursesModal(false);
                      setSelectedCourse(c);
                    }}
                    className="shrink-0 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
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
