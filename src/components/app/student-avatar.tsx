"use client";

// Student avatar — authenticated photo via /api/files with initials fallback.
import { useState } from "react";
import { cn } from "@/lib/utils";
import { bn } from "@/lib/constants";

const PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];

export function StudentAvatar({
  photoKey,
  name,
  roll,
  fallbackText,
  size = "md",
  className,
}: {
  photoKey: string | null | undefined;
  name: string;
  roll?: number | string | null;
  fallbackText?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [lastPhotoKey, setLastPhotoKey] = useState(photoKey);
  const [imgFailed, setImgFailed] = useState(false);

  if (photoKey !== lastPhotoKey) {
    setLastPhotoKey(photoKey);
    setImgFailed(false);
  }

  const dims = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-[13px]",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  }[size];

  const idx = [...(name || "S")].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length;

  const resolvedSrc = photoKey
    ? photoKey.startsWith("/") || photoKey.startsWith("http")
      ? photoKey
      : `/api/files/${photoKey}`
    : null;

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt={name || "শিক্ষার্থী"}
        onError={() => setImgFailed(true)}
        className={cn("shrink-0 rounded-full border border-border object-cover", dims, className)}
      />
    );
  }

  const displayText =
    fallbackText ||
    (roll !== undefined && roll !== null ? bn(roll) : name?.trim()?.slice(0, 2) || "শিক্ষার্থী");

  return (
    <div
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        dims,
        PALETTE[idx],
        className
      )}
    >
      {displayText}
    </div>
  );
}
