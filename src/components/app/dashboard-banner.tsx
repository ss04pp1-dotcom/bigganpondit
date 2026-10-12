"use client";

import { useEffect, useState } from "react";
import { ImageUpload } from "@/components/app/image-upload";
import { Image as ImageIcon, Sparkles, ExternalLink, Settings2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@/lib/constants";

interface BannerData {
  active: boolean;
  imageKey: string | null;
  title: string | null;
  subtitle: string | null;
  link: string | null;
}

export function DashboardBanner({
  user,
  panelTitle = "ড্যাশবোর্ড",
  panelDesc = "সিস্টেমের সব তথ্য ও নিয়ন্ত্রণ এক জায়গায়।",
}: {
  user: { name: string; role: Role };
  panelTitle?: string;
  panelDesc?: string;
}) {
  const [banner, setBanner] = useState<BannerData>({
    active: true,
    imageKey: null,
    title: null,
    subtitle: null,
    link: null,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editImageKey, setEditImageKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/banner")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setBanner(json);
          setEditTitle(json.title || "");
          setEditSubtitle(json.subtitle || "");
          setEditLink(json.link || "");
          setEditActive(json.active !== false);
          setEditImageKey(json.imageKey);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: editActive,
          imageKey: editImageKey || undefined,
          title: editTitle,
          subtitle: editSubtitle,
          link: editLink,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast({ title: json.error ?? "সংরক্ষণ করা যায়নি।", variant: "destructive" });
        return;
      }
      toast({ title: json.message });
      setBanner({
        active: editActive,
        imageKey: editImageKey,
        title: editTitle,
        subtitle: editSubtitle,
        link: editLink,
      });
      setEditOpen(false);
    } catch {
      toast({ title: "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const bgUrl = banner.active && banner.imageKey ? `/api/files/${banner.imageKey}` : null;
  const hasCustomAd = banner.active && (banner.title || banner.subtitle);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-xl px-5 py-5 text-white shadow-md transition-all border border-slate-800"
        style={{
          backgroundColor: "#0f172a",
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Crystal-Clear Banner: Only soft left text-scrim; banner artwork is 100% sharp and unblurred */}
        {bgUrl ? (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/80 via-black/35 to-transparent sm:max-w-2xl transition-opacity" />
        ) : (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
                {panelTitle}
              </span>
              {hasCustomAd && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                  <Sparkles className="h-3 w-3" /> বিশেষ ব্যানার
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              {hasCustomAd && banner.title ? banner.title : user.name}
            </h1>

            <p className="text-[13px] text-slate-300 max-w-xl leading-relaxed drop-shadow-xs">
              {hasCustomAd && banner.subtitle ? banner.subtitle : panelDesc}
            </p>

            {hasCustomAd && banner.link && (
              <div className="pt-1.5">
                <a
                  href={banner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white underline underline-offset-4"
                >
                  <span>বিস্তারিত দেখুন</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Admin Banner Configuration Quick Action */}
          {user.role === "ADMIN" && (
            <div className="shrink-0 self-start md:self-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="h-8 gap-1.5 bg-black/30 border-white/20 text-white hover:bg-white/20 hover:text-white text-xs backdrop-blur-xs font-medium cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>ব্যানার ছবি ও বিজ্ঞাপন</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Banner Settings Dialog */}
      {user.role === "ADMIN" && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                ড্যাশবোর্ড ব্যানার ছবি ও বিজ্ঞাপন পরিচালনা
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                ড্যাশবোর্ডের শীর্ষ অংশে ব্যাকগ্রাউন্ড ছবি যুক্ত করুন অথবা বিজ্ঞাপনের ব্যানার চালু করুন। এটি এডমিন, ডিরেক্টর, শিক্ষক ও স্টুডেন্ট সকলেই দেখতে পারবে।
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveBanner} className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-800">ব্যানার প্রদর্শন সক্রিয়</Label>
                  <p className="text-[11px] text-slate-500">ব্যানার চালু বা বন্ধ রাখার সুইচ</p>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">ব্যানার ব্যাকগ্রাউন্ড ছবি</Label>
                <ImageUpload
                  type="banner"
                  label="ব্যানার ছবি (JPG, PNG, WebP — হাই রেজোলিউশন / ক্রিস্টাল ক্লিয়ার)"
                  currentUrl={editImageKey ? `/api/files/${editImageKey}` : null}
                  onUploaded={(key) => setEditImageKey(key)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">ব্যানার অ্যাড শিরোনাম (ঐচ্ছিক)</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="যেমন: নতুন শিক্ষাবর্ষে ভর্তি চলছে! / বার্ষিক বিজ্ঞান মেলা"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">ব্যানার বিস্তারিত বিবরণ (ঐচ্ছিক)</Label>
                <Input
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="যেমন: ষষ্ঠ থেকে দশম শ্রেণিতে আসন সীমিত, দ্রুত যোগাযোগ করুন।"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">লিংক URL (ঐচ্ছিক)</Label>
                <Input
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  ব্যানার সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
