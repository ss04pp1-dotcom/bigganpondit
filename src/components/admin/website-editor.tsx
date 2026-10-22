"use client";

import React, { useRef, useState } from "react";
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
  Info,
  ImageIcon,
  Upload,
} from "lucide-react";
import type {
  LandingPageConfig,
  LandingCourse,
  LandingFeature,
  LandingAboutFeature,
  LandingStat,
  LandingNotice,
  LandingTestimonial,
  LandingNavItem,
  LandingHeroChip,
  LandingHeroWidgetItem,
  CourseHeaderColor,
  CourseSymbolType,
  WidgetAccentColor,
} from "@/lib/landing-config";

interface WebsiteEditorProps {
  initialConfig: LandingPageConfig;
}

const FEATURE_ICON_OPTIONS = [
  { value: "graduation", label: "🎓 শিক্ষক / একাডেমিক" },
  { value: "monitor", label: "🖥️ মনিটর / স্মার্ট ক্লাস" },
  { value: "users", label: "👥 শিক্ষার্থী / গাইডেন্স" },
  { value: "chart", label: "📊 চার্ট / মূল্যায়ন" },
  { value: "book", label: "📘 বই / রিসোর্স" },
  { value: "shield", label: "🛡️ শিল্ড / নির্ভরযোগ্যতা" },
  { value: "award", label: "🏆 পদক / অভিজ্ঞতা" },
  { value: "target", label: "🎯 টার্গেট / সাফল্য" },
  { value: "clipboard", label: "📋 ক্লিপবোর্ড / টেস্ট" },
  { value: "calculator", label: "🧮 ক্যালকুলেটর" },
  { value: "pen", label: "✏️ কলম" },
  { value: "file", label: "📄 ফাইল / নোটিশ" },
  { value: "trend", label: "📈 অগ্রগতি" },
  { value: "play", label: "▶️ প্লে / লাইভ ক্লাস" },
];

const COURSE_HEADER_COLOR_OPTIONS: { value: CourseHeaderColor; label: string }[] = [
  { value: "navy", label: "গাঢ় নীল (HSC বিজ্ঞান)" },
  { value: "teal", label: "টিল (SSC বিজ্ঞান)" },
  { value: "emerald", label: "গাঢ় সবুজ (জীববিজ্ঞান)" },
  { value: "violet", label: "বেগুনি (উচ্চতর গণিত)" },
  { value: "orange", label: "কমলা (ICT)" },
  { value: "slate", label: "প্রায়-কালো (মডেল টেস্ট)" },
];

const COURSE_SYMBOL_OPTIONS: { value: CourseSymbolType; label: string }[] = [
  { value: "atom", label: "⚛ পরমাণু (পদার্থবিজ্ঞান)" },
  { value: "flask", label: "🧪 ফ্লাস্ক (রসায়ন)" },
  { value: "pi", label: "π পাই (গণিত)" },
  { value: "dna", label: "🧬 ডিএনএ (জীববিজ্ঞান)" },
  { value: "sigma", label: "∑ সিগমা (উচ্চতর গণিত)" },
  { value: "book", label: "📘 বই (সাধারণ কোর্স)" },
  { value: "monitor", label: "🖥️ মনিটর (ICT)" },
  { value: "calculator", label: "🧮 ক্যালকুলেটর" },
  { value: "clipboard", label: "📋 ক্লিপবোর্ড (টেস্ট)" },
  { value: "target", label: "🎯 টার্গেট" },
];

const WIDGET_COLOR_OPTIONS: { value: WidgetAccentColor; label: string }[] = [
  { value: "blue", label: "নীল" },
  { value: "cyan", label: "সায়ান" },
  { value: "emerald", label: "সবুজ" },
  { value: "rose", label: "গোলাপি" },
  { value: "amber", label: "সোনালি" },
  { value: "violet", label: "বেগুনি" },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </Field>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={inputCls + " resize-y"}
      />
    </Field>
  );
}

