"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  BookOpen,
  Sparkles,
  LayoutTemplate,
  Phone,
  CheckCircle2,
  AlertCircle,
  Bell,
  MessageSquareQuote,
  Info,
} from "lucide-react";
import type {
  LandingPageConfig,
  LandingCourse,
  LandingFeature,
  LandingStat,
  LandingNotice,
  LandingTestimonial,
  CourseColorTheme,
  CourseSymbolType,
} from "@/lib/landing-config";

interface WebsiteEditorProps {
  initialConfig: LandingPageConfig;
}

const FEATURE_ICON_OPTIONS = [
  { value: "graduation", label: "গ্র্যাজুয়েশন ক্যাপ (শিক্ষক/একাডেমিক)" },
  { value: "monitor", label: "মনিটর / স্মার্ট ক্লাস" },
  { value: "users", label: "শিক্ষার্থী / গাইডেন্স" },
  { value: "chart", label: "চার্ট / নিয়মিত মূল্যায়ন" },
  { value: "book", label: "বই / ডিজিটাল রিসোর্স" },
  { value: "shield", label: "শিল্ড / নির্ভরযোগ্য প্রতিষ্ঠান" },
  { value: "award", label: "পদক / সাফল্য" },
];

const COURSE_THEME_OPTIONS: { value: CourseColorTheme; label: string }[] = [
  { value: "blue", label: "নীল (পদার্থবিজ্ঞান থিম)" },
  { value: "green", label: "সবুজ (রসায়ন থিম)" },
  { value: "purple", label: "বেগুনি (গণিত থিম)" },
  { value: "emerald", label: "গাঢ় সবুজ (জীববিজ্ঞান থিম)" },
  { value: "orange", label: "কমলা (উচ্চতর গণিত থিম)" },
];

const COURSE_SYMBOL_OPTIONS: { value: CourseSymbolType; label: string }[] = [
  { value: "atom", label: "⚛ পরমাণু (পদার্থবিজ্ঞান)" },
  { value: "flask", label: "🧪 ল্যাব ফ্লাস্ক (রসায়ন)" },
  { value: "pi", label: "π পাই (গণিত)" },
  { value: "dna", label: "🧬 ডিএনএ (জীববিজ্ঞান)" },
  { value: "sigma", label: "∑ সিগমা (উচ্চতর গণিত)" },
  { value: "book", label: "📘 বই (সাধারণ কোর্স)" },
];

