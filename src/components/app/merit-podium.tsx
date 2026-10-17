// Merit podium — 1st/2nd/3rd with photo, name, roll, percentage (spec 9 & 37).

import { Trophy } from "lucide-react";
import { StudentAvatar } from "./student-avatar";
import { bn, fmtPct } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PodiumEntry {
  studentId: number;
  name: string;
  roll: number;
  photoKey: string | null;
  percentage: number;
  position: number;
}

const STYLES = [
  {
    card: "border-amber-300 bg-gradient-to-b from-amber-50 to-white",
    badge: "bg-amber-400 text-white",
    ring: "ring-amber-300",
    icon: "text-amber-400",
  },
  {
    card: "border-slate-300 bg-gradient-to-b from-slate-50 to-white",
    badge: "bg-slate-400 text-white",
    ring: "ring-slate-300",
    icon: "text-slate-400",
  },
  {
    card: "border-orange-300 bg-gradient-to-b from-orange-50 to-white",
    badge: "bg-orange-400 text-white",
    ring: "ring-orange-300",
    icon: "text-orange-400",
  },
];

export function MeritPodium({ top3 }: { top3: PodiumEntry[] }) {
  if (!top3.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/50 p-8 text-center text-[14px] text-muted-foreground">
        এই মাসে কোনো ফলাফল পাওয়া যায়নি।
      </div>
    );
  }
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean) as PodiumEntry[];
  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
      {ordered.map((e) => {
        const style = STYLES[e.position - 1] ?? STYLES[2];
        const is1st = e.position === 1;
        return (
          <div
            key={e.studentId}
            className={cn(
              "print-avoid-break relative rounded-xl border-2 p-3 text-center shadow-sm sm:p-4",
              style.card,
              is1st ? "sm:pb-6" : "pb-3 sm:pb-4"
            )}
          >
            <span
              className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow",
                style.badge
              )}
            >
              {e.position === 1 ? "১ম" : e.position === 2 ? "২য়" : "৩য়"}
            </span>
            <div className={cn("mx-auto mt-2 rounded-full ring-4", style.ring, is1st ? "w-16 sm:w-20" : "w-12 sm:w-16")}>
              <StudentAvatar photoKey={e.photoKey} name={e.name} size={is1st ? "lg" : "md"} className={cn("mx-auto", is1st ? "h-20 w-20 sm:h-24 sm:w-24 text-2xl" : "h-14 w-14 sm:h-16 sm:w-16 text-lg")} />
            </div>
            <Trophy className={cn("mx-auto mt-1 h-4 w-4", style.icon)} />
            <p className="mt-1 truncate text-[13px] font-semibold text-foreground sm:text-[15px]">{e.name}</p>
            <p className="text-[12px] text-muted-foreground">রোল: {bn(e.roll)}</p>
            <p className={cn("mt-1 font-bold", is1st ? "text-xl sm:text-2xl" : "text-lg")}>{fmtPct(e.percentage)}</p>
          </div>
        );
      })}
    </div>
  );
}
