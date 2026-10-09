"use client";

import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
  Palette,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Gorgeous high-DPI inline vector templates
export const BG_PRESETS: { id: string; name: string; desc: string; url: string; previewColor: string }[] = [
  {
    id: "DEFAULT",
    name: "১. বিজ্ঞান পণ্ডিত (ডিফল্ট আর্ট)",
    desc: "অফিশিয়াল নরম প্যাস্টেল ও ফ্লোরাল ওয়াটারমার্ক",
    url: "",
    previewColor: "linear-gradient(135deg, #f4f7fb 0%, #eaf2dd 100%)",
  },
  {
    id: "ROYAL_BLUE",
    name: "২. রয়্যাল ব্লু একাডেমি বর্ডার",
    desc: "গাঢ় নেভি ব্লু ফ্রেম, গোল্ডেন কোনা ও ক্লাসিক সার্টিফিকেট লুক",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="50%" stop-color="#f1f5f9"/>
            <stop offset="100%" stop-color="#e2e8f0"/>
          </linearGradient>
          <pattern id="pat" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.2" fill="#1e3a8a" opacity="0.08"/>
            <path d="M0 20 L40 20 M20 0 L20 40" stroke="#1e3a8a" stroke-width="0.3" opacity="0.04"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <rect width="100%" height="100%" fill="url(#pat)"/>
        <rect x="18" y="18" width="1164" height="814" fill="none" stroke="#1e3a8a" stroke-width="6" rx="8"/>
        <rect x="28" y="28" width="1144" height="794" fill="none" stroke="#d97706" stroke-width="1.8" rx="6"/>
        <rect x="36" y="36" width="1128" height="778" fill="none" stroke="#1e3a8a" stroke-width="1" stroke-dasharray="4,4"/>
        <g fill="#1e3a8a" opacity="0.35">
          <circle cx="50" cy="50" r="12"/>
          <circle cx="1150" cy="50" r="12"/>
          <circle cx="50" cy="800" r="12"/>
          <circle cx="1150" cy="800" r="12"/>
        </g>
      </svg>
    `),
    previewColor: "linear-gradient(135deg, #1e3a8a 0%, #d97706 50%, #f8fafc 100%)",
  },
  {
    id: "GOLD_LUXURY",
    name: "৩. স্বর্ণালী ভিন্টেজ সার্টিফিকেট",
    desc: "অভিজাত গোল্ডেন ডাবল ফ্রেম ও প্রাচীন পার্চমেন্ট টেক্সচার",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
        <defs>
          <linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fffdfa"/>
            <stop offset="50%" stop-color="#fefcf6"/>
            <stop offset="100%" stop-color="#faf5ea"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgG)"/>
        <rect x="16" y="16" width="1168" height="818" fill="none" stroke="#b45309" stroke-width="5" rx="6"/>
        <rect x="24" y="24" width="1152" height="802" fill="none" stroke="#f59e0b" stroke-width="2.5" rx="4"/>
        <rect x="34" y="34" width="1132" height="782" fill="none" stroke="#b45309" stroke-width="0.8"/>
        <path d="M 16,60 L 60,16 M 16,80 L 80,16 M 1184,60 L 1140,16 M 16,790 L 80,834 M 1184,790 L 1120,834" stroke="#d97706" stroke-width="1.5" opacity="0.4"/>
      </svg>
    `),
    previewColor: "linear-gradient(135deg, #b45309 0%, #fef3c7 60%, #faf5ea 100%)",
  },
  {
    id: "EMERALD_ACADEMY",
    name: "৪. মরোক্কান এমারেল্ড প্যাটার্ন",
    desc: "সবুজ এমারেল্ড ফ্রেম ও আধুনিক জ্যামিতিক আর্ট",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
        <defs>
          <linearGradient id="bgE" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f0fdf4"/>
            <stop offset="50%" stop-color="#ecfdf5"/>
            <stop offset="100%" stop-color="#e6f7ec"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgE)"/>
        <rect x="16" y="16" width="1168" height="818" fill="none" stroke="#047857" stroke-width="5" rx="6"/>
        <rect x="25" y="25" width="1150" height="800" fill="none" stroke="#10b981" stroke-width="1.8" rx="4"/>
        <rect x="33" y="33" width="1134" height="784" fill="none" stroke="#047857" stroke-width="1" stroke-dasharray="6,3"/>
      </svg>
    `),
    previewColor: "linear-gradient(135deg, #047857 0%, #10b981 50%, #f0fdf4 100%)",
  },
  {
    id: "MINIMALIST_CLEAN",
    name: "৫. মিনিমালিস্ট স্টুডিও ফ্রেম",
    desc: "একদম পরিচ্ছন্ন আধুনিক গ্রাফিক্যাল বর্ডার",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="15" y="15" width="1170" height="820" fill="none" stroke="#334155" stroke-width="3.5"/>
        <rect x="22" y="22" width="1156" height="806" fill="none" stroke="#94a3b8" stroke-width="1"/>
      </svg>
    `),
    previewColor: "linear-gradient(135deg, #334155 0%, #cbd5e1 50%, #ffffff 100%)",
  },
];

