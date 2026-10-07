"use client";

/**
 * অফিশিয়াল রেজাল্ট কার্ড — ২ পৃষ্ঠার A4 Landscape (297 × 210 mm), ফিক্সড px ক্যালিব্রেটেড লেআউট (1123 × 794)।
 *   পৃষ্ঠা ১ : কভার (বামে মন্তব্য ও পাণ্ডিত্য প্রকাশন, ডানে বিজ্ঞান পণ্ডিত লোগো, ব্যাজ ও শিক্ষার্থীর তথ্য)
 *   পৃষ্ঠা ২ : রেজাল্ট শিট (শিক্ষক-গ্রুপ, বিষয়, উপস্থিতি P/An, সর্বোচ্চ নম্বর, ১ম স্থান, জরিমানা, স্বাক্ষর)
 *
 * স্ক্রিনে useFitScale() দিয়ে মোবাইল বা ছোট পর্দায় আনুপাতিক স্কেল (scale) হয় — ফলে কোনো টেক্সট কাটে না।
 * প্রিন্টে (@page rc) 297mm × 209.5mm এ ১০০% ফুল পেজে প্রিন্ট হয়।
 */

import React, { useEffect, useRef, useState } from "react";
import { Printer, FileText, BookOpen, Layers, Palette } from "lucide-react";
import { MONTHS_BN, bn, classLabel, divisionLabel, fmtGpa } from "@/lib/constants";

export interface OfficialSubjectRow {
  subjectId: number;
  subjectName: string;
  teacherName?: string;
  teacherShortName?: string;
  totalMarks: number;
  classHighest: number;
  obtained: number;
  grade: string;
  gpa: number;
  isFourth?: boolean;
  attendance?: string; // P, A1, A2...
}

export interface DirectorOption {
  id: number;
  name: string;
  institution?: string | null;
  signatureUrl?: string | null;
}

export interface OfficialResultCardProps {
  mode?: "MONTHLY" | "ANNUAL" | "MODEL";
  month?: number | string;
  year?: number | string;
  student: {
    id?: number;
    name: string;
    roll: number | string;
    className: string;
    division?: string | null;
    section?: string | null;
    bookNo?: string | number;
  };
  subjects: OfficialSubjectRow[];
  overall: {
    totalMarks: number;
    classHighestTotal?: number;
    obtained: number;
    grade: string;
    gpa: number;
    percentage?: number;
  };
  position?: number | string;
  fine?: number | string;
  directorInfo?: {
    name?: string | null;
    signatureUrl?: string | null;
    institution?: string | null;
  };
  availableDirectors?: DirectorOption[];
  selectedDirectorId?: number | null | "BOTH";
  onDirectorChange?: (directorId: number | "BOTH") => void;
  logoUrl?: string | null;
  academyName?: string | null;
  teacherComments?: {
    comment1?: string;
    comment2?: string;
    guardianComment?: string;
    dateMH?: string;
    dateRI?: string;
  };
  topStudent?: {
    totalMarks?: number;
    totalObtained?: number;
    grade?: string;
    gpa?: number;
  };
  defaultTab?: "SHEET" | "BOOKLET" | "ALL";
  bgTheme?: BgTheme;
  onBgThemeChange?: (theme: BgTheme) => void;
  isLastCard?: boolean;
  hideCardControls?: boolean;
  showPrintButton?: boolean;
}

/* ---- ফিক্সড মাপ (px, 96dpi) ---- */
const PAGE_W = 1123;
const PAGE_H = 794;
const BODY_H = 432;
const GAP_H = 14;
const MIN_ROWS = 8;

/** পর্দার প্রস্থ অনুযায়ী পৃষ্ঠা আনুপাতিক স্কেলিং */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth || PAGE_W) / PAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, scale] as const;
}

type BodyRow =
  | { kind: "sub"; sub: OfficialSubjectRow; teacher?: { name: string; short: string; span: number } }
  | { kind: "gap" }
  | { kind: "blank" };