/** Image picker that uploads straight to R2 and stores the returned URL. */
function LandingImagePicker({
  label,
  url,
  onChange,
  hint,
  aspect = "square",
}: {
  label: string;
  url: string;
  onChange: (url: string) => void;
  hint?: string;
  aspect?: "square" | "wide";
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "landing");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "আপলোড ব্যর্থ হয়েছে।");
      onChange(json.url as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "আপলোড ব্যর্থ হয়েছে।");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted ${
            aspect === "wide" ? "h-20 w-32" : "h-20 w-20"
          }`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              {uploading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "আপলোড হচ্ছে..." : url ? "ছবি পরিবর্তন করুন" : "ছবি আপলোড করুন"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
              >
                <Trash2 className="h-3 w-3" />
                সরিয়ে ফেলুন
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            JPG / PNG / WebP — সর্বোচ্চ ১৫ MB। {hint}
          </p>
          {err && <p className="text-[11px] font-semibold text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function ListRowActions({
  onMoveUp,
  onMoveDown,
  onRemove,
  upDisabled,
  downDisabled,
  title,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  upDisabled?: boolean;
  downDisabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={upDisabled}
        className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
        title="উপরে নিন"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={downDisabled}
        className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
        title="নিচে নিন"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100"
        title={title ?? "মুছে ফেলুন"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main editor                                                         */
/* ------------------------------------------------------------------ */

export function WebsiteEditor({ initialConfig }: WebsiteEditorProps) {
  const [config, setConfig] = useState<LandingPageConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<
    "hero" | "courses" | "features" | "about" | "notices" | "footer"
  >("hero");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function patch(p: Partial<LandingPageConfig>) {
    setConfig((prev) => ({ ...prev, ...p }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, schemaVersion: 3 } }),
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
        text: data.message || "ওয়েবসাইটের সকল পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!",
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
        "আপনি কি নিশ্চিত যে হোমপেজের সকল কোর্স, ছবি ও ডিজাইন ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?"
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

  /* ---------------- generic list helpers ---------------- */
  function updateList<K extends "navItems" | "heroChips" | "heroWidget" | "features" | "aboutFeatures" | "stats" | "notices" | "testimonials" | "courses" | "supportLinks">(
    key: K,
    idx: number,
    itemUpdates: Partial<LandingPageConfig[K][number]>
  ) {
    setConfig((prev) => {
      const next = [...(prev[key] as unknown[])] as LandingPageConfig[K];
      (next[idx] as unknown as Record<string, unknown>) = {
        ...(next[idx] as unknown as Record<string, unknown>),
        ...itemUpdates,
      };
      return { ...prev, [key]: next };
    });
  }

  function addListItem<K extends "navItems" | "heroChips" | "heroWidget" | "features" | "aboutFeatures" | "stats" | "notices" | "testimonials" | "courses" | "supportLinks">(
    key: K,
    item: LandingPageConfig[K][number]
  ) {
    setConfig((prev) => ({
      ...prev,
      [key]: [...(prev[key] as unknown[]), item] as LandingPageConfig[K],
    }));
  }

  function removeListItem<K extends "navItems" | "heroChips" | "heroWidget" | "features" | "aboutFeatures" | "stats" | "notices" | "testimonials" | "courses" | "supportLinks">(
    key: K,
    idx: number
  ) {
    setConfig((prev) => ({
      ...prev,
      [key]: (prev[key] as unknown[]).filter((_, i) => i !== idx) as LandingPageConfig[K],
    }));
  }

  function moveListItem<K extends "navItems" | "heroChips" | "heroWidget" | "features" | "aboutFeatures" | "stats" | "notices" | "testimonials" | "courses" | "supportLinks">(
    key: K,
    idx: number,
    dir: -1 | 1
  ) {
    setConfig((prev) => {
      const next = [...(prev[key] as unknown[])] as LandingPageConfig[K];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return { ...prev, [key]: next };
    });
  }

  const TABS: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: "hero", label: "হিরো ও নেভিগেশন", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: "courses", label: `কোর্সসমূহ (${config.courses.length})`, icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "features", label: `বৈশিষ্ট্য (${config.features.length})`, icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "about", label: "আমাদের সম্পর্কে ও পরিসংখ্যান", icon: <Info className="h-3.5 w-3.5" /> },
    { id: "notices", label: "নোটিশ ও মতামত", icon: <Bell className="h-3.5 w-3.5" /> },
    { id: "footer", label: "ফুটার ও যোগাযোগ", icon: <Phone className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>লাইভ দেখুন</span>
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
            <span>{saving ? "সংরক্ষণ হচ্ছে..." : "সব পরিবর্তন সংরক্ষণ করুন"}</span>
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

      {/* ==================== TAB: COURSES ==================== */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">কোর্স সেকশনের শিরোনাম</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextField
                label="উপরের ছোট ট্যাগ"
                value={config.coursesSectionTag}
                onChange={(v) => patch({ coursesSectionTag: v })}
              />
              <TextField
                label="মূল শিরোনাম"
                value={config.coursesSectionTitle}
                onChange={(v) => patch({ coursesSectionTitle: v })}
              />
              <TextField
                label="ডানপাশের বাটন টেক্সট"
                value={config.coursesViewAllText}
                onChange={(v) => patch({ coursesViewAllText: v })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">কোর্স কার্ডসমূহ ({config.courses.length}টি)</h2>
            <button
              type="button"
              onClick={() =>
                addListItem("courses", {
                  id: `crs-${Date.now()}`,
                  title: "নতুন কোর্স",
                  subtitle: "কোর্সের সংক্ষিপ্ত বিবরণ",
                  symbol: "book",
                  headerColor: "navy",
                  subjects: "বিষয়ভিত্তিক ট্যাগ লিখুন",
                  bullet1: "ক্লাস: ৪০+",
                  bullet2: "মডেল টেস্ট: ২০+",
                  bullet3: "বোর্ড প্রস্তুতি",
                  buttonText: "বিস্তারিত দেখুন",
                  imageUrl: "",
                  targetClass: "শ্রেণি উল্লেখ করুন",
                  schedule: "সপ্তাহে ৩ দিন ক্লাস",
                  feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
                  description: "কোর্সের বিস্তারিত বিবরণ এখানে লিখুন...",
                } as LandingCourse)
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>নতুন কোর্স যোগ করুন</span>
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
                    <h3 className="text-sm font-bold">{course.title || "কোর্স"}</h3>
                  </div>
                  <ListRowActions
                    onMoveUp={() => moveListItem("courses", idx, -1)}
                    onMoveDown={() => moveListItem("courses", idx, 1)}
                    onRemove={() => removeListItem("courses", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.courses.length - 1}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <TextField
                    label="কোর্সের নাম"
                    value={course.title}
                    onChange={(v) => updateList("courses", idx, { title: v })}
                  />
                  <TextField
                    label="সংক্ষিপ্ত বিবরণ (subtitle)"
                    value={course.subtitle}
                    onChange={(v) => updateList("courses", idx, { subtitle: v })}
                  />
                  <Field label="কার্ড হেডারের রঙ">
                    <select
                      value={course.headerColor}
                      onChange={(e) =>
                        updateList("courses", idx, {
                          headerColor: e.target.value as CourseHeaderColor,
                        })
                      }
                      className={inputCls}
                    >
                      {COURSE_HEADER_COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="আইকন প্রতীক">
                    <select
                      value={course.symbol}
                      onChange={(e) =>
                        updateList("courses", idx, {
                          symbol: e.target.value as CourseSymbolType,
                        })
                      }
                      className={inputCls}
                    >
                      {COURSE_SYMBOL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <TextField
                  label="বিষয়সমূহের ট্যাগ (• দিয়ে আলাদা করুন)"
                  value={course.subjects}
                  onChange={(v) => updateList("courses", idx, { subjects: v })}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <TextField
                    label="বুলেট ১"
                    value={course.bullet1}
                    onChange={(v) => updateList("courses", idx, { bullet1: v })}
                  />
                  <TextField
                    label="বুলেট ২"
                    value={course.bullet2}
                    onChange={(v) => updateList("courses", idx, { bullet2: v })}
                  />
                  <TextField
                    label="বুলেট ৩"
                    value={course.bullet3}
                    onChange={(v) => updateList("courses", idx, { bullet3: v })}
                  />
                  <TextField
                    label="বাটন টেক্সট"
                    value={course.buttonText}
                    onChange={(v) => updateList("courses", idx, { buttonText: v })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TextField
                    label="টার্গেট শ্রেণি"
                    value={course.targetClass}
                    onChange={(v) => updateList("courses", idx, { targetClass: v })}
                  />
                  <TextField
                    label="ক্লাসের সময়সূচি"
                    value={course.schedule}
                    onChange={(v) => updateList("courses", idx, { schedule: v })}
                  />
                  <TextField
                    label="ফি সংক্রান্ত লেখা"
                    value={course.feeLabel}
                    onChange={(v) => updateList("courses", idx, { feeLabel: v })}
                  />
                </div>

                <TextArea
                  label="বিস্তারিত বিবরণ (মডালে দেখাবে)"
                  value={course.description}
                  onChange={(v) => updateList("courses", idx, { description: v })}
                  rows={3}
                />

                <LandingImagePicker
                  label="কার্ড হেডারের ছবি (ঐচ্ছিক — না দিলে রঙিন হেডার দেখাবে)"
                  url={course.imageUrl ?? ""}
                  onChange={(url) => updateList("courses", idx, { imageUrl: url })}
                  aspect="wide"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: FEATURES ==================== */}
      {activeTab === "features" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">মূল বৈশিষ্ট্য স্ট্রিপ ({config.features.length}টি)</h2>
            <button
              type="button"
              onClick={() =>
                addListItem("features", {
                  id: `feat-${Date.now()}`,
                  title: "নতুন বৈশিষ্ট্য",
                  description: "সংক্ষিপ্ত বিবরণ লিখুন",
                  iconName: "graduation",
                } as LandingFeature)
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>বৈশিষ্ট্য যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-3">
            {config.features.map((feat, idx) => (
              <div key={feat.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground">বৈশিষ্ট্য {idx + 1}</span>
                  <ListRowActions
                    onMoveUp={() => moveListItem("features", idx, -1)}
                    onMoveDown={() => moveListItem("features", idx, 1)}
                    onRemove={() => removeListItem("features", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.features.length - 1}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TextField
                    label="শিরোনাম"
                    value={feat.title}
                    onChange={(v) => updateList("features", idx, { title: v })}
                  />
                  <TextField
                    label="সংক্ষিপ্ত বিবরণ"
                    value={feat.description}
                    onChange={(v) => updateList("features", idx, { description: v })}
                  />
                  <Field label="আইকন">
                    <select
                      value={feat.iconName}
                      onChange={(e) => updateList("features", idx, { iconName: e.target.value })}
                      className={inputCls}
                    >
                      {FEATURE_ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: ABOUT + STATS ==================== */}
      {activeTab === "about" && (
        <div className="space-y-4">
          {/* Dark about section */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">গাঢ় নীল "কেন আমরা" সেকশন</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="সেকশনের শিরোনাম"
                value={config.aboutSectionTitle}
                onChange={(v) => patch({ aboutSectionTitle: v })}
              />
              <TextField
                label="ডেকোরেটিভ ইংরেজি লেখা"
                value={config.aboutDecorText}
                onChange={(v) => patch({ aboutDecorText: v })}
              />
            </div>
            <TextArea
              label="সেকশনের বর্ণনা"
              value={config.aboutSectionDescription}
              onChange={(v) => patch({ aboutSectionDescription: v })}
              rows={3}
            />
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold">আইকন সারি ({config.aboutFeatures.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("aboutFeatures", {
                    id: `af-${Date.now()}`,
                    title: "নতুন আইটেম",
                    iconName: "graduation",
                  } as LandingAboutFeature)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>আইকন যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {config.aboutFeatures.map((af, idx) => (
                <div key={af.id} className="flex items-end gap-2 rounded-lg border border-border p-2.5">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <TextField
                      label="লেবেল"
                      value={af.title}
                      onChange={(v) => updateList("aboutFeatures", idx, { title: v })}
                    />
                    <Field label="আইকন">
                      <select
                        value={af.iconName}
                        onChange={(e) => updateList("aboutFeatures", idx, { iconName: e.target.value })}
                        className={inputCls}
                      >
                        {FEATURE_ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <ListRowActions
                    onMoveUp={() => moveListItem("aboutFeatures", idx, -1)}
                    onMoveDown={() => moveListItem("aboutFeatures", idx, 1)}
                    onRemove={() => removeListItem("aboutFeatures", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.aboutFeatures.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Light about + stats */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">আমাদের সম্পর্কে + পরিসংখ্যান সেকশন</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="ছোট ট্যাগ"
                value={config.aboutTag}
                onChange={(v) => patch({ aboutTag: v })}
              />
              <TextField
                label="শিরোনাম"
                value={config.aboutTitle}
                onChange={(v) => patch({ aboutTitle: v })}
              />
              <TextField
                label="বাটন টেক্সট"
                value={config.aboutBtnText}
                onChange={(v) => patch({ aboutBtnText: v })}
              />
            </div>
            <TextArea
              label="মূল বর্ণনা"
              value={config.aboutDescription}
              onChange={(v) => patch({ aboutDescription: v })}
              rows={3}
            />
            <TextArea
              label="বিস্তারিত বর্ণনা (মডালে দেখাবে)"
              value={config.aboutDetails}
              onChange={(v) => patch({ aboutDetails: v })}
              rows={3}
            />
            <LandingImagePicker
              label="ক্যাম্পাস / প্রতিষ্ঠানের ছবি"
              url={config.aboutImageUrl}
              onChange={(url) => patch({ aboutImageUrl: url })}
              aspect="wide"
              hint="গোলাকার (blob) আকৃতিতে দেখানো হবে।"
            />
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">পরিসংখ্যান বক্স ({config.stats.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("stats", {
                    id: `st-${Date.now()}`,
                    value: "১০০+",
                    label: "নতুন পরিসংখ্যান",
                    iconName: "award",
                    iconColor: "blue",
                  } as LandingStat)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>পরিসংখ্যান যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {config.stats.map((st, idx) => (
                <div key={st.id} className="rounded-lg border border-border p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">পরিসংখ্যান {idx + 1}</span>
                    <ListRowActions
                      onMoveUp={() => moveListItem("stats", idx, -1)}
                      onMoveDown={() => moveListItem("stats", idx, 1)}
                      onRemove={() => removeListItem("stats", idx)}
                      upDisabled={idx === 0}
                      downDisabled={idx === config.stats.length - 1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <TextField
                      label="মান (যেমন ৩০+)"
                      value={st.value}
                      onChange={(v) => updateList("stats", idx, { value: v })}
                    />
                    <TextField
                      label="লেবেল"
                      value={st.label}
                      onChange={(v) => updateList("stats", idx, { label: v })}
                    />
                    <Field label="আইকন">
                      <select
                        value={st.iconName}
                        onChange={(e) => updateList("stats", idx, { iconName: e.target.value })}
                        className={inputCls}
                      >
                        {FEATURE_ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="আইকনের রঙ">
                      <select
                        value={st.iconColor}
                        onChange={(e) =>
                          updateList("stats", idx, {
                            iconColor: e.target.value as WidgetAccentColor,
                          })
                        }
                        className={inputCls}
                      >
                        {WIDGET_COLOR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: NOTICES + TESTIMONIALS ==================== */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {/* Notices */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="নোটিশ সেকশনের শিরোনাম"
                value={config.noticesSectionTitle}
                onChange={(v) => patch({ noticesSectionTitle: v })}
              />
              <TextField
                label="ডানপাশের বাটন টেক্সট"
                value={config.noticesViewAllText}
                onChange={(v) => patch({ noticesViewAllText: v })}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold">নোটিশসমূহ ({config.notices.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("notices", {
                    id: `nt-${Date.now()}`,
                    day: "০১",
                    month: "জানুয়ারি",
                    title: "নতুন নোটিশের শিরোনাম",
                    details: "নোটিশের বিস্তারিত বিবরণ এখানে লিখুন...",
                  } as LandingNotice)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>নোটিশ যোগ করুন</span>
              </button>
            </div>
            <div className="space-y-3">
              {config.notices.map((notice, idx) => (
                <div key={notice.id} className="rounded-lg border border-border p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">নোটিশ {idx + 1}</span>
                    <ListRowActions
                      onMoveUp={() => moveListItem("notices", idx, -1)}
                      onMoveDown={() => moveListItem("notices", idx, 1)}
                      onRemove={() => removeListItem("notices", idx)}
                      upDisabled={idx === 0}
                      downDisabled={idx === config.notices.length - 1}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    <TextField
                      label="দিন (বাংলা)"
                      value={notice.day}
                      onChange={(v) => updateList("notices", idx, { day: v })}
                    />
                    <TextField
                      label="মাস (বাংলা)"
                      value={notice.month}
                      onChange={(v) => updateList("notices", idx, { month: v })}
                    />
                    <div className="sm:col-span-2">
                      <TextField
                        label="শিরোনাম"
                        value={notice.title}
                        onChange={(v) => updateList("notices", idx, { title: v })}
                      />
                    </div>
                  </div>
                  <TextArea
                    label="বিস্তারিত বিবরণ (ক্লিক করলে দেখাবে)"
                    value={notice.details}
                    onChange={(v) => updateList("notices", idx, { details: v })}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="মতামত সেকশনের শিরোনাম"
                value={config.testimonialsSectionTitle}
                onChange={(v) => patch({ testimonialsSectionTitle: v })}
              />
              <TextField
                label="ডানপাশের বাটন টেক্সট"
                value={config.testimonialsViewAllText}
                onChange={(v) => patch({ testimonialsViewAllText: v })}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold">শিক্ষার্থীদের মতামত ({config.testimonials.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("testimonials", {
                    id: `tm-${Date.now()}`,
                    studentName: "শিক্ষার্থীর নাম",
                    studentBatch: "HSC 2025, বিজ্ঞান বিভাগ",
                    comment: "একাডেমি সম্পর্কে মতামত এখানে লিখুন...",
                    rating: 5,
                    avatarUrl: "",
                  } as LandingTestimonial)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>মতামত যোগ করুন</span>
              </button>
            </div>
            <div className="space-y-3">
              {config.testimonials.map((tm, idx) => (
                <div key={tm.id} className="rounded-lg border border-border p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">মতামত {idx + 1}</span>
                    <ListRowActions
                      onMoveUp={() => moveListItem("testimonials", idx, -1)}
                      onMoveDown={() => moveListItem("testimonials", idx, 1)}
                      onRemove={() => removeListItem("testimonials", idx)}
                      upDisabled={idx === 0}
                      downDisabled={idx === config.testimonials.length - 1}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <TextField
                      label="শিক্ষার্থীর নাম"
                      value={tm.studentName}
                      onChange={(v) => updateList("testimonials", idx, { studentName: v })}
                    />
                    <TextField
                      label="ব্যাচ / পরিচয়"
                      value={tm.studentBatch}
                      onChange={(v) => updateList("testimonials", idx, { studentBatch: v })}
                    />
                    <Field label="রেটিং (১-৫)">
                      <select
                        value={String(tm.rating)}
                        onChange={(e) =>
                          updateList("testimonials", idx, { rating: Number(e.target.value) })
                        }
                        className={inputCls}
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>{"⭐".repeat(r)}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <TextArea
                    label="মতামত"
                    value={tm.comment}
                    onChange={(v) => updateList("testimonials", idx, { comment: v })}
                    rows={2}
                  />
                  <LandingImagePicker
                    label="শিক্ষার্থীর ছবি (ঐচ্ছিক)"
                    url={tm.avatarUrl ?? ""}
                    onChange={(url) => updateList("testimonials", idx, { avatarUrl: url })}
                    hint="না দিলে নামের প্রথম অক্ষর দিয়ে বৃত্তাকার অবতার দেখাবে।"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB: FOOTER ==================== */}
      {activeTab === "footer" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">ফুটার (নিচের অংশ)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="ট্যাগলাইন"
                value={config.footerTagline}
                onChange={(v) => patch({ footerTagline: v })}
              />
              <TextField
                label="নিচের মোটো লেখা"
                value={config.footerMotto}
                onChange={(v) => patch({ footerMotto: v })}
              />
              <TextField
                label="কপিরাইট লেখা"
                value={config.copyrightText}
                onChange={(v) => patch({ copyrightText: v })}
              />
              <TextField
                label="ওয়াটারমার্ক (ডানপাশে হালকা লেখা)"
                value={config.footerWatermark}
                onChange={(v) => patch({ footerWatermark: v })}
              />
            </div>
            <TextArea
              label="প্রতিষ্ঠান পরিচিতি (ফুটারে)"
              value={config.footerAboutText}
              onChange={(v) => patch({ footerAboutText: v })}
              rows={2}
            />
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">যোগাযোগের তথ্য</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextField
                label="যোগাযোগ কলামের শিরোনাম"
                value={config.contactTitle}
                onChange={(v) => patch({ contactTitle: v })}
              />
              <TextField
                label="ঠিকানা"
                value={config.contactAddress}
                onChange={(v) => patch({ contactAddress: v })}
              />
              <TextField
                label="ফোন নম্বর"
                value={config.contactPhone}
                onChange={(v) => patch({ contactPhone: v })}
              />
              <TextField
                label="ইমেইল"
                value={config.contactEmail}
                onChange={(v) => patch({ contactEmail: v })}
              />
            </div>
            <h3 className="text-xs font-bold pt-1">সোশ্যাল মিডিয়া লিংক</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Facebook লিংক"
                value={config.facebookUrl}
                onChange={(v) => patch({ facebookUrl: v })}
                placeholder="https://facebook.com/..."
              />
              <TextField
                label="YouTube লিংক"
                value={config.youtubeUrl}
                onChange={(v) => patch({ youtubeUrl: v })}
                placeholder="https://youtube.com/..."
              />
              <TextField
                label="Instagram লিংক"
                value={config.instagramUrl}
                onChange={(v) => patch({ instagramUrl: v })}
                placeholder="https://instagram.com/..."
              />
              <TextField
                label="Telegram লিংক"
                value={config.telegramUrl}
                onChange={(v) => patch({ telegramUrl: v })}
                placeholder="https://t.me/..."
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              খালি রাখলে ওই সোশ্যাল আইকনটি ফুটারে দেখানো হবে না।
            </p>
          </div>

          {/* Newsletter */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">নিউজলেটার</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextField
                label="শিরোনাম"
                value={config.newsletterTitle}
                onChange={(v) => patch({ newsletterTitle: v })}
              />
              <TextField
                label="সাব-টাইটেল"
                value={config.newsletterSubtitle}
                onChange={(v) => patch({ newsletterSubtitle: v })}
              />
              <TextField
                label="ইনপুট প্লেসহোল্ডার"
                value={config.newsletterPlaceholder}
                onChange={(v) => patch({ newsletterPlaceholder: v })}
              />
            </div>
          </div>

          {/* Quick + support links */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="দ্রুত লিংক কলামের শিরোনাম"
                value={config.quickLinksTitle}
                onChange={(v) => patch({ quickLinksTitle: v })}
              />
              <TextField
                label="সহায়তা কলামের শিরোনাম"
                value={config.supportLinksTitle}
                onChange={(v) => patch({ supportLinksTitle: v })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              দ্রুত লিংক কলামে উপরের মেনু আইটেমগুলোই দেখানো হয়। নিচে সহায়তা কলামের লিংকগুলো সম্পাদনা করুন:
            </p>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">সহায়তা লিংক ({config.supportLinks.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("supportLinks", {
                    id: `sl-${Date.now()}`,
                    label: "নতুন লিংক",
                    href: "#home",
                  } as LandingNavItem)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>লিংক যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {config.supportLinks.map((item, idx) => (
                <div key={item.id} className="flex items-end gap-2 rounded-lg border border-border p-2.5">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <TextField
                      label="নাম"
                      value={item.label}
                      onChange={(v) => updateList("supportLinks", idx, { label: v })}
                    />
                    <TextField
                      label="লিংক"
                      value={item.href}
                      onChange={(v) => updateList("supportLinks", idx, { href: v })}
                    />
                  </div>
                  <ListRowActions
                    onMoveUp={() => moveListItem("supportLinks", idx, -1)}
                    onMoveDown={() => moveListItem("supportLinks", idx, 1)}
                    onRemove={() => removeListItem("supportLinks", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.supportLinks.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ==================== TAB: HERO + NAV ==================== */}
      {activeTab === "hero" && (
        <div className="space-y-4">
          {/* Hero texts */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">হিরো ব্যানার (উপরের বড় অংশ)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="অবস্থান ব্যাজ (উপরে ছোট চিপ)"
                value={config.heroBadgeText}
                onChange={(v) => patch({ heroBadgeText: v })}
              />
              <TextField
                label="ট্যাগলাইন (ডট দিয়ে আলাদা)"
                value={config.heroTagline}
                onChange={(v) => patch({ heroTagline: v })}
              />
              <TextField
                label="বড় শিরোনাম — ১ম অংশ (সাদা)"
                value={config.heroTitleLine1}
                onChange={(v) => patch({ heroTitleLine1: v })}
              />
              <TextField
                label="বড় শিরোনাম — ২য় অংশ (গ্রেডিয়েন্ট রঙ)"
                value={config.heroTitleLine2}
                onChange={(v) => patch({ heroTitleLine2: v })}
              />
              <TextField
                label="প্রাইমারি বাটন টেক্সট"
                value={config.heroPrimaryBtnText}
                onChange={(v) => patch({ heroPrimaryBtnText: v })}
              />
              <TextField
                label="সেকেন্ডারি বাটন টেক্সট"
                value={config.heroSecondaryBtnText}
                onChange={(v) => patch({ heroSecondaryBtnText: v })}
              />
              <TextField
                label="ডেকোরেটিভ ইংরেজি লেখা (italic)"
                value={config.heroDecorText}
                onChange={(v) => patch({ heroDecorText: v })}
              />
            </div>
            <TextArea
              label="হিরোর বর্ণনা"
              value={config.heroDescription}
              onChange={(v) => patch({ heroDescription: v })}
              rows={3}
            />
            <LandingImagePicker
              label="হিরো ব্যাকগ্রাউন্ড ছবি"
              url={config.heroImageUrl}
              onChange={(url) => patch({ heroImageUrl: url })}
              aspect="wide"
              hint="সুপারিত: 1344x768 বা তার চেয়ে বড় ল্যান্ডস্কেপ ছবি।"
            />
          </div>

          {/* Quick chips */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">দ্রুত প্রবেশ চিপ ({config.heroChips.length}টি)</h2>
              <button
                type="button"
                onClick={() =>
                  addListItem("heroChips", {
                    id: `chip-${Date.now()}`,
                    label: "নতুন চিপ",
                  } as LandingHeroChip)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>চিপ যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {config.heroChips.map((chip, idx) => (
                <div key={chip.id} className="flex items-end gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex-1">
                    <TextField
                      label={`চিপ ${idx + 1}`}
                      value={chip.label}
                      onChange={(v) => updateList("heroChips", idx, { label: v })}
                    />
                  </div>
                  <ListRowActions
                    onMoveUp={() => moveListItem("heroChips", idx, -1)}
                    onMoveDown={() => moveListItem("heroChips", idx, 1)}
                    onRemove={() => removeListItem("heroChips", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.heroChips.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hero widget items */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">হিরোর ভাসমান কার্ড ({config.heroWidget.length}টি ঘর)</h2>
              <button
                type="button"
                onClick={() =>
                  addListItem("heroWidget", {
                    id: `hw-${Date.now()}`,
                    title: "১০০+",
                    subtitle: "নতুন পরিসংখ্যান",
                    iconName: "award",
                    color: "blue",
                  } as LandingHeroWidgetItem)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>ঘর যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {config.heroWidget.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-border p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">ঘর {idx + 1}</span>
                    <ListRowActions
                      onMoveUp={() => moveListItem("heroWidget", idx, -1)}
                      onMoveDown={() => moveListItem("heroWidget", idx, 1)}
                      onRemove={() => removeListItem("heroWidget", idx)}
                      upDisabled={idx === 0}
                      downDisabled={idx === config.heroWidget.length - 1}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <TextField
                      label="বড় সংখ্যা"
                      value={item.title}
                      onChange={(v) => updateList("heroWidget", idx, { title: v })}
                    />
                    <TextField
                      label="নিচের লেখা"
                      value={item.subtitle}
                      onChange={(v) => updateList("heroWidget", idx, { subtitle: v })}
                    />
                    <Field label="আইকন">
                      <select
                        value={item.iconName}
                        onChange={(e) => updateList("heroWidget", idx, { iconName: e.target.value })}
                        className={inputCls}
                      >
                        {FEATURE_ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="রঙ">
                      <select
                        value={item.color}
                        onChange={(e) =>
                          updateList("heroWidget", idx, {
                            color: e.target.value as WidgetAccentColor,
                          })
                        }
                        className={inputCls}
                      >
                        {WIDGET_COLOR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navbar */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold">উপরের মেনু (নেভিগেশন)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="লগইন বাটন টেক্সট"
                value={config.loginBtnText}
                onChange={(v) => patch({ loginBtnText: v })}
              />
              <TextField
                label="রেজিস্ট্রেশন বাটন টেক্সট"
                value={config.registerBtnText}
                onChange={(v) => patch({ registerBtnText: v })}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold">মেনু আইটেম ({config.navItems.length}টি)</h3>
              <button
                type="button"
                onClick={() =>
                  addListItem("navItems", {
                    id: `nav-${Date.now()}`,
                    label: "নতুন মেনু",
                    href: "#home",
                  } as LandingNavItem)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>মেনু যোগ করুন</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {config.navItems.map((item, idx) => (
                <div key={item.id} className="flex items-end gap-2 rounded-lg border border-border p-2.5">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <TextField
                      label="নাম"
                      value={item.label}
                      onChange={(v) => updateList("navItems", idx, { label: v })}
                    />
                    <TextField
                      label="লিংক"
                      value={item.href}
                      onChange={(v) => updateList("navItems", idx, { href: v })}
                    />
                  </div>
                  <ListRowActions
                    onMoveUp={() => moveListItem("navItems", idx, -1)}
                    onMoveDown={() => moveListItem("navItems", idx, 1)}
                    onRemove={() => removeListItem("navItems", idx)}
                    upDisabled={idx === 0}
                    downDisabled={idx === config.navItems.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