interface CardBgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBgUrl?: string | null;
  onBgChange: (newUrl: string | null) => void;
}

export function CardBgModal({
  open,
  onOpenChange,
  currentBgUrl,
  onBgChange,
}: CardBgModalProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFileUpload(file: File) {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "ছবিটি অনেক বড় (সর্বোচ্চ ১৫ MB)।", variant: "destructive" });
      return;
    }

    setUploading(true);
    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    onBgChange(previewUrl);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "card-bg");

      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();

      if (res.ok && json.ok && json.url) {
        onBgChange(json.url);
        // Persist to settings
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardBgUrl: json.url, cardCoverBgUrl: json.url }),
        });
        toast({ title: "✅ কভার পেজের ব্যাকগ্রাউন্ড ছবি স্থায়ীভাবে সংরক্ষণ করা হয়েছে!" });
      } else {
        // Still keep local preview URL
        toast({ title: "কভার ব্যাকগ্রাউন্ড ছবি প্রয়োগ করা হয়েছে।" });
      }
    } catch (e) {
      toast({ title: "কভার ব্যাকগ্রাউন্ড ছবি প্রিভিউতে যুক্ত হয়েছে।" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSelectPreset(url: string) {
    onBgChange(url || null);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardBgUrl: url || "", cardCoverBgUrl: url || "" }),
      });
      toast({ title: url ? "✅ নতুন কভার ডিজাইন স্থায়ীভাবে সংরক্ষণ করা হয়েছে!" : "ডিফল্ট ব্যাকগ্রাউন্ডে ফিরে আসা হয়েছে।" });
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
            <Palette className="h-5 w-5 text-emerald-600" />
            কভার পেজের ব্যাকগ্রাউন্ড ছবি ও ডিজাইন পরিবর্তন
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-600">
            আপনার পছন্দের যেকোনো ফটো/সার্টিফিকেট বর্ডার আপলোড করুন। এটি শুধুমাত্র কভার পেজের ব্যাকগ্রাউন্ডে স্থায়ীভাবে প্রয়োগ হবে, রেজাল্ট শিট অফিশিয়াল স্ট্যান্ডার্ড থাকবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ১. কাস্টম ছবি আপলোড সেকশন */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-4 sm:p-5 text-center transition hover:border-emerald-500">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs text-emerald-700 mb-3">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Upload className="h-7 w-7" />
              )}
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              আপনার নিজস্ব ছবি / ফটো আপলোড করুন
            </h4>
            <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
              সার্টিফিকেট আর্টওয়ার্ক, সুন্দর বর্ডার ডিজাইন বা প্রতিষ্ঠানের নিজস্ব ছবি আপলোড করুন (JPG, PNG, WebP — সর্বোচ্চ ১৫ MB)
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm h-9 sm:h-10 px-5 shadow-xs"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                ডিভাইস থেকে ছবি বেছে নিন
              </Button>

              {currentBgUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSelectPreset("")}
                  className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm h-9 sm:h-10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  ডিফল্ট আর্টে ফিরুন
                </Button>
              )}
            </div>
          </div>

          {/* ২. রেডিমেড প্রিমিয়াম ডিজাইন টেমপ্লেট সেকশন */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-800">
                অথবা রেডিমেড প্রিমিয়াম ডিজাইন টেমপ্লেট বেছে নিন:
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BG_PRESETS.map((preset) => {
                const isSelected = (!currentBgUrl && !preset.url) || currentBgUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/30"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div
                      className="h-14 w-20 shrink-0 rounded-lg border border-black/10 shadow-2xs overflow-hidden flex items-center justify-center relative"
                      style={{ background: preset.previewColor }}
                    >
                      <div className="absolute inset-1 border border-black/15 rounded-md" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {preset.name}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <Button
            type="button"
            variant="default"
            onClick={() => onOpenChange(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5"
          >
            সম্পন্ন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
