// Student avatar — authenticated photo via /api/files with initials fallback.
// Server-component safe (no client JS).

import { cn } from "@/lib/utils";

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
  size = "md",
  className,
}: {
  photoKey: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-[13px]",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  }[size];

  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length;

  if (photoKey) {
    return (
      <img
        src={`/api/files/${photoKey}`}
        alt={name}
        className={cn("shrink-0 rounded-full border border-border object-cover", dims, className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", dims, PALETTE[idx], className)}
    >
      {name.trim().slice(0, 2)}
    </div>
  );
}
