"use client";

// Annual performance graph — multicolor line + dot (spec 36).
// Zones: 0–32% red, 33–79% blue, 80–100% green. A4-print friendly.

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Scatter,
} from "recharts";
import { MONTHS_BN, fmtPct } from "@/lib/constants";

export interface AnnualPoint {
  month: number;
  percentage: number | null;
}

function zoneColor(pct: number | null): string | undefined {
  if (pct === null || pct === undefined) return undefined;
  if (pct < 33) return "#ef4444";
  if (pct < 80) return "#0d6efd";
  return "#10b981";
}

export function AnnualChart({ points }: { points: AnnualPoint[] }) {
  // one unified dataset: pct drives the line; dotY renders zone-colored
  // dots only for months that have a result (undefined elsewhere).
  const data = points.map((p) => ({
    name: MONTHS_BN[p.month - 1],
    pct: p.percentage,
    dotY: p.percentage === null ? undefined : p.percentage,
    color: zoneColor(p.percentage) ?? "#0d6efd",
  }));

  return (
    <div className="w-full" style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
          <XAxis dataKey="name" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 20, 32, 33, 79, 80, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#6b7280" }} width={44} />
          <Tooltip
            formatter={(value) => [value === null || value === undefined ? "N/A" : fmtPct(Number(value)), "মাসিক শতকরা"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          {/* color zones */}
          <ReferenceArea y1={80} y2={100} fill="#10b981" fillOpacity={0.08} strokeOpacity={0} />
          <ReferenceArea y1={33} y2={79} fill="#0d6efd" fillOpacity={0.06} strokeOpacity={0} />
          <ReferenceArea y1={0} y2={32} fill="#ef4444" fillOpacity={0.08} strokeOpacity={0} />
          {/* main line */}
          <Line type="monotone" dataKey="pct" stroke="#0d6efd" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
          {/* zone-colored dots — only months that have a result */}
          <Scatter
            data={data.filter((d) => d.dotY !== undefined)}
            dataKey="dotY"
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number; payload?: { color?: string } }) => (
              <circle
                cx={props.cx ?? 0}
                cy={props.cy ?? 0}
                r={5}
                fill={props.payload?.color ?? "#0d6efd"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" /> ৮০–১০০%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0d6efd]" /> ৩৩–৭৯%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> ০–৩২%
        </span>
      </div>
    </div>
  );
}