function CommentBox({ cls, title, text, date, sig }: { cls: string; title: string; text?: string; date?: string; sig?: "MH" | "RI" }) {
  return (
    <div className={`rc-cbox ${cls}`}>
      <div className="rc-t">
        <u>{title}</u>
        <span className="rc-fill" />
      </div>
      {[64, 96, 129].map((top) => (
        <div key={top} className="rc-l" style={{ top }} />
      ))}
      {text ? <div className="rc-ctext">{text}</div> : null}
      {date && (
        <div className="rc-a" style={{ left: 10, bottom: 6, fontSize: "11px", fontWeight: "bold", color: "#333" }}>
          তারিখ: {date}
        </div>
      )}
      {sig && (
        <div className="rc-a" style={{ right: 12, bottom: 4, height: 26, width: 75, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {sig === "MH" ? (
            <svg className="h-[22px] w-[70px] text-[#1e3a5f]" style={{ mixBlendMode: "multiply", background: "transparent" }} viewBox="0 0 95 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 6,20 Q 22,5 34,21 T 58,10 T 78,16" />
              <path d="M 24,12 Q 46,2 62,15" />
            </svg>
          ) : (
            <svg className="h-[22px] w-[70px] text-[#1e3a5f]" style={{ mixBlendMode: "multiply", background: "transparent" }} viewBox="0 0 95 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="48" cy="16" r="11" strokeWidth="1.4" />
              <path d="M 37,23 L 44,9 L 55,9 Q 60,9 60,15 Q 60,20 52,20 L 44,20" />
              <path d="M 51,20 L 59,27" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

// ব্যাকগ্রাউন্ড থিম
type BgTheme = "FLORAL" | "ROYAL" | "PARCHMENT" | "CLEAN";

export function OfficialResultCard({
  mode = "MONTHLY",
  month = 10,
  year = new Date().getFullYear(),
  student,
  subjects = [],
  overall,
  position,
  fine,
  directorInfo,
  availableDirectors,
  selectedDirectorId,
  onDirectorChange,
  logoUrl,
  teacherComments,
  topStudent,
  defaultTab = "ALL",
  bgTheme: propBgTheme,
  onBgThemeChange,
  isLastCard = true,
  hideCardControls = false,
  showPrintButton = false,
}: OfficialResultCardProps) {
  const [activeView, setActiveView] = useState<"SHEET" | "BOOKLET" | "ALL">(defaultTab);
  const [localBgTheme, setLocalBgTheme] = useState<BgTheme>("FLORAL");
  const bgTheme = propBgTheme ?? localBgTheme;
  const handleBgThemeChange = (newTheme: BgTheme) => {
    setLocalBgTheme(newTheme);
    onBgThemeChange?.(newTheme);
  };
  const [wrapRef, scale] = useFitScale();

  const [activeDirectorId, setActiveDirectorId] = useState<number | "BOTH">(() => {
    if (selectedDirectorId !== undefined && selectedDirectorId !== null) return selectedDirectorId;
    if (availableDirectors && availableDirectors.length > 0) return availableDirectors[0].id;
    return 1;
  });
  useEffect(() => {
    if (selectedDirectorId !== undefined && selectedDirectorId !== null) {
      setActiveDirectorId(selectedDirectorId);
    }
  }, [selectedDirectorId]);

  const activeDirector = availableDirectors?.find((d) => d.id === activeDirectorId);
  const directorName = activeDirector?.name || directorInfo?.name || "ডাঃ মোঃ শাহিন";
  const directorTitle = activeDirector
    ? activeDirector.institution
      ? `-${activeDirector.institution}`
      : "-এম.বি.বি.এস, রামেক"
    : directorInfo?.institution
      ? `-${directorInfo.institution}`
      : "-এম.বি.বি.এস, রামেক";
  const activeSignatureUrl =
    (activeDirector ? activeDirector.signatureUrl : directorInfo?.signatureUrl) || null;
  const isBothDirectors = activeDirectorId === "BOTH" && (availableDirectors?.length ?? 0) >= 2;

  const monthNum = typeof month === "number" ? month : Number(month) || 10;
  const monthName = MONTHS_BN[monthNum - 1] ?? "জানুয়ারী";
  const numYear = Number(year) || new Date().getFullYear();
  const yearSuffix = String(numYear).slice(-2);
  const yearStr = bn(numYear);

  // অটোমেটিক জরিমানা ও অনুপস্থিতি হিসাব
  let totalAbsenceCount = 0;
  let totalFails = 0;
  for (const s of subjects) {
    const att = s.attendance || (s.obtained === 0 && s.grade === "F" ? "A1" : "P");
    if (att.startsWith("A")) {
      const num = parseInt(att.substring(1), 10) || 1;
      totalAbsenceCount += num;
    }
    if (s.grade === "F" && !s.isFourth) {
      totalFails++;
    }
  }

  const calculatedFine = totalAbsenceCount * 20 + totalFails * 50;
  const fineDisplay = fine !== undefined && fine !== null && fine !== "০০/-"
    ? fine
    : `${calculatedFine}.00৳`;

  /* ---------- টেবিল সারি তৈরি (শিক্ষক-গ্রুপ → গ্যাপ → ফাঁকা সারি) ---------- */
  const groups: { name: string; short: string; subs: OfficialSubjectRow[] }[] = [];
  const gIndex = new Map<string, number>();
  for (const s of subjects) {
    const name = s.teacherName || "";
    if (!gIndex.has(name)) {
      gIndex.set(name, groups.length);
      groups.push({ name, short: name ? s.teacherShortName || "" : "", subs: [] });
    }
    groups[gIndex.get(name)!].subs.push(s);
  }
  groups.sort((a, b) => (a.name === "" ? 1 : 0) - (b.name === "" ? 1 : 0));
  const n = subjects.length;
  const blankCount = Math.max(0, MIN_ROWS - n);
  const rows: BodyRow[] = [];
  groups.forEach((g, gi) => {
    g.subs.forEach((sub, si) =>
      rows.push({
        kind: "sub",
        sub,
        teacher: si === 0 ? { name: g.name, short: g.short, span: g.subs.length } : undefined,
      }),
    );
    if (gi < groups.length - 1 || blankCount > 0) rows.push({ kind: "gap" });
  });
  for (let i = 0; i < blankCount; i++) rows.push({ kind: "blank" });

  const gapCount = rows.filter((r) => r.kind === "gap").length;
  const dataRows = Math.max(MIN_ROWS, n);
  const rowH = Math.floor(((BODY_H - gapCount * GAP_H) / dataRows) * 2) / 2;

  const posText = position ? (typeof position === "number" ? bn(position) : position) : "১ম";
  const nameLen = student.name.length;
  const nameSize = nameLen > 30 ? 12 : nameLen > 24 ? 14 : nameLen > 19 ? 16 : 19;
  const divText = student.division ? divisionLabel(student.division) : "";
  const shakha = [divText, student.section].filter(Boolean).join(" | ");

  const slotStyle = { width: PAGE_W * scale, height: PAGE_H * scale };
  const pageStyle = { transform: `scale(${scale})` };
  const showCover = activeView === "BOOKLET" || activeView === "ALL";
  const showSheet = activeView === "SHEET" || activeView === "ALL";

  // থিম অনুসারে ব্যাকগ্রাউন্ড স্টাইল
  const getPanelBg = (side: "LEFT" | "RIGHT" | "SHEET"): React.CSSProperties => {
    if (bgTheme === "CLEAN") return { backgroundColor: "#ffffff", backgroundImage: "none" };
    if (bgTheme === "PARCHMENT") {
      return {
        backgroundColor: "#fdfbf7",
        backgroundImage: "radial-gradient(#e2d9cc 0.75px, transparent 0.75px)",
        backgroundSize: "16px 16px",
      };
    }
    if (bgTheme === "ROYAL") {
      return {
        backgroundColor: "#f6f9fc",
        backgroundImage: "radial-gradient(#d3e1ef 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      };
    }
    // FLORAL (Default)
    if (side === "SHEET") {
      return {
        backgroundColor: "#eaf2dd",
        backgroundImage: "radial-gradient(circle at 95% 85%, rgba(240, 170, 160, 0.22) 0%, rgba(180, 220, 190, 0.18) 35%, transparent 60%)",
      };
    }
    return {
      backgroundColor: "#f4f7fb",
      backgroundImage: "radial-gradient(circle at 10% 10%, rgba(180, 225, 190, 0.25) 0%, transparent 45%), radial-gradient(circle at 90% 90%, rgba(245, 190, 180, 0.22) 0%, transparent 45%)",
    };
  };

  const todayStr = new Date().toLocaleDateString("en-GB");
  const dateMH = teacherComments?.dateMH || todayStr;
  const dateRI = teacherComments?.dateRI || todayStr;

  const tabCls = (on: boolean, color: string) =>
    `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
      on ? `${color} text-white shadow-xs` : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div ref={wrapRef} className="w-full space-y-4 font-sans text-slate-900 print:space-y-0 print:m-0 print:p-0">
      {/* ইনজেক্টেড প্রিন্ট স্টাইল — নিশ্চিত করবে A4 Landscape, মার্জিন ০ এবং কোনো অতিরিক্ত ৩য় সাদা পেজ বা নোটিশ থাকবে না */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: 297mm 210mm !important;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 297mm !important;
                min-width: 297mm !important;
                height: 100% !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                overflow: visible !important;
              }
              .app-sidebar,
              .app-topbar,
              header,
              nav,
              .no-print,
              .notice-ticker,
              [class*="NoticeTicker"],
              .marquee-container {
                display: none !important;
              }
              .app-shell,
              .app-main,
              main,
              .lg\\:pl-\\[176px\\] {
                margin: 0 !important;
                padding: 0 !important;
                max-width: none !important;
                width: 297mm !important;
                display: block !important;
              }
              .rc-slot {
                width: 297mm !important;
                height: 209.5mm !important;
                max-height: 209.5mm !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: hidden !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .rc-slot-cover {
                break-after: page !important;
                page-break-after: always !important;
              }
              .rc-slot-sheet.rc-break,
              .rc-slot.rc-break {
                break-after: page !important;
                page-break-after: always !important;
              }
              .rc-slot-sheet.rc-last,
              .rc-slot.rc-last {
                break-after: auto !important;
                page-break-after: auto !important;
              }
              .rc-page {
                transform: scale(0.998) !important;
                transform-origin: 0 0 !important;
                overflow: hidden !important;
              }
            }
          `,
        }}
      />

      {/* কন্ট্রোল বার (প্রিন্টে লুকানো) */}
      {!hideCardControls && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button onClick={() => setActiveView("BOOKLET")} className={tabCls(activeView === "BOOKLET", "bg-teal-700")}>
              <BookOpen className="h-4 w-4" />
              <span>পৃষ্ঠা ১ — কভার ও মন্তব্য</span>
            </button>
            <button onClick={() => setActiveView("SHEET")} className={tabCls(activeView === "SHEET", "bg-emerald-600")}>
              <FileText className="h-4 w-4" />
              <span>পৃষ্ঠা ২ — রেজাল্ট শিট</span>
            </button>
            <button onClick={() => setActiveView("ALL")} className={tabCls(activeView === "ALL", "bg-slate-900")}>
              <Layers className="h-4 w-4" />
              <span>দুই পৃষ্ঠা একসাথে</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* ব্যাকগ্রাউন্ড থিম নির্বাচক */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs shadow-2xs">
              <Palette className="h-3.5 w-3.5 text-slate-600" />
              <span className="font-bold text-slate-700 whitespace-nowrap">ডিজাইন ব্যাকগ্রাউন্ড:</span>
              <select
                value={bgTheme}
                onChange={(e) => handleBgThemeChange(e.target.value as BgTheme)}
                aria-label="ব্যাকগ্রাউন্ড থিম নির্বাচন"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="FLORAL">১. ফ্লোরাল ও স্টুডেন্ট আর্ট (অফিশিয়াল)</option>
                <option value="ROYAL">২. রয়্যাল ব্লু সার্টিফিকেট</option>
                <option value="PARCHMENT">৩. ক্লাসিক পার্চমেন্ট পেপার</option>
                <option value="CLEAN">৪. মিনিমালিস্ট ক্লিন হোয়াইট</option>
              </select>
            </div>

            {availableDirectors && availableDirectors.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs shadow-2xs">
                <span className="font-bold text-slate-700 whitespace-nowrap">স্বাক্ষর:</span>
                <select
                  value={String(activeDirectorId)}
                  onChange={(e) => {
                    const val = e.target.value === "BOTH" ? "BOTH" : Number(e.target.value);
                    setActiveDirectorId(val);
                    onDirectorChange?.(val);
                  }}
                  aria-label="স্বাক্ষর নির্বাচন"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                >
                  {availableDirectors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.institution ? `(${d.institution})` : ""}
                    </option>
                  ))}
                  <option value="BOTH">উভয় পরিচালকের যৌথ স্বাক্ষর</option>
                </select>
              </div>
            )}
            {showPrintButton && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Printer className="h-4 w-4" />
                <span>প্রিন্ট করুন (A4 Landscape)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= পৃষ্ঠা ১ : কভার ================= */}
      {showCover && (
        <div className={`rc-slot rc-slot-cover mx-auto ${showSheet ? "" : "rc-last"}`} style={slotStyle}>
          <div className="rc-page" style={pageStyle}>
            {/* বাম প্যানেল */}
            <div className="rc-panel rc-pl" style={getPanelBg("LEFT")}>
              <CommentBox cls="rc-b1" title="শিক্ষকের মন্তব্য (MH):" text={teacherComments?.comment1 || "আরো ভালো করা উচিত ছিল"} date={dateMH} sig="MH" />
              <CommentBox cls="rc-b2" title="শিক্ষকের মন্তব্য (RI):" text={teacherComments?.comment2 || "পরীক্ষায় অনুপস্থিত থাকা অন্যায়"} date={dateRI} sig="RI" />
              <CommentBox cls="rc-b3" title="অভিভাবকের মন্তব্য:" text={teacherComments?.guardianComment} />
              
              <div className="rc-pill rc-qleft">
                “মুহাম্মাদ (সা:) বলেন, তোমার নিজের জন্য তোমার পরিশ্রমই উত্তম” – সহিহ বুখারি, ২০২৭
              </div>
              
              {/* পাণ্ডিত্য প্রকাশন — বড় স্পষ্ট লোগো */}
              <div className="rc-logo-p rc-a flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black tracking-tight text-[#0d3b66]" style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}>
                    পাণ্ডিত্য
                  </span>
                  <span className="rounded-lg bg-[#0d3b66] px-3 py-1 text-lg font-bold text-white shadow-xs">
                    প্রকাশন
                  </span>
                </div>
                <div className="mt-1 text-[13px] font-bold tracking-widest text-slate-700">
                  মুখস্থ নয়, মেধা অন্বেষণ
                </div>
              </div>
            </div>

            {/* ডান প্যানেল */}
            <div className="rc-panel rc-pr" style={getPanelBg("RIGHT")}>
              {student.bookNo ? <div className="rc-a rc-tag">{bn(student.bookNo)}</div> : null}
              
              {/* বিজ্ঞান পণ্ডিত — বড় আকর্ষণীয় অফিশিয়াল লোগো (Tutor Center ব্যাজ সহ) */}
              <div className="rc-logo-b rc-a flex flex-col items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="বিজ্ঞান পণ্ডিত" style={{ maxHeight: "150px", width: "auto", objectFit: "contain" }} />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="relative inline-flex items-center justify-center">
                      <span className="text-[52px] font-black tracking-tight text-[#1b5e20]" style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}>
                        বিজ্ঞান
                      </span>
                      <span className="ml-2 text-[52px] font-black tracking-tight text-[#e65100]" style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}>
                        পণ্ডিত
                      </span>
                      <span className="absolute -top-3 -right-14 rounded-full bg-[#d32f2f] px-3 py-0.5 text-[11px] font-black uppercase text-white shadow-sm">
                        Tutor Center
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rc-a rc-tagline">সঠিক দিকনির্দেশনাই সাফল্যের চাবিকাঠি</div>
              <div className="rc-a rc-addr">সজীব ভিলা (সলঙ্গা রোড), বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ</div>
              <div className="rc-a rc-badge">রেজাল্ট কার্ড</div>
              
              <div className="rc-a rc-my">
                <span style={{ left: 16 }}>
                  মাসঃ <b>{monthName}</b>
                </span>
                <span style={{ left: 205 }}>
                  বছরঃ ২০<b>{bn(yearSuffix)}</b>
                </span>
              </div>
              
              <div className="rc-a rc-tab">শিক্ষার্থীর তথ্য</div>
              <div className="rc-a rc-info">
                {(
                  [
                    ["শিক্ষার্থীর নাম", student.name, 27, nameSize],
                    ["শ্রেণী", classLabel(student.className), 67, 19],
                    ["শাখা", shakha, 109, 19],
                    ["রোল", bn(student.roll), 149, 19],
                  ] as [string, string, number, number][]
                ).map(([label, value, top, fs]) => (
                  <div key={label} className="rc-r" style={{ top }}>
                    <b>{label}</b>
                    <i>:</i>
                    <span className="rc-fill" />
                    <span className="rc-v" style={{ fontSize: fs }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rc-a rc-qt">“ মানুষ তাই পাবে, যা সে চেষ্টা করে ” – (সূরা আল নাজম, ৩৯)</div>
            </div>
          </div>
        </div>
      )}

      {/* ================= পৃষ্ঠা ২ : রেজাল্ট শিট ================= */}
      {showSheet && (
        <div className={`rc-slot rc-slot-sheet mx-auto ${isLastCard ? "rc-last" : "rc-break"}`} style={slotStyle}>
          <div className="rc-page" style={pageStyle}>
            <div className="rc-sheet" style={getPanelBg("SHEET")}>
              <div className="rc-a rc-stitle">
                <span className={mode === "MONTHLY" ? "text-red-600 font-bold" : "text-slate-400 font-normal"}>
                  {mode === "MONTHLY" ? "●" : "○"}
                </span>{" "}
                <span className={mode === "MONTHLY" ? "text-red-700 font-bold" : ""}>মাসিক</span>
                {" / "}
                <span className={mode === "MODEL" ? "text-red-600 font-bold" : "text-slate-400 font-normal"}>
                  {mode === "MODEL" ? "●" : "○"}
                </span>{" "}
                <span className={mode === "MODEL" ? "text-red-700 font-bold" : ""}>মডেল টেস্ট</span>
                {" / "}
                <span className={mode === "ANNUAL" ? "text-red-600 font-bold" : "text-slate-400 font-normal"}>
                  {mode === "ANNUAL" ? "●" : "○"}
                </span>{" "}
                <span className={mode === "ANNUAL" ? "text-red-700 font-bold" : ""}>বাৎসরিক</span>
                {" রেজাল্ট শিট – ২০"}
                <span className="rc-dots">{bn(yearSuffix)}</span>
              </div>

              <div className="rc-a rc-months">
                মাসঃ{" "}
                {MONTHS_BN.map((m, i) => (
                  <React.Fragment key={m}>
                    <span className={mode === "MONTHLY" && i + 1 === monthNum ? "rc-msel font-bold" : undefined}>{m}</span>
                    {i < MONTHS_BN.length - 1 ? " / " : ""}
                  </React.Fragment>
                ))}
              </div>

              {/* রেজাল্ট টেবিল: শিক্ষক, বিষয়, উপস্থিতি (P/An), মোট নম্বর, সর্বোচ্চ, প্রাপ্ত, গ্রেড, GPA */}
              <table className="rc-tbl">
                <colgroup>
                  {[75, 155, 52, 72, 80, 72, 50, 72, 16, 95, 95, 55, 70].map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>শিক্ষক</th>
                    <th>বিষয়</th>
                    <th className="rc-att">উপস্থিতি</th>
                    <th>মোট নম্বর</th>
                    <th className="rc-top">
                      সর্বোচ্চ
                      <br />
                      প্রাপ্ত নম্বর
                    </th>
                    <th>
                      প্রাপ্ত
                      <br />
                      নম্বর
                    </th>
                    <th>গ্রেড</th>
                    <th>
                      GPA
                      <br />
                      (5.00)
                    </th>
                    <th className="rc-sp" />
                    <th>
                      ১ম স্থান
                      <br />
                      সর্বোচ্চ
                    </th>
                    <th className="rc-pk">
                      মোট প্রাপ্ত
                      <br />
                      নম্বর
                    </th>
                    <th className="rc-pk">
                      মোট
                      <br />
                      গ্রেড
                    </th>
                    <th className="rc-pk">
                      মোট GPA
                      <br />
                      (5.00)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const first = idx === 0;
                    const right = first ? (
                      <>
                        <td className="rc-sp" rowSpan={rows.length} />
                        <td className="rc-top" rowSpan={rows.length}>
                          <div className="rc-vv">{bn(topStudent?.totalObtained || overall.classHighestTotal || overall.totalMarks)}</div>
                          <div className="text-[12px] font-bold text-slate-700">{topStudent?.grade || "A+"} ({fmtGpa(topStudent?.gpa ?? 5)})</div>
                          <div className="rc-dd" />
                        </td>
                        <td className="rc-pc" rowSpan={rows.length}>
                          <div className="rc-vv">{bn(overall.obtained)}/{bn(overall.totalMarks)}</div>
                          <div className="rc-dd" />
                        </td>
                        <td className="rc-pc" rowSpan={rows.length}>
                          <div className={`rc-vv ${totalFails > 0 ? "text-red-600 font-bold" : ""}`}>
                            {totalFails > 0 ? `F${totalFails > 1 ? bn(totalFails) : ""}` : overall.grade}
                          </div>
                          <div className="rc-dd" />
                        </td>
                        <td className="rc-pc" rowSpan={rows.length}>
                          <div className="rc-vv rc-gpa">
                            {totalFails > 0 ? "০.০০" : fmtGpa(overall.gpa)}
                          </div>
                          <div className="rc-dd" />
                        </td>
                      </>
                    ) : null;

                    if (r.kind === "gap") {
                      return (
                        <tr key={`g${idx}`} className="rc-gap">
                          <td colSpan={8} />
                          {right}
                        </tr>
                      );
                    }
                    if (r.kind === "blank") {
                      return (
                        <tr key={`b${idx}`} style={{ height: rowH }}>
                          <td />
                          <td className="rc-sub" />
                          <td className="rc-att-td" />
                          <td />
                          <td className="rc-top" />
                          <td />
                          <td />
                          <td />
                          {right}
                        </tr>
                      );
                    }
                    const { sub, teacher } = r;
                    const tFs = teacher
                      ? Math.max(12, Math.min(19, ((teacher.span * rowH) * 0.9) / (Math.max(teacher.name.length, 8) * 0.44)))
                      : 19;
                    const sFs = Math.min(sub.subjectName.length > 18 ? 15 : sub.subjectName.length > 14 ? 18 : 22, Math.floor(rowH * 0.55));
                    const nFs = Math.min(19, Math.floor(rowH * 0.5));
                    const att = sub.attendance || (sub.obtained === 0 && sub.grade === "F" ? "A1" : "P");

                    return (
                      <tr key={`s${sub.subjectId}-${idx}`} style={{ height: rowH }}>
                        {teacher && (
                          <td className="rc-tc" rowSpan={teacher.span}>
                            <div
                              className={teacher.span < 2 ? "rc-th" : undefined}
                              style={{ fontSize: teacher.span < 2 ? Math.min(13, Math.floor(rowH * 0.4)) : tFs }}
                            >
                              <div>{teacher.name}</div>
                              {teacher.short && (teacher.span >= 2 || rowH >= 40) ? <div>({teacher.short})</div> : null}
                            </div>
                          </td>
                        )}
                        <td className="rc-sub" style={{ fontSize: sFs, textAlign: "left", paddingLeft: "6px" }}>
                          {sub.subjectName}
                          {sub.isFourth ? <small className="rc-4th">৪র্থ</small> : null}
                        </td>
                        <td className="rc-att-td bold-txt">
                          {att.startsWith("A") ? (
                            <span style={{ color: "#dc2626", fontWeight: "bold" }}>{att}</span>
                          ) : (
                            <span style={{ color: "#166534", fontWeight: "bold" }}>{att}</span>
                          )}
                        </td>
                        <td className="rc-num" style={{ fontSize: nFs }}>{bn(sub.totalMarks)}</td>
                        <td className="rc-num rc-top" style={{ fontSize: nFs }}>{bn(sub.classHighest)}</td>
                        <td className="rc-num" style={{ fontSize: nFs }}>{bn(sub.obtained)}</td>
                        <td className={`rc-num ${sub.grade === "F" ? "text-red-600 font-bold" : ""}`} style={{ fontSize: nFs }}>
                          {sub.grade}
                        </td>
                        <td className="rc-num" style={{ fontSize: nFs }}>{fmtGpa(sub.gpa)}</td>
                        {right}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="rc-a rc-sm" style={{ top: 651 }}>
                <span>অবস্থানঃ</span>
                <b>{posText}</b>
              </div>
              <div className="rc-a rc-sm" style={{ top: 708 }}>
                <span>জরিমানাঃ</span>
                <b>{fineDisplay}</b>
              </div>

              {/* পরিচালকের স্বাক্ষর — কমপ্যাক্ট ২৮px ও স্বচ্ছ ব্যাকগ্রাউন্ড */}
              {isBothDirectors ? (
                availableDirectors!.slice(0, 2).map((d, i) => (
                  <div key={d.id} className="rc-a rc-sb" style={{ left: 54 + i * 198, width: i === 0 ? 199.5 : 198 }}>
                    <div className="rc-sig-wrap">
                      {d.signatureUrl ? (
                        <img src={d.signatureUrl} alt={`${d.name}-এর স্বাক্ষর`} />
                      ) : (
                        <svg className="h-[26px] w-[85px] text-[#1e3a5f]" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M 8,22 Q 28,5 45,18 T 75,8 T 92,18" />
                          <path d="M 32,8 Q 58,2 78,14" />
                        </svg>
                      )}
                    </div>
                    <div className="rc-ln rc-ln-s">
                      স্বাক্ষর ({d.name}
                      {d.institution ? ` -${d.institution}` : ""})
                    </div>
                  </div>
                ))
              ) : (
                <div className="rc-a rc-sb" style={{ left: 54, width: 396 }}>
                  <div className="rc-sig-wrap">
                    {activeSignatureUrl ? (
                      <img src={activeSignatureUrl} alt="ডিরেক্টরের স্বাক্ষর" />
                    ) : (
                      <svg className="h-[26px] w-[85px] text-[#1e3a5f]" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M 8,22 Q 28,5 45,18 T 75,8 T 92,18" />
                        <path d="M 32,8 Q 58,2 78,14" />
                      </svg>
                    )}
                  </div>
                  <div className="rc-ln">
                    ডিরেক্টরের স্বাক্ষর ({directorName} {directorTitle})
                  </div>
                </div>
              )}
              
              <div className="rc-a rc-sb" style={{ left: 448.5, width: 374.5 }}>
                <div className="rc-sig-wrap" />
                <div className="rc-ln">অভিভাবকের স্বাক্ষর</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hideCardControls && (
        <div className="no-print text-center text-xs text-slate-500">
          💡 টিপস: প্রিন্ট ডায়ালগে <b>A4</b>, <b>Landscape</b>, <b>Margins: None</b> এবং <b>Background graphics</b> টিক দিন —
          ২ পৃষ্ঠার (কভার + রেজাল্ট শিট) সম্পূর্ণ নিখুঁত পিডিএফ হবে।
        </div>
      )}
    </div>
  );
}
