"use client";

import Link from "next/link";
import {
  BookOpen,
  Award,
  Bell,
  Users,
  ShieldCheck,
  Laptop,
  Clock,
  CheckCircle2,
  LogIn,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  ArrowRight,
  LayoutDashboard,
  Layers,
  Check,
  Settings,
} from "lucide-react";
import type { LandingPageConfig } from "@/lib/landing-config";
import { DEVELOPER_INFO } from "@/lib/constants";

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "book":
      return <BookOpen className={className} />;
    case "award":
      return <Award className={className} />;
    case "bell":
      return <Bell className={className} />;
    case "users":
      return <Users className={className} />;
    case "shield":
      return <ShieldCheck className={className} />;
    case "laptop":
      return <Laptop className={className} />;
    case "clock":
      return <Clock className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
}

export function PublicLanding({
  academyName,
  logoUrl,
  appTitle,
  config,
  dashboardUrl,
  isAdmin,
}: {
  academyName: string;
  logoUrl: string | null;
  appTitle: string;
  config: LandingPageConfig;
  dashboardUrl: string | null;
  isAdmin?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Sticky Navbar with Login option in the top-right corner */}
      <header className="sticky top-0 z-50 border-b border-white/15 bg-[#022851]/95 backdrop-blur-md text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 min-w-0 group">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-inner overflow-hidden border border-blue-200/40">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={academyName}
                  className="h-full w-full object-contain rounded-full"
                />
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
            <div className="min-w-0">
              <span className="block truncate text-base sm:text-lg font-extrabold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                {academyName || "বিজ্ঞান পণ্ডিত একাডেমি"}
              </span>
              <span className="block truncate text-[11px] text-blue-200/90 font-medium">
                সঠিক মূল্যায়ন, উজ্জ্বল ভবিষ্যৎ
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-blue-100">
            <a
              href="#courses"
              className="hover:text-white transition-colors py-1"
            >
              কোর্সসমূহ
            </a>
            <a
              href="#features"
              className="hover:text-white transition-colors py-1"
            >
              বৈশিষ্ট্যসমূহ
            </a>
            <a
              href="#contact"
              className="hover:text-white transition-colors py-1"
            >
              যোগাযোগ ও ভর্তি
            </a>
          </nav>

          {/* Top-Right Corner Login / Dashboard Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin && (
              <Link
                href="/admin/website"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition-all"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>ওয়েবসাইট এডিট</span>
              </Link>
            )}

            {dashboardUrl ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/30 transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>ড্যাশবোর্ড</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6efd] hover:bg-[#0b5ed7] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md border border-white/20 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>লগইন</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#0d6efd] hover:bg-[#0b5ed7] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-950/40 border border-white/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                <span>লগইন করুন</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Admission Announcement Ticker / Banner */}
      {config.admissionBanner && config.admissionBanner.trim() !== "" && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-4 py-2 text-center text-xs sm:text-sm font-bold shadow-xs">
          <div className="mx-auto max-w-6xl flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> ভর্তি বিজ্ঞপ্তি
            </span>
            <span>{config.admissionBanner}</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#022851] via-[#07366b] to-[#0c4a8a] text-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        {/* Decorative subtle background glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          {config.heroBadge && (
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/20 px-4 py-1.5 text-xs sm:text-sm font-semibold text-blue-100 mb-5 backdrop-blur-xs">
              <GraduationCap className="h-4 w-4 text-cyan-300" />
              <span>{config.heroBadge}</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white drop-shadow-xs">
            {config.heroTitle}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm sm:text-base lg:text-lg text-blue-100/90 leading-relaxed font-normal">
            {config.heroSubtitle}
          </p>

          {/* Hero CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="#courses"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm sm:text-base font-bold text-[#022851] shadow-lg hover:bg-blue-50 transition-all"
            >
              <span>কোর্সসমূহ দেখুন</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            <Link
              href={dashboardUrl || "/login"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0d6efd] hover:bg-[#0b5ed7] border border-white/25 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>{dashboardUrl ? "আপনার ড্যাশবোর্ডে যান" : "পোর্টালে লগইন করুন"}</span>
            </Link>
          </div>

          {/* Stats Highlight Grid */}
          {config.stats && config.stats.length > 0 && (
            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {config.stats.map((st) => (
                <div
                  key={st.id}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-xs text-center hover:bg-white/15 transition"
                >
                  <div className="text-xl sm:text-3xl font-extrabold text-cyan-300 tracking-tight">
                    {st.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-medium text-blue-100">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl w-full scroll-mt-16">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-blue-800">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            একাডেমিক প্রোগ্রাম ও কোর্স
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#142942]">
            {config.coursesSectionTitle || "আমাদের চলমান কোর্স ও ব্যাচসমূহ"}
          </h2>
          {config.coursesSectionSubtitle && (
            <p className="mt-2.5 text-sm sm:text-base text-slate-600">
              {config.coursesSectionSubtitle}
            </p>
          )}
        </div>

        {config.courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            কোনো কোর্স এখনো যুক্ত করা হয়নি।
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {config.courses.map((course) => (
              <div
                key={course.id}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                  course.highlight
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200/90"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                        course.highlight
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-700 border border-blue-200/60"
                      }`}
                    >
                      {course.badge || "একাডেমিক কোর্স"}
                    </span>
                    {course.targetClass && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {course.targetClass}
                      </span>
                    )}
                  </div>

                  {/* Course Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-[#142942] group-hover:text-blue-700 transition-colors leading-snug">
                    {course.title}
                  </h3>

                  {/* Description */}
                  {course.description && (
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  {/* Course Key Details Box */}
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs sm:text-[13px]">
                    {course.subjects && (
                      <div className="flex items-start gap-2 text-slate-700">
                        <BookOpen className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">বিষয়সমূহ: </span>
                          <span>{course.subjects}</span>
                        </div>
                      </div>
                    )}
                    {course.schedule && (
                      <div className="flex items-start gap-2 text-slate-700">
                        <CalendarCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">সময়সূচি: </span>
                          <span>{course.schedule}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg">
                    {course.feeLabel || "ভর্তি চলছে"}
                  </div>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0"
                  >
                    <span>বিস্তারিত</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-gradient-to-b from-[#eef4fb] to-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-slate-200/80 scroll-mt-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              স্মার্ট একাডেমি ও ডিজিটাল সেবা
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#142942]">
              {config.featuresSectionTitle || "আমাদের বিশেষ বৈশিষ্ট্য ও ডিজিটাল সুবিধাসমূহ"}
            </h2>
            {config.featuresSectionSubtitle && (
              <p className="mt-2.5 text-sm sm:text-base text-slate-600">
                {config.featuresSectionSubtitle}
              </p>
            )}
          </div>

          {config.features.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              কোনো বৈশিষ্ট্য এখনো যুক্ত করা হয়নি।
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {config.features.map((feat) => (
                <div
                  key={feat.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-200/60">
                      <FeatureIcon name={feat.iconName} className="h-6 w-6" />
                    </div>
                    {feat.badge && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#142942]">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact & Portal Access Section */}
      <section id="contact" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl w-full scroll-mt-16">
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Contact Information Card */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60">
                যোগাযোগ ও ভর্তি অফিস
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#142942]">
                ভর্তি বা যেকোনো তথ্যের জন্য যোগাযোগ করুন
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                সরাসরি আমাদের অফিসে চলে আসুন অথবা নিচের নম্বরে কল করে আপনার সন্তানের উপযুক্ত ব্যাচ সম্পর্কে জেনে নিন।
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {config.contactPhone && (
                  <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">হেল্পলাইন / মোবাইল</p>
                      <a
                        href={`tel:${config.contactPhone}`}
                        className="mt-0.5 block text-sm sm:text-base font-bold text-slate-900 hover:text-blue-600"
                      >
                        {config.contactPhone}
                      </a>
                      {config.contactPhoneAlt && (
                        <a
                          href={`tel:${config.contactPhoneAlt}`}
                          className="block text-xs font-semibold text-slate-700 hover:text-blue-600"
                        >
                          {config.contactPhoneAlt}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {config.officeHours && (
                  <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">অফিস ও ক্লাসের সময়</p>
                      <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900">
                        {config.officeHours}
                      </p>
                    </div>
                  </div>
                )}

                {config.contactAddress && (
                  <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:col-span-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">একাডেমি ক্যাম্পাসের ঠিকানা</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {config.contactAddress}
                      </p>
                    </div>
                  </div>
                )}

                {config.contactEmail && (
                  <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:col-span-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">ইমেইল যোগাযোগ</p>
                      <a
                        href={`mailto:${config.contactEmail}`}
                        className="mt-0.5 block text-sm font-bold text-slate-900 hover:text-blue-600"
                      >
                        {config.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student / Teacher / Admin Portal Login CTA Card */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#022851] via-[#07366b] to-[#0b488c] p-6 sm:p-8 text-white shadow-lg flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                ডিজিটাল একাডেমিক পোর্টাল
              </div>
              <h3 className="mt-4 text-2xl font-extrabold text-white leading-snug">
                শিক্ষার্থী, শিক্ষক ও অ্যাডমিন লগইন পোর্টাল
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                ভর্তিকৃত শিক্ষার্থী ও সম্মানিত শিক্ষকবৃন্দ আপনাদের ইউজারনেম ও পাসওয়ার্ড (অথবা ফিঙ্গারপ্রিন্ট) ব্যবহার করে পোর্টালে প্রবেশ করুন:
              </p>

              <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-blue-100">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>ক্লাস টেস্ট, মাসিক ও বার্ষিক পরীক্ষার রেজাল্ট কার্ড</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>প্রতিদিনের ক্লাস রুটিন ও অটো পুশ নোটিফিকেশন</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>বিজ্ঞান পণ্ডিত প্রকাশনীর ডিজিটাল নোটবুক ও লেকচার শিট</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>মাসিক বেতন, বকেয়া ও পেমেন্ট রশিদ ট্র্যাকিং</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-white/15">
              <Link
                href={dashboardUrl || "/login"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d6efd] hover:bg-[#0b5ed7] border border-white/25 py-3.5 px-6 text-sm sm:text-base font-bold text-white shadow-lg transition-all"
              >
                <LogIn className="h-5 w-5" />
                <span>{dashboardUrl ? "ড্যাশবোর্ডে প্রবেশ করুন" : "অ্যাকাউন্টে লগইন করুন"}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {academyName || "বিজ্ঞান পণ্ডিত একাডেমি"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {appTitle} • সর্বস্বত্ব সংরক্ষিত
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <p className="font-semibold text-slate-700">
              Developed by {DEVELOPER_INFO.name} •{" "}
              <span className="text-blue-700 font-bold">{DEVELOPER_INFO.company}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Gmail:{" "}
              <a
                href={`mailto:${DEVELOPER_INFO.email}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {DEVELOPER_INFO.email}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
