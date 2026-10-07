// Report header for A4 printouts (academy logo + titles + teacher name).

import { APP_TITLE } from "@/lib/constants";

export function ReportHeader({
  academyName,
  logoUrl,
  teacherName,
  subtitle,
}: {
  academyName: string;
  logoUrl: string | null;
  teacherName?: string | null;
  subtitle?: string;
}) {
  return (
    <div className="print-avoid-break border-b-2 border-border pb-3">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
          {logoUrl ? (
            <img src={logoUrl} alt={academyName} className="h-14 w-14 rounded object-contain" />
          ) : (
            <span className="text-2xl font-bold text-primary">{academyName.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-xl font-bold leading-tight">{academyName}</h1>
          <p className="text-[13px] text-muted-foreground">{APP_TITLE}</p>
          {subtitle && <p className="mt-0.5 text-[14px] font-semibold">{subtitle}</p>}
        </div>
        <div className="w-16 shrink-0" />
      </div>
      {teacherName && (
        <p className="mt-1 text-right text-[12px] text-muted-foreground">রিপোর্ট প্রস্তুতকারী: {teacherName}</p>
      )}
    </div>
  );
}
