"use client";

// Image upload widget: picks a file, previews it, uploads to /api/uploads (R2).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

async function makeSignatureTransparent(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a === 0) continue;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness >= 230) {
              data[i + 3] = 0;
            } else if (brightness > 185) {
              const factor = (230 - brightness) / 45;
              data[i + 3] = Math.round(a * Math.pow(factor, 1.25));
            }
          }
          ctx.putImageData(imgData, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".png"), { type: "image/png" }));
            } else {
              resolve(file);
            }
          }, "image/png");
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  type,
  studentId,
  teacherId,
  currentUrl,
  label,
  className,
  onUploaded,
  onRemove,
  compact = false,
  disabled = false,
}: {
  type: "logo" | "signature" | "student-photo" | "teacher-photo" | "banner" | "director-photo" | "director-signature" | "card-bg" | "publication-logo";
  studentId?: number;
  teacherId?: number;
  currentUrl?: string | null;
  label: string;
  className?: string;
  onUploaded?: (key: string, url: string) => void;
  onRemove?: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  async function pick(file: File) {
    if (disabled) return;
    const maxBytes =
      type === "banner"
        ? 15 * 1024 * 1024
        : type === "publication-logo" || type === "logo"
        ? 10 * 1024 * 1024
        : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title:
          type === "banner"
            ? "ব্যানার ফাইলটি অনেক বড় (সর্বোচ্চ ১৫ MB)।"
            : type === "publication-logo" || type === "logo"
            ? "লোগো ফাইলটি অনেক বড় (সর্বোচ্চ ১০ MB)।"
            : "ফাইলটি অনেক বড় (সর্বোচ্চ ৫ MB)।",
        variant: "destructive",
      });
      return;
    }
    let fileToUpload = file;
    if (type === "signature" || type === "director-signature") {
      fileToUpload = await makeSignatureTransparent(file);
    }
    const localUrl = URL.createObjectURL(fileToUpload);
    setPreview(localUrl);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("type", type);
      if (studentId) fd.append("studentId", String(studentId));
      if (teacherId) fd.append("teacherId", String(teacherId));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "আপলোড ব্যর্থ হয়েছে।");
      setPreview(json.url);
      onUploaded?.(json.key, json.url);
      toast({ title: json.message || "সফলভাবে সংরক্ষণ করা হয়েছে।" });
      router.refresh();
    } catch (e) {
      setPreview(currentUrl ?? null);
      toast({ title: e instanceof Error ? e.message : "আপলোড ব্যর্থ হয়েছে।", variant: "destructive" });
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(false);
    }
  }

  const maxSizeText =
    type === "banner"
      ? "সর্বোচ্চ ১৫ MB"
      : type === "publication-logo" || type === "logo"
      ? "সর্বোচ্চ ১০ MB"
      : "সর্বোচ্চ ৫ MB";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted">
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-contain"
            onError={() => {
              // Ignore image render error
            }}
          />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">JPG / PNG / WebP — {maxSizeText}</p>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={compact ? "outline" : "default"} disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            {preview ? "প্রতিস্থাপন করুন" : "আপলোড করুন"}
          </Button>
          {preview && onRemove && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || disabled}
              onClick={() => {
                setPreview(null);
                onRemove();
              }}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              মুছুন
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
