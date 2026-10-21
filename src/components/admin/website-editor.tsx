"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  BookOpen,
  Sparkles,
  Phone,
  RotateCcw,
  ExternalLink,
  Layers,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type {
  LandingPageConfig,
  LandingCourse,
  LandingFeature,
  LandingStat,
} from "@/lib/landing-config";

const ICON_OPTIONS = [
  { value: "bell", label: "🔔 নোটিফিকেশন / SMS" },
  { value: "award", label: "🏆 ফলাফল / মেধা তালিকা" },
  { value: "users", label: "👨‍🏫 শিক্ষক / শিক্ষার্থী" },
  { value: "book", label: "📚 বই / লেকচার শিট" },
  { value: "clock", label: "⏰ রুটিন / সময়সূচি" },
  { value: "shield", label: "🛡️ নিরাপত্তা / পেমেন্ট" },
  { value: "laptop", label: "💻 ডিজিটাল পোর্টাল" },
  { value: "check", label: "✅ বিশেষ সুবিধা" },
];

export function WebsiteEditor({ initialConfig }: { initialConfig: LandingPageConfig }) {
  const [config, setConfig] = useState<LandingPageConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "features" | "hero" | "contact">("courses");
  const router = useRouter();
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message ?? "ওয়েবসাইটের তথ্য সফলভাবে সংরক্ষিত হয়েছে!" });
      router.refresh();
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    if (!window.confirm("আপনি কি নিশ্চিত যে হোমপেজের সকল কোর্স ও ফিচার ডিফল্ট অবস্থায় ফিরিয়ে আনতে চান?")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.config) {
        setConfig(json.config);
        toast({ title: json.message ?? "ডিফল্ট তথ্য পুনরুদ্ধার করা হয়েছে।" });
        router.refresh();
      } else {
        toast({ title: json.error ?? "রিসেট করা যায়নি।", variant: "destructive" });
      }
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  }

  // Course helpers
  function addCourse() {
    const newCourse: LandingCourse = {
      id: `crs-${Date.now()}`,
      title: "নতুন কোর্সের নাম লিখুন",
      badge: "নতুন ব্যাচ",
      targetClass: "৬ষ্ঠ - ১০ম শ্রেণি",
      subjects: "পদার্থ, রসায়ন, গণিত ও জীববিজ্ঞান",
      schedule: "সপ্তাহে ৬ দিন ক্লাস • সাপ্তাহিক পরীক্ষা",
      feeLabel: "ভর্তি চলছে",
      description: "এই কোর্সের সংক্ষিপ্ত বিবরণ ও সুবিধাসমূহ এখানে লিখুন।",
      highlight: false,
    };
    setConfig((prev) => ({
      ...prev,
      courses: [newCourse, ...prev.courses],
    }));
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

  // Feature helpers
  function addFeature() {
    const newFeat: LandingFeature = {
      id: `feat-${Date.now()}`,
      title: "নতুন বৈশিষ্ট্যের শিরোনাম",
      badge: "বিশেষ সুবিধা",
      description: "এই বৈশিষ্ট্যের বিস্তারিত বিবরণ এখানে লিখুন।",
      iconName: "check",
    };
    setConfig((prev) => ({
      ...prev,
      features: [newFeat, ...prev.features],
    }));
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

  function moveFeature(idx: number, dir: -1 | 1) {
    setConfig((prev) => {
      const next = [...prev.features];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return { ...prev, features: next };
    });
  }

  // Stat helpers
  function addStat() {
    const newStat: LandingStat = {
      id: `st-${Date.now()}`,
      value: "১০০%",
      label: "নতুন পরিসংখ্যান",
    };
    setConfig((prev) => ({
      ...prev,
      stats: [...prev.stats, newStat],
    }));
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

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-base sm:text-lg">
              <Globe className="h-5 w-5 text-blue-600" />
              <span>পাবলিক ওয়েবসাইট, কোর্স ও ফিচার কাস্টমাইজেশন</span>
            </div>
            <p className="text-xs text-slate-600">
              ওয়েবসাইটের মূল পাতায় প্রদর্শিত সকল কোর্স, বৈশিষ্ট্য, ব্যানার ও যোগাযোগের তথ্য এখান থেকে পরিবর্তন, সংযোজন বা মুছে ফেলতে পারবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
              <span>ওয়েবসাইট দেখুন</span>
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleResetDefault}
              disabled={resetting || saving}
              className="h-10 gap-1.5 text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              ডিফল্ট রিসেট
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm px-5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সব পরিবর্তন সংরক্ষণ করুন
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "courses"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>কোর্সসমূহ ({config.courses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("features")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "features"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>বৈশিষ্ট্যসমূহ ({config.features.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hero")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "hero"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>হিরো ব্যানার ও পরিসংখ্যান</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contact")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "contact"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Phone className="h-4 w-4" />
          <span>যোগাযোগ ও ঠিকানা</span>
        </button>
      </div>

      {/* TAB 1: COURSES MANAGER */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-[16px] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  কোর্স সেকশন শিরোনাম ও তালিকা
                </CardTitle>
                <CardDescription className="text-xs">
                  যেকোনো কোর্স এডিট করুন, নতুন কোর্স যোগ করুন অথবা অপ্রয়োজনীয় কোর্স মুছে ফেলুন।
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addCourse}
                className="h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
              >
                <Plus className="h-4 w-4" />
                নতুন কোর্স যুক্ত করুন
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">কোর্স সেকশনের প্রধান শিরোনাম</Label>
                  <Input
                    value={config.coursesSectionTitle}
                    onChange={(e) =>
                      setConfig({ ...config, coursesSectionTitle: e.target.value })
                    }
                    placeholder="আমাদের চলমান কোর্স ও ব্যাচসমূহ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">কোর্স সেকশনের সাবটাইটেল</Label>
                  <Input
                    value={config.coursesSectionSubtitle}
                    onChange={(e) =>
                      setConfig({ ...config, coursesSectionSubtitle: e.target.value })
                    }
                    placeholder="শিক্ষার্থীদের মেধা ও শ্রেণি অনুযায়ী বিশেষভাবে সাজানো..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {config.courses.map((course, idx) => (
              <Card
                key={course.id}
                className={`border ${
                  course.highlight ? "border-blue-400 bg-blue-50/15" : "border-slate-200"
                }`}
              >
                <CardHeader className="border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between gap-2 bg-slate-50/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-800 truncate">
                      {course.title || "কোর্স"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md cursor-pointer mr-1">
                      <input
                        type="checkbox"
                        checked={!!course.highlight}
                        onChange={(e) =>
                          updateCourse(idx, { highlight: e.target.checked })
                        }
                        className="rounded border-blue-300"
                      />
                      <Star className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
                      <span>হাইলাইট</span>
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => moveCourse(idx, -1)}
                      title="উপরে তুলুন"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={idx === config.courses.length - 1}
                      onClick={() => moveCourse(idx, 1)}
                      title="নিচে নামান"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeCourse(idx)}
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="grid gap-3.5 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">কোর্সের নাম / শিরোনাম</Label>
                      <Input
                        value={course.title}
                        onChange={(e) => updateCourse(idx, { title: e.target.value })}
                        placeholder="যেমন: নবম ও দশম শ্রেণি — বিজ্ঞান বিভাগ"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">ব্যাজ / ট্যাগ</Label>
                      <Input
                        value={course.badge}
                        onChange={(e) => updateCourse(idx, { badge: e.target.value })}
                        placeholder="যেমন: সবচেয়ে জনপ্রিয় / এসএসসি স্পেশাল"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">শ্রেণি / টার্গেট ব্যাচ</Label>
                      <Input
                        value={course.targetClass}
                        onChange={(e) => updateCourse(idx, { targetClass: e.target.value })}
                        placeholder="যেমন: ৯ম ও ১০ম শ্রেণি (বিজ্ঞান)"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">সময়সূচি / পরীক্ষার তথ্য</Label>
                      <Input
                        value={course.schedule}
                        onChange={(e) => updateCourse(idx, { schedule: e.target.value })}
                        placeholder="যেমন: সপ্তাহে ৬ দিন ক্লাস • সাপ্তাহিক পরীক্ষা"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">ফি / ভর্তি স্ট্যাটাস</Label>
                      <Input
                        value={course.feeLabel}
                        onChange={(e) => updateCourse(idx, { feeLabel: e.target.value })}
                        placeholder="যেমন: মাসিক বেতন ১৫০০ টাকা / ভর্তি চলছে"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">পড়ানো বিষয়সমূহ (Subjects)</Label>
                    <Input
                      value={course.subjects}
                      onChange={(e) => updateCourse(idx, { subjects: e.target.value })}
                      placeholder="যেমন: পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, উচ্চতর গণিত ও সাধারণ গণিত"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">কোর্সের বিস্তারিত বিবরণ</Label>
                    <textarea
                      value={course.description}
                      onChange={(e) => updateCourse(idx, { description: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="কোর্স সম্পর্কে বিস্তারিত লিখুন..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: FEATURES MANAGER */}
      {activeTab === "features" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-[16px] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  বৈশিষ্ট্য সেকশন ও তালিকা
                </CardTitle>
                <CardDescription className="text-xs">
                  একাডেমির বিশেষ সুবিধা ও ডিজিটাল ফিচারগুলো এখান থেকে কাস্টমাইজ করুন।
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={addFeature}
                className="h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
              >
                <Plus className="h-4 w-4" />
                নতুন বৈশিষ্ট্য যুক্ত করুন
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">বৈশিষ্ট্য সেকশনের শিরোনাম</Label>
                  <Input
                    value={config.featuresSectionTitle}
                    onChange={(e) =>
                      setConfig({ ...config, featuresSectionTitle: e.target.value })
                    }
                    placeholder="আমাদের বিশেষ বৈশিষ্ট্য ও ডিজিটাল সুবিধাসমূহ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">বৈশিষ্ট্য সেকশনের সাবটাইটেল</Label>
                  <Input
                    value={config.featuresSectionSubtitle}
                    onChange={(e) =>
                      setConfig({ ...config, featuresSectionSubtitle: e.target.value })
                    }
                    placeholder="পড়াশোনার পাশাপাশি আধুনিক প্রযুক্তির সাহায্যে..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {config.features.map((feat, idx) => (
              <Card key={feat.id} className="border-slate-200">
                <CardHeader className="border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between gap-2 bg-slate-50/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-800 truncate">
                      {feat.title || "বৈশিষ্ট্য"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={() => moveFeature(idx, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={idx === config.features.length - 1}
                      onClick={() => moveFeature(idx, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeFeature(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">বৈশিষ্ট্যের শিরোনাম</Label>
                    <Input
                      value={feat.title}
                      onChange={(e) => updateFeature(idx, { title: e.target.value })}
                      placeholder="যেমন: ডিজিটাল হাজিরা ও SMS অ্যালার্ট"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">ছোট ব্যাজ / ট্যাগ</Label>
                      <Input
                        value={feat.badge}
                        onChange={(e) => updateFeature(idx, { badge: e.target.value })}
                        placeholder="যেমন: স্মার্ট ট্র্যাকিং"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">আইকন স্টাইল</Label>
                      <select
                        value={feat.iconName}
                        onChange={(e) => updateFeature(idx, { iconName: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">বিস্তারিত বিবরণ</Label>
                    <textarea
                      value={feat.description}
                      onChange={(e) => updateFeature(idx, { description: e.target.value })}
                      rows={3}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HERO BANNER & STATS */}
      {activeTab === "hero" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-[16px]">হিরো সেকশন ও ভর্তি বিজ্ঞপ্তি ব্যানার</CardTitle>
              <CardDescription className="text-xs">
                ওয়েবসাইটে ঢুকলেই সবার উপরে যে প্রধান শিরোনাম ও ভর্তি বিজ্ঞপ্তি দেখা যায় তা এখান থেকে পরিবর্তন করুন।
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ভর্তি বিজ্ঞপ্তি টপ বার (খালি রাখলে দেখাবে না)</Label>
                <Input
                  value={config.admissionBanner}
                  onChange={(e) => setConfig({ ...config, admissionBanner: e.target.value })}
                  placeholder="নতুন শিক্ষাবর্ষে ৬ষ্ঠ থেকে ১০ম শ্রেণি এবং এসএসসি স্পেশাল ব্যাচে ভর্তি চলছে!"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">হিরো ব্যাজ (উপরের ছোট ট্যাগ)</Label>
                <Input
                  value={config.heroBadge}
                  onChange={(e) => setConfig({ ...config, heroBadge: e.target.value })}
                  placeholder="ভর্তি চলছে • একাডেমিক ও স্পেশাল ব্যাচ"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">হিরো মূল শিরোনাম (Main Heading)</Label>
                <Input
                  value={config.heroTitle}
                  onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                  placeholder="বিজ্ঞান ও গণিতের ভীতি দূর করে কাঙ্ক্ষিত সাফল্যের বিশ্বস্ত ঠিকানা"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">হিরো সাবটাইটেল / সংক্ষিপ্ত পরিচিতি</Label>
                <textarea
                  value={config.heroSubtitle}
                  onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[16px]">পরিসংখ্যান / হাইলাইটস কাউন্টার</CardTitle>
                <CardDescription className="text-xs">
                  হিরো ব্যানারের নিচে প্রদর্শিত ৪টি সংক্ষিপ্ত তথ্য কার্ড।
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addStat}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                যোগ করুন
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {config.stats.map((st, idx) => (
                  <div
                    key={st.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">কার্ড #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeStat(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="মুছুন"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">সংখ্যা / হাইলাইট</Label>
                      <Input
                        value={st.value}
                        onChange={(e) => updateStat(idx, { value: e.target.value })}
                        placeholder="যেমন: ১০০%"
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">বিবরণ লেবেল</Label>
                      <Input
                        value={st.label}
                        onChange={(e) => updateStat(idx, { label: e.target.value })}
                        placeholder="যেমন: ডিজিটাল হাজিরা"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: CONTACT & FOOTER INFO */}
      {activeTab === "contact" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-[16px]">যোগাযোগ ও ভর্তি অফিসের তথ্য</CardTitle>
            <CardDescription className="text-xs">
              ওয়েবসাইটের নিচের অংশে প্রদর্শিত ফোন নম্বর, ঠিকানা ও অফিসের সময়সূচি পরিবর্তন করুন।
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">প্রধান মোবাইল / হেল্পলাইন নম্বর</Label>
                <Input
                  value={config.contactPhone}
                  onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                  placeholder="01700-000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">বিকল্প মোবাইল নম্বর (ঐচ্ছিক)</Label>
                <Input
                  value={config.contactPhoneAlt}
                  onChange={(e) => setConfig({ ...config, contactPhoneAlt: e.target.value })}
                  placeholder="01800-000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ইমেইল ঠিকানা</Label>
                <Input
                  value={config.contactEmail}
                  onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                  placeholder="info@bigganpondit.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">অফিস ও ক্লাসের সময়সূচি</Label>
                <Input
                  value={config.officeHours}
                  onChange={(e) => setConfig({ ...config, officeHours: e.target.value })}
                  placeholder="শনিবার – বৃহস্পতিবার (সকাল ৮:০০টা – রাত ৮:০০টা)"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">একাডেমি ক্যাম্পাসের ঠিকানা</Label>
                <Input
                  value={config.contactAddress}
                  onChange={(e) => setConfig({ ...config, contactAddress: e.target.value })}
                  placeholder="বিজ্ঞান পণ্ডিত একাডেমি ক্যাম্পাস, মেইন রোড..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Sticky / Floating Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          সব পরিবর্তন সংরক্ষণ করুন
        </Button>
      </div>
    </div>
  );
}