export function WebsiteEditor({ initialConfig }: WebsiteEditorProps) {
  const [config, setConfig] = useState<LandingPageConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<
    "hero" | "features" | "courses" | "about" | "notices" | "footer"
  >("courses");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, schemaVersion: 2 } }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        config?: LandingPageConfig;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "সংরক্ষণ করতে সমস্যা হয়েছে।");
      }
      if (data.config) {
        setConfig(data.config);
      }
      setFeedback({
        type: "success",
        text: data.message || "ওয়েবসাইটের সকল পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: (err as Error)?.message || "সংরক্ষণ ব্যর্থ হয়েছে।",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "আপনি কি নিশ্চিত যে হোমপেজের সকল কোর্স, ফিচার ও ডিজাইন ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?"
      )
    ) {
      return;
    }
    setResetting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        config?: LandingPageConfig;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "রিসেট করতে সমস্যা হয়েছে।");
      }
      if (data.config) {
        setConfig(data.config);
      }
      setFeedback({
        type: "success",
        text: data.message || "ডিফল্ট তথ্যে রিসেট করা হয়েছে।",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: (err as Error)?.message || "রিসেট ব্যর্থ হয়েছে।",
      });
    } finally {
      setResetting(false);
    }
  }

  // ---- Course helpers ----
  function addCourse() {
    const newCourse: LandingCourse = {
      id: `crs-${Date.now()}`,
      title: "নতুন বিষয় / কোর্স",
      subtitle: "কোর্সের সংক্ষিপ্ত স্লোগান এখানে লিখুন",
      symbol: "book",
      colorTheme: "blue",
      bullet1: "ক্লাস: ৪০+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "বোর্ড/এডমিশন প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৯ম-১০ম ও এইচএসসি",
      schedule: "সপ্তাহে ৪ দিন ক্লাস",
      feeLabel: "ভর্তি চলছে",
      description: "কোর্সের বিস্তারিত বিবরণ এখানে লিখুন...",
    };
    setConfig((prev) => ({ ...prev, courses: [...prev.courses, newCourse] }));
  }

  function updateCourse(idx: number, patch: Partial<LandingCourse>) {
    setConfig((prev) => {
      const next = [...prev.courses];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, courses: next };
    });
  }

  function removeCourse(idx: number) {
    setConfig((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== idx),
    }));
  }

  function moveCourse(idx: number, dir: -1 | 1) {
    setConfig((prev) => {
      const next = [...prev.courses];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return { ...prev, courses: next };
    });
  }

  // ---- Feature helpers ----
  function addFeature() {
    const newFeat: LandingFeature = {
      id: `feat-${Date.now()}`,
      title: "নতুন বৈশিষ্ট্য",
      description: "সংক্ষিপ্ত বিবরণ লিখুন",
      iconName: "graduation",
    };
    setConfig((prev) => ({ ...prev, features: [...prev.features, newFeat] }));
  }

  function updateFeature(idx: number, patch: Partial<LandingFeature>) {
    setConfig((prev) => {
      const next = [...prev.features];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, features: next };
    });
  }

  function removeFeature(idx: number) {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  }

  // ---- Stat helpers ----
  function addStat() {
    const newStat: LandingStat = {
      id: `st-${Date.now()}`,
      value: "১০০+",
      label: "নতুন পরিসংখ্যান",
      iconName: "award",
    };
    setConfig((prev) => ({ ...prev, stats: [...prev.stats, newStat] }));
  }

  function updateStat(idx: number, patch: Partial<LandingStat>) {
    setConfig((prev) => {
      const next = [...prev.stats];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, stats: next };
    });
  }

  function removeStat(idx: number) {
    setConfig((prev) => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== idx),
    }));
  }

  // ---- Notice helpers ----
  function addNotice() {
    const newNotice: LandingNotice = {
      id: `nt-${Date.now()}`,
      day: "২৮",
      month: "জুলাই",
      title: "নতুন নোটিশের শিরোনাম লিখুন",
      details: "নোটিশের বিস্তারিত বিবরণ এখানে লিখুন...",
    };
    setConfig((prev) => ({ ...prev, notices: [newNotice, ...prev.notices] }));
  }

  function updateNotice(idx: number, patch: Partial<LandingNotice>) {
    setConfig((prev) => {
      const next = [...prev.notices];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, notices: next };
    });
  }

  function removeNotice(idx: number) {
    setConfig((prev) => ({
      ...prev,
      notices: prev.notices.filter((_, i) => i !== idx),
    }));
  }

  // ---- Testimonial helpers ----
  function addTestimonial() {
    const newTm: LandingTestimonial = {
      id: `tm-${Date.now()}`,
      studentName: "শিক্ষার্থীর নাম",
      studentBatch: "HSC 2025, বিজ্ঞান বিভাগ",
      comment: "একাডেমি সম্পর্কে শিক্ষার্থীর মতামত এখানে লিখুন...",
      rating: 5,
      avatarUrl: "",
    };
    setConfig((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, newTm],
    }));
  }

  function updateTestimonial(idx: number, patch: Partial<LandingTestimonial>) {
    setConfig((prev) => {
      const next = [...prev.testimonials];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, testimonials: next };
    });
  }

  function removeTestimonial(idx: number) {
    setConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== idx),
    }));
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "courses"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>কোর্সসমূহ ({config.courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hero")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "hero"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>হিরো ব্যানার ও হেডার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "features"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>৬টি মূল বৈশিষ্ট্য ({config.features.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "about"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span>আমাদের সম্পর্কে ও পরিসংখ্যান</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "notices"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>নোটিশ ও মতামত</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("footer")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "footer"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>ফুটার ও যোগাযোগ</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>লাইভ ওয়েবসাইট দেখুন</span>
          </Link>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{resetting ? "রিসেট হচ্ছে..." : "ডিফল্ট রিসেট"}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ==================== TAB: SUBJECT COURSES ==================== */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">কোর্স সেকশনের শিরোনাম</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  উপরের ছোট ট্যাগ
                </label>
                <input
                  type="text"
                  value={config.coursesSectionTag}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, coursesSectionTag: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  মূল শিরোনাম
                </label>
                <input
                  type="text"
                  value={config.coursesSectionTitle}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, coursesSectionTitle: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ডানপাশের বাটন টেক্সট
                </label>
                <input
                  type="text"
                  value={config.coursesViewAllText}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, coursesViewAllText: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              বিষয়ভিত্তিক কোর্স কার্ডসমূহ ({config.courses.length}টি)
            </h2>
            <button
              type="button"
              onClick={addCourse}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>নতুন কোর্স যুক্ত করুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {config.courses.map((course, idx) => (
              <div
                key={course.id}
                className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold">{course.title}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveCourse(idx, -1)}
                      disabled={idx === 0}
                      className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="উপরে নিন"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCourse(idx, 1)}
                      disabled={idx === config.courses.length - 1}
                      className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="নিচে নিন"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCourse(idx)}
                      className="rounded border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বিষয়ের নাম / শিরোনাম
                    </label>
                    <input
                      type="text"
                      value={course.title}
                      onChange={(e) => updateCourse(idx, { title: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      সংক্ষিপ্ত স্লোগান (Subtitle)
                    </label>
                    <input
                      type="text"
                      value={course.subtitle}
                      onChange={(e) => updateCourse(idx, { subtitle: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      কার্ডের রঙের থিম
                    </label>
                    <select
                      value={course.colorTheme}
                      onChange={(e) =>
                        updateCourse(idx, {
                          colorTheme: e.target.value as CourseColorTheme,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    >
                      {COURSE_THEME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বিষয়ের আইকন প্রতীক
                    </label>
                    <select
                      value={course.symbol}
                      onChange={(e) =>
                        updateCourse(idx, {
                          symbol: e.target.value as CourseSymbolType,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    >
                      {COURSE_SYMBOL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3 Bullet Points & Button Text */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বুলেট পয়েন্ট ১ (যেমন: ক্লাস সংখ্যা)
                    </label>
                    <input
                      type="text"
                      value={course.bullet1}
                      onChange={(e) => updateCourse(idx, { bullet1: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বুলেট পয়েন্ট ২ (যেমন: মডেল টেস্ট)
                    </label>
                    <input
                      type="text"
                      value={course.bullet2}
                      onChange={(e) => updateCourse(idx, { bullet2: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বুলেট পয়েন্ট ৩ (যেমন: প্রস্তুতির ধরন)
                    </label>
                    <input
                      type="text"
                      value={course.bullet3}
                      onChange={(e) => updateCourse(idx, { bullet3: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      বাটনের লেখা
                    </label>
                    <input
                      type="text"
                      value={course.buttonText}
                      onChange={(e) =>
                        updateCourse(idx, { buttonText: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Custom Image + Modal Info */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      কাস্টম ব্যানার ছবি URL (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={course.imageUrl || ""}
                      onChange={(e) => updateCourse(idx, { imageUrl: e.target.value })}
                      placeholder="খালি রাখলে ডিফল্ট গ্রাফিক্স দেখাবে"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      শ্রেণি / টার্গেট ব্যাচ (পপ-আপে দেখাবে)
                    </label>
                    <input
                      type="text"
                      value={course.targetClass}
                      onChange={(e) =>
                        updateCourse(idx, { targetClass: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      ক্লাস শিডিউল (পপ-আপে দেখাবে)
                    </label>
                    <input
                      type="text"
                      value={course.schedule}
                      onChange={(e) => updateCourse(idx, { schedule: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      কোর্স ফি তথ্য (পপ-আপে দেখাবে)
                    </label>
                    <input
                      type="text"
                      value={course.feeLabel}
                      onChange={(e) => updateCourse(idx, { feeLabel: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    বিস্তারিত বিবরণ ("বিস্তারিত দেখুন" বাটনে ক্লিক করলে দেখাবে)
                  </label>
                  <textarea
                    rows={2}
                    value={course.description}
                    onChange={(e) =>
                      updateCourse(idx, { description: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: HERO & HEADER ==================== */}
      {activeTab === "hero" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold">হিরো ব্যানার ও উপরের নেভিগেশন বার</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">
                উপরের ট্যাগলাইন (যেমন: স্বপ্ন দেখো • প্রস্তুতি নাও • সফল হও)
              </label>
              <input
                type="text"
                value={config.heroTagline}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroTagline: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                উপরের ডানপাশের লগইন বাটন টেক্সট
              </label>
              <input
                type="text"
                value={config.loginBtnText}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, loginBtnText: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                প্রধান শিরোনাম ১ম অংশ (সাদা রঙের লেখা)
              </label>
              <input
                type="text"
                value={config.heroTitleLine1}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroTitleLine1: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                প্রধান শিরোনাম ২য় অংশ (সবুজ রঙের লেখা)
              </label>
              <input
                type="text"
                value={config.heroTitleLine2}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroTitleLine2: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                সাব-হেডিং (যেমন: বিজ্ঞানভিত্তিক শিক্ষা, উজ্জ্বল ভবিষ্যৎ)
              </label>
              <input
                type="text"
                value={config.heroSubtitleHeading}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroSubtitleHeading: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ডানপাশের অনুপ্রেরণামূলক উক্তি (যেমন: “জ্ঞানই সফলতার চাবিকাঠি”)
              </label>
              <input
                type="text"
                value={config.heroQuote}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroQuote: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              হিরো ব্যানারের মূল বিবরণ
            </label>
            <textarea
              rows={3}
              value={config.heroDescription}
              onChange={(e) =>
                setConfig((p) => ({ ...p, heroDescription: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                প্রথম বাটন টেক্সট (সবুজ বাটন)
              </label>
              <input
                type="text"
                value={config.heroPrimaryBtnText}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroPrimaryBtnText: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                দ্বিতীয় বাটন টেক্সট (প্লে বাটন)
              </label>
              <input
                type="text"
                value={config.heroSecondaryBtnText}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    heroSecondaryBtnText: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                হিরো ব্যানারের কাস্টম ছবি URL (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={config.heroImageUrl}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, heroImageUrl: e.target.value }))
                }
                placeholder="খালি রাখলে ডিফল্ট বই ও গ্রাফিক্স দেখাবে"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: 6 FEATURES STRIP ==================== */}
      {activeTab === "features" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">
                হিরো ব্যানারের নিচের ৬টি মূল বৈশিষ্ট্য ({config.features.length}টি)
              </h2>
              <p className="text-xs text-muted-foreground">
                হিরো ব্যানারের ঠিক নিচে সাদা স্ট্রিপে যে ৬টি বিশেষ বৈশিষ্ট্য দেখানো হয়
              </p>
            </div>
            <button
              type="button"
              onClick={addFeature}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>নতুন বৈশিষ্ট্য</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.features.map((feat, idx) => (
              <div
                key={feat.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    বৈশিষ্ট্য #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    শিরোনাম
                  </label>
                  <input
                    type="text"
                    value={feat.title}
                    onChange={(e) => updateFeature(idx, { title: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    সংক্ষিপ্ত বিবরণ
                  </label>
                  <input
                    type="text"
                    value={feat.description}
                    onChange={(e) =>
                      updateFeature(idx, { description: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">আইকন</label>
                  <select
                    value={feat.iconName}
                    onChange={(e) =>
                      updateFeature(idx, { iconName: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    {FEATURE_ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: ABOUT US & 2x2 STATS ==================== */}
      {activeTab === "about" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-bold">আমাদের সম্পর্কে (About Us) সেকশন</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  উপরের ছোট ট্যাগ
                </label>
                <input
                  type="text"
                  value={config.aboutTag}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, aboutTag: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  শিরোনাম
                </label>
                <input
                  type="text"
                  value={config.aboutTitle}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, aboutTitle: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  বাটনের লেখা
                </label>
                <input
                  type="text"
                  value={config.aboutBtnText}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, aboutBtnText: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  বামপাশের কাস্টম ছবি URL (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={config.aboutImageUrl}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, aboutImageUrl: e.target.value }))
                  }
                  placeholder="খালি রাখলে Dream Learn Achieve গ্রাফিক্স দেখাবে"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                সংক্ষিপ্ত বিবরণ (হোমপেজে দেখাবে)
              </label>
              <textarea
                rows={3}
                value={config.aboutDescription}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, aboutDescription: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                অতিরিক্ত বিস্তারিত বিবরণ ("আরও জানুন" বাটনে ক্লিক করলে দেখাবে)
              </label>
              <textarea
                rows={3}
                value={config.aboutDetails}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, aboutDetails: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* 2x2 Stats Grid Editor */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">
                ডানপাশের পরিসংখ্যান বক্স ({config.stats.length}টি)
              </h2>
              <button
                type="button"
                onClick={addStat}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>নতুন কার্ড</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {config.stats.map((st, idx) => (
                <div
                  key={st.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      পরিসংখ্যান #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStat(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      সংখ্যা (যেমন: ৫,০০০+)
                    </label>
                    <input
                      type="text"
                      value={st.value}
                      onChange={(e) => updateStat(idx, { value: e.target.value })}
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      লেবেল (যেমন: সন্তুষ্ট শিক্ষার্থী)
                    </label>
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => updateStat(idx, { label: e.target.value })}
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: NOTICES & TESTIMONIALS ==================== */}
      {activeTab === "notices" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Recent Notices */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold">
                  সাম্প্রতিক নোটিশ ({config.notices.length}টি)
                </h2>
              </div>
              <button
                type="button"
                onClick={addNotice}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>নতুন নোটিশ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={config.noticesSectionTitle}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      noticesSectionTitle: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ডানপাশের বাটন টেক্সট
                </label>
                <input
                  type="text"
                  value={config.noticesViewAllText}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      noticesViewAllText: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              {config.notices.map((nt, idx) => (
                <div
                  key={nt.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">
                      নোটিশ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNotice(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold mb-0.5">
                        তারিখ (দিন)
                      </label>
                      <input
                        type="text"
                        value={nt.day}
                        onChange={(e) => updateNotice(idx, { day: e.target.value })}
                        placeholder="২৫"
                        className="w-full rounded border border-border px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold mb-0.5">
                        মাস
                      </label>
                      <input
                        type="text"
                        value={nt.month}
                        onChange={(e) =>
                          updateNotice(idx, { month: e.target.value })
                        }
                        placeholder="জুলাই"
                        className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      নোটিশের শিরোনাম
                    </label>
                    <input
                      type="text"
                      value={nt.title}
                      onChange={(e) => updateNotice(idx, { title: e.target.value })}
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      বিস্তারিত বিবরণ (ক্লিক করলে পপ-আপে দেখাবে)
                    </label>
                    <textarea
                      rows={2}
                      value={nt.details}
                      onChange={(e) =>
                        updateNotice(idx, { details: e.target.value })
                      }
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Student Testimonials */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold">
                  শিক্ষার্থীদের মতামত ({config.testimonials.length}টি)
                </h2>
              </div>
              <button
                type="button"
                onClick={addTestimonial}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>নতুন মতামত</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={config.testimonialsSectionTitle}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      testimonialsSectionTitle: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ডানপাশের বাটন টেক্সট
                </label>
                <input
                  type="text"
                  value={config.testimonialsViewAllText}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      testimonialsViewAllText: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              {config.testimonials.map((tm, idx) => (
                <div
                  key={tm.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">
                      মতামত #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTestimonial(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold mb-0.5">
                        শিক্ষার্থীর নাম
                      </label>
                      <input
                        type="text"
                        value={tm.studentName}
                        onChange={(e) =>
                          updateTestimonial(idx, { studentName: e.target.value })
                        }
                        className="w-full rounded border border-border px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-0.5">
                        ব্যাচ ও বিভাগ
                      </label>
                      <input
                        type="text"
                        value={tm.studentBatch}
                        onChange={(e) =>
                          updateTestimonial(idx, { studentBatch: e.target.value })
                        }
                        className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      শিক্ষার্থীর মন্তব্য / রিভিউ
                    </label>
                    <textarea
                      rows={2}
                      value={tm.comment}
                      onChange={(e) =>
                        updateTestimonial(idx, { comment: e.target.value })
                      }
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-0.5">
                      শিক্ষার্থীর ছবি URL (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={tm.avatarUrl || ""}
                      onChange={(e) =>
                        updateTestimonial(idx, { avatarUrl: e.target.value })
                      }
                      placeholder="খালি রাখলে নামের আদ্যক্ষর অ্যাভাটার দেখাবে"
                      className="w-full rounded border border-border px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: FOOTER & CONTACT ==================== */}
      {activeTab === "footer" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold">ফুটার, ঠিকানা ও যোগাযোগের তথ্য</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                ঠিকানা
              </label>
              <input
                type="text"
                value={config.contactAddress}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, contactAddress: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ফোন নম্বর
              </label>
              <input
                type="text"
                value={config.contactPhone}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, contactPhone: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ইমেইল ঠিকানা
              </label>
              <input
                type="text"
                value={config.contactEmail}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, contactEmail: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ফুটার ট্যাগলাইন (যেমন: জ্ঞান | চর্চা | সাফল্য)
              </label>
              <input
                type="text"
                value={config.footerTagline}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, footerTagline: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ডানপাশের স্লোগান (যেমন: শিক্ষায় জয়ে, জীবনে জয়ে)
              </label>
              <input
                type="text"
                value={config.footerMotto}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, footerMotto: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                কপিরাইট টেক্সট
              </label>
              <input
                type="text"
                value={config.copyrightText}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, copyrightText: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
