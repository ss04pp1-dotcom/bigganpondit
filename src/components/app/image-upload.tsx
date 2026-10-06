"use client";

// Image upload widget: picks a file, previews it, uploads to /api/uploads (R2).

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function ImageUpload({
  type,
  studentId,
  teacherId,
  currentUrl,
  label,
  className,
  onUploaded,
  compact = false,
  disabled = false,
}: {
  type: "logo" | "signature" | "student-photo" | "teacher-photo" | "banner" | "director-photo" | "director-signature";
  studentId?: number;
  teacherId?: number;
  currentUrl?: string | null;
  label: string;
  className?: string;
  onUploaded?: (key: string, url: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const { toast } = useToast();

  async function pick(file: File) {
    if (disabled) return;
    const maxBytes = type === "banner" ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: type === "banner" ? "ব্যানার ফাইলটি অনেক বড় (সর্বোচ্চ ১৫ MB)।" : "ফাইলটি অনেক বড় (সর্বোচ্চ ৫ MB)।", variant: "destructive" });
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      if (studentId) fd.append("studentId", String(studentId));
      if (teacherId) fd.append("teacherId", String(teacherId));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "আপলোড ব্যর্থ হয়েছে।");
      setPreview(json.url);
      onUploaded?.(json.key, json.url);
      toast({ title: "সফলভাবে সংরক্ষণ করা হয়েছে।" });
      router.refresh();
    } catch (e) {
      setPreview(currentUrl ?? null);
      toast({ title: e instanceof Error ? e.message : "আপলোড ব্যর্থ হয়েছে।", variant: "destructive" });
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted">
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">JPG / PNG / WebP — সর্বোচ্চ ৫ MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={compact ? "outline" : "default"} disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            {preview ? "প্রতিস্থাপন করুন" : "আপলোড করুন"}
          </Button>
        </div>
      </div>
    </div>
  );
}
