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
import { Printer, FileText, BookOpen, Layers, Palette, Image as ImageIcon, Lock } from "lucide-react";
import { MONTHS_BN, bn, classLabel, divisionLabel, fmtGpa, cleanCardBgUrl, DEVELOPER_INFO } from "@/lib/constants";
import { TransparentSignature } from "@/components/app/transparent-signature";
import { CardBgModal } from "@/components/app/card-bg-modal";

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
  failCount?: number;
}

export interface DirectorOption {
  id: number;
  name: string;
  institution?: string | null;
  signatureUrl?: string | null;
}

export interface TeacherRemarkItem {
  id?: number | string;
  teacherId?: number;
  teacherName: string;
  teacherShortName?: string | null;
  signatureKey?: string | null;
  signatureUrl?: string | null;
  comment: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
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
  publicationLogoUrl?: string | null;
  publicationName?: string | null;
  academyName?: string | null;
  teacherRemarks?: TeacherRemarkItem[];
  teacherComments?: {
    comment1?: string;
    comment2?: string;
    guardianComment?: string;
    dateMH?: string;
    dateRI?: string;
    list?: TeacherRemarkItem[];
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
  cardBgUrl?: string | null;
  onCardBgChange?: (url: string | null) => void;
  isLastCard?: boolean;
  hideCardControls?: boolean;
  showPrintButton?: boolean;
  isAdmin?: boolean;
  canPrint?: boolean;
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

function CommentBox({
  cls = "",
  style,
  title,
  text,
  date,
  sig,
  signatureUrl,
  teacherName,
  lines,
  compact = false,
}: {
  cls?: string;
  style?: React.CSSProperties;
  title: string;
  text?: string;
  date?: string;
  sig?: string;
  signatureUrl?: string | null;
  teacherName?: string;
  lines?: number[];
  compact?: boolean;
}) {
  const lineTops = lines ?? [64, 96, 129];
  return (
    <div className={`rc-cbox ${cls}`} style={style}>
      <div className="rc-t" style={compact ? { height: "22px", fontSize: "13px" } : undefined}>
        <u style={{ maxWidth: "82%", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</u>
        <span className="rc-fill" />
      </div>
      {lineTops.map((top) => (
        <div key={top} className="rc-l" style={{ top }} />
      ))}
      {text ? (
        <div
          className="rc-ctext"
          style={
            compact
              ? {
                  top: "23px",
                  height: "auto",
                  maxHeight: style?.height ? `${parseInt(String(style.height)) - 44}px` : "50px",
                  fontSize: "12px",
                  lineHeight: "18px",
                }
              : undefined
          }
        >
          {text}
        </div>
      ) : null}
      {date && (
        <div
          className="rc-a"
          style={{
            left: 10,
            bottom: compact ? 3 : 6,
            fontSize: compact ? "9.5px" : "11px",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          তারিখ: {date}
        </div>
      )}
      {signatureUrl ? (
        <div
          className="rc-a flex items-center justify-end gap-1.5"
          style={{
            right: 12,
            bottom: compact ? 2 : 4,
            height: compact ? 20 : 26,
            maxWidth: compact ? 130 : 150,
          }}
        >
          <TransparentSignature
            src={signatureUrl}
            alt={`${teacherName || "শিক্ষক"}-এর স্বাক্ষর`}
            style={{ maxHeight: compact ? "18px" : "24px", maxWidth: "75px" }}
          />
          {teacherName && (
            <span
              className="text-[#333] font-semibold truncate"
              style={{ fontSize: compact ? "8px" : "9.5px", maxWidth: compact ? "45px" : "60px" }}
              title={teacherName}
            >
              ({teacherName.split(" ")[0]})
            </span>
          )}
        </div>
      ) : text && (sig || teacherName) ? (
        <div
          className="rc-a flex items-center justify-end gap-1 text-[#333]"
          style={{
            right: 12,
            bottom: compact ? 3 : 5,
            fontSize: compact ? "9.5px" : "11px",
            fontWeight: "bold",
          }}
        >
          <span className="font-normal text-slate-500 text-[9px]">স্বাক্ষর:</span>
          <span className="font-semibold underline decoration-dotted">{sig || teacherName}</span>
        </div>
      ) : null}
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
  publicationLogoUrl: propPublicationLogoUrl,
  publicationName: propPublicationName,
  academyName,
  teacherRemarks,
  teacherComments,
  topStudent,
  defaultTab = "ALL",
  bgTheme: propBgTheme,
  onBgThemeChange,
  cardBgUrl: propCardBgUrl,
  onCardBgChange,
  isLastCard = true,
  hideCardControls = false,
  showPrintButton: propShowPrintButton = false,
  isAdmin = false,
  canPrint: propCanPrint,
}: OfficialResultCardProps) {
  // রেজাল্ট কার্ড শুধুমাত্র অ্যাডমিন প্রিন্ট করতে পারবেন (Strictly Admin Only)
  const canPrint = Boolean(isAdmin);
  const showPrint = Boolean(isAdmin && propShowPrintButton);

  const [activeView, setActiveView] = useState<"SHEET" | "BOOKLET" | "ALL">(defaultTab);
  const bgTheme = propBgTheme ?? "FLORAL";
  const [activeBgUrl, setActiveBgUrl] = useState<string | null>(propCardBgUrl || null);
  const [activePubLogoUrl, setActivePubLogoUrl] = useState<string | null>(propPublicationLogoUrl || null);
  const [activePubName, setActivePubName] = useState<string>(propPublicationName || "পাণ্ডিত্য প্রকাশন");
  const [bgModalOpen, setBgModalOpen] = useState(false);

  const resolvedBgUrl = cleanCardBgUrl(activeBgUrl);

  useEffect(() => {
    if (propPublicationLogoUrl !== undefined) {
      setActivePubLogoUrl(propPublicationLogoUrl || null);
    }
  }, [propPublicationLogoUrl]);

  useEffect(() => {
    if (propPublicationName !== undefined) {
      setActivePubName(propPublicationName || "পাণ্ডিত্য প্রকাশন");
    }
  }, [propPublicationName]);

  useEffect(() => {
    if (propCardBgUrl !== undefined) {
      setActiveBgUrl(propCardBgUrl || null);
    } else {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok) {
            if (data.cardBgUrl) setActiveBgUrl(data.cardBgUrl);
            if (propPublicationLogoUrl === undefined && data.publicationLogoUrl) {
              setActivePubLogoUrl(data.publicationLogoUrl);
            }
            if (propPublicationName === undefined && data.publicationName) {
              setActivePubName(data.publicationName);
            }
          }
        })
        .catch(() => {});
    }
  }, [propCardBgUrl, propPublicationLogoUrl, propPublicationName]);

  const handleCustomBgChange = (newUrl: string | null) => {
    setActiveBgUrl(newUrl);
    onCardBgChange?.(newUrl);
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
    const att = s.attendance || "P";
    if (att.startsWith("A")) {
      const num = parseInt(att.substring(1), 10) || 1;
      totalAbsenceCount += num;
    }
    // Fail count: use s.failCount if provided; otherwise check for compulsory fail
    const failsInSub = s.failCount !== undefined
      ? s.failCount
      : (s.grade === "F" && !s.isFourth && (!att.startsWith("A") || s.obtained > 0) ? 1 : 0);
    totalFails += failsInSub;
  }

  const calculatedFine = totalAbsenceCount * 20 + totalFails * 50;
  // "০০/-" means "explicitly zero fine" (annual cards) — display it as-is.
  // If fine was passed as "0.00৳" or "0৳" while calculatedFine > 0, prefer calculatedFine so fails are never dropped.
  const fineDisplay = fine !== undefined && fine !== null
    ? (fine === "০০/-" || fine === "00/-" ? fine : (fine === "0.00৳" || fine === "0৳" || fine === "0") && calculatedFine > 0 ? `${calculatedFine}.00৳` : fine)
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

  // থিম অনুসারে ব্যাকগ্রাউন্ড স্টাইল — কাস্টম ব্যাকগ্রাউন্ড শুধুমাত্র কভার পেজে (RIGHT/LEFT) প্রযোজ্য হবে
  const getPanelBg = (side: "LEFT" | "RIGHT" | "SHEET"): React.CSSProperties => {
    // ১. রেজাল্ট কার্ড শিট (SHEET - পাতা ২) সবসময় স্বাভাবিক ও পরিষ্কার থাকবে, কাস্টম ব্যাকগ্রাউন্ড আসবে না
    if (side === "SHEET") {
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
      return {
        backgroundColor: "#eaf2dd",
        backgroundImage: "radial-gradient(circle at 95% 85%, rgba(240, 170, 160, 0.22) 0%, rgba(180, 220, 190, 0.18) 35%, transparent 60%)",
      };
    }

    // ২. শুধুমাত্র কভার পেজে (RIGHT এবং LEFT) কাস্টম আপলোডকৃত ব্যাকগ্রাউন্ড ছবি প্রযোজ্য
    if (resolvedBgUrl) {
      return {
        backgroundImage: `url("${resolvedBgUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#ffffff",
      };
    }

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
    <>
      <div
        ref={wrapRef}
        className={`w-full space-y-4 font-sans text-slate-900 ${
          canPrint ? "print-area print:space-y-0 print:m-0 print:p-0" : "no-print print:hidden"
        }`}
      >
        {/* ইনজেক্টেড প্রিন্ট স্টাইল — শুধুমাত্র অ্যাডমিন প্রিন্ট অনুমোদিত হলে সক্রিয় থাকবে */}
        {canPrint && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 0;
                  }
                  @page :left {
                    size: A4 landscape;
                    margin: 0;
                  }
                  @page :right {
                    size: A4 landscape;
                    margin: 0;
                  }
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    overflow: visible !important;
                  }
                  .app-sidebar,
                  .app-topbar,
                  header,
                  nav,
                  footer,
                  aside,
                  .no-print,
                  .notice-ticker,
                  [class*="NoticeTicker"],
                  .marquee-container {
                    display: none !important;
                  }
                  .app-shell,
                  .app-main,
                  main,
                  [class*="lg:pl-"],
                  .lg\\:pl-\\[176px\\] {
                    margin: 0 !important;
                    padding: 0 !important;
                    max-width: none !important;
                    width: 100% !important;
                    display: block !important;
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                  }
                  .rc-slot {
                    width: 297mm !important;
                    height: 210mm !important;
                    max-width: 297mm !important;
                    max-height: 210mm !important;
                    margin: 0 auto !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: hidden !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    display: block !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: #ffffff !important;
                    box-sizing: border-box !important;
                    position: relative !important;
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
                  .rc-slot.rc-last,
                  .rc-slot:last-of-type,
                  .rc-slot:last-child {
                    break-after: avoid !important;
                    page-break-after: avoid !important;
                  }
                  .rc-page {
                    width: 1123px !important;
                    height: 794px !important;
                    max-width: 1123px !important;
                    max-height: 794px !important;
                    transform: none !important;
                    transform-origin: 0 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                  }
                  .rc-tbl {
                    position: absolute !important;
                    left: 61px !important;
                    top: 112px !important;
                    width: 970px !important;
                    max-width: 970px !important;
                    min-width: 970px !important;
                    table-layout: fixed !important;
                    border-collapse: collapse !important;
                  }
                }
              `,
            }}
          />
        )}

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
              {/* ব্যাকগ্রাউন্ড ডিজাইন ও ছবি আপলোড বাটন — শুধুমাত্র অ্যাডমিন */}
              {canPrint && (
                <button
                  type="button"
                  onClick={() => setBgModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-800 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-400 transition shadow-2xs"
                >
                  <Palette className="h-4 w-4 text-emerald-700" />
                  <span>কার্ড ব্যাকগ্রাউন্ড ছবি / ডিজাইন</span>
                </button>
              )}

              {canPrint && availableDirectors && availableDirectors.length > 1 && (
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

              {/* রেজাল্ট কার্ড প্রিন্ট অপশন — শুধুমাত্র অ্যাডমিন */}
              {showPrint && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>প্রিন্ট করুন (A4 Landscape)</span>
                </button>
              )}

              {/* অ্যাডমিন ছাড়া অন্য ব্যবহারকারীদের জন্য বার্তা */}
              {!canPrint && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span>রেজাল্ট কার্ড শুধুমাত্র অ্যাডমিন প্রিন্ট করতে পারবেন</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ব্যাকগ্রাউন্ড ছবি ও ডিজাইন পরিবর্তন মডাল */}
        {canPrint && (
          <CardBgModal
            open={bgModalOpen}
            onOpenChange={setBgModalOpen}
            currentBgUrl={activeBgUrl}
            onBgChange={handleCustomBgChange}
          />
        )}

      {/* ================= পৃষ্ঠা ১ : কভার ================= */}
      {showCover && (
        <div className={`rc-slot rc-slot-cover mx-auto ${showSheet ? "" : "rc-last"}`} style={slotStyle}>
          <div className="rc-page" style={pageStyle}>
            {/* বাম প্যানেল */}
            <div className="rc-panel rc-pl" style={getPanelBg("LEFT")}>
              {/* শিক্ষক মন্তব্য এরিয়া: ২ জন হলে স্বাভাবিক মাপে, ২ এর বেশি হলে নির্ধারিত ৩০০px পরিধির মধ্যে অভিযোজিত স্কেলিং */}
              {(() => {
                const rawRemarks: TeacherRemarkItem[] = [
                  ...(teacherRemarks ?? []),
                  ...(teacherComments?.list ?? []),
                ];
                const remarksList = rawRemarks.filter((item, index, self) =>
                  index === self.findIndex((t) => (item.id && t.id ? t.id === item.id : t.teacherId === item.teacherId && t.comment === item.comment))
                );

                // যদি কোনো শিক্ষকের সংরক্ষিত মন্তব্য না থাকে তবে একদম পরিষ্কার খালি বক্স (কোনো পূর্বনির্ধারিত স্বাক্ষর বা তারিখ ছাড়া)
                if (remarksList.length === 0) {
                  return (
                    <>
                      <CommentBox
                        cls="rc-b1"
                        title="শিক্ষকের মন্তব্য (১):"
                      />
                      <CommentBox
                        cls="rc-b2"
                        title="শিক্ষকের মন্তব্য (২):"
                      />
                    </>
                  );
                }

                // ১ জন শিক্ষক মন্তব্য দিলে: ১ম বক্সে সেই শিক্ষকের মন্তব্য ও স্বাক্ষর, ২য় বক্স খালি
                if (remarksList.length === 1) {
                  const r = remarksList[0];
                  return (
                    <>
                      <CommentBox
                        cls="rc-b1"
                        title={`শিক্ষকের মন্তব্য (${r.teacherShortName || r.teacherName}):`}
                        text={r.comment}
                        date={r.date || todayStr}
                        signatureUrl={r.signatureUrl}
                        sig={r.teacherShortName || undefined}
                        teacherName={r.teacherName}
                      />
                      <CommentBox
                        cls="rc-b2"
                        title="শিক্ষকের মন্তব্য (২):"
                      />
                    </>
                  );
                }

                // ঠিক ২ জন শিক্ষক মন্তব্য দিলে: "২ জন হলে এখন যেমন মাপে আছে তেমন মাপেই থাকবে"
                if (remarksList.length === 2) {
                  const r1 = remarksList[0];
                  const r2 = remarksList[1];
                  return (
                    <>
                      <CommentBox
                        cls="rc-b1"
                        title={`শিক্ষকের মন্তব্য (${r1.teacherShortName || r1.teacherName}):`}
                        text={r1.comment}
                        date={r1.date || todayStr}
                        signatureUrl={r1.signatureUrl}
                        sig={r1.teacherShortName || undefined}
                        teacherName={r1.teacherName}
                      />
                      <CommentBox
                        cls="rc-b2"
                        title={`শিক্ষকের মন্তব্য (${r2.teacherShortName || r2.teacherName}):`}
                        text={r2.comment}
                        date={r2.date || todayStr}
                        signatureUrl={r2.signatureUrl}
                        sig={r2.teacherShortName || undefined}
                        teacherName={r2.teacherName}
                      />
                    </>
                  );
                }

                // ২ এর বেশি শিক্ষক (৩, ৪, ৫...) হলে:
                // "শুধু যখন শিক্ষক বাড়বে ওইটুকু যায়গার মধ্যেই এমন ভাবে করবে যেন সব শিক্ষক এর মন্তব্য যায়গা পায় ভালোভাবে"
                const N = remarksList.length;
                const totalH = 299; // top 24px থেকে 323px পর্যন্ত মোট উচ্চতা
                const gap = N === 3 ? 8 : N === 4 ? 6 : 4;
                const boxH = Math.floor((totalH - (N - 1) * gap) / N);
                const bgPalette = ["#d9eaf7", "#e2eed6", "#fef3c7", "#ede9fe", "#e0f2fe", "#ffe4e6"];

                return (
                  <>
                    {remarksList.map((r, idx) => {
                      const top = 24 + idx * (boxH + gap);
                      const bg = bgPalette[idx % bgPalette.length];
                      const lines =
                        boxH >= 85 ? [boxH - 42, boxH - 22] : boxH >= 65 ? [boxH - 22] : [];

                      return (
                        <CommentBox
                          key={r.id || idx}
                          style={{
                            top: `${top}px`,
                            height: `${boxH}px`,
                            background: bg,
                          }}
                          compact={N > 2}
                          lines={lines}
                          title={`শিক্ষকের মন্তব্য (${r.teacherShortName || r.teacherName}):`}
                          text={r.comment}
                          date={r.date || todayStr}
                          signatureUrl={r.signatureUrl}
                          sig={r.teacherShortName || undefined}
                          teacherName={r.teacherName}
                        />
                      );
                    })}
                  </>
                );
              })()}
              <CommentBox cls="rc-b3" title="অভিভাবকের মন্তব্য:" text={teacherComments?.guardianComment} />
              
              <div className="rc-pill rc-qleft">
                “মুহাম্মাদ (সা:) বলেন, তোমার নিজের জন্য তোমার পরিশ্রমই উত্তম” – সহিহ বুখারি, ২০২৭
              </div>
              
              {/* প্রকাশনী লোগো — ইউজারের আপলোড করা অফিশিয়াল লোগো অথবা টেক্সট লোগো */}
              <div className="rc-logo-p rc-a flex flex-col items-center justify-center">
                {activePubLogoUrl ? (
                  <img
                    src={activePubLogoUrl}
                    alt={activePubName || "প্রকাশনী লোগো"}
                    style={{
                      maxHeight: "120px",
                      maxWidth: "360px",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-black tracking-tight text-[#0d3b66]" style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}>
                        {activePubName && activePubName.includes(" ") ? activePubName.split(" ")[0] : "পাণ্ডিত্য"}
                      </span>
                      <span className="rounded-lg bg-[#0d3b66] px-3 py-1 text-lg font-bold text-white shadow-xs">
                        {activePubName && activePubName.includes(" ") ? activePubName.split(" ").slice(1).join(" ") : "প্রকাশন"}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] font-bold tracking-widest text-slate-700">
                      মুখস্থ নয়, মেধা অন্বেষণ
                    </div>
                  </>
                )}
              </div>

              {/* প্রকাশনী লোগোর নিচে ডেভেলপার ব্র্যান্ডিং (সবুজ চিহ্নিত স্থান) */}
              <div
                className="rc-a font-sans text-slate-500 select-none pointer-events-none text-center"
                style={{
                  top: 718,
                  left: 0,
                  right: 0,
                  width: "100%",
                  fontSize: 9,
                  letterSpacing: "0.2px",
                  lineHeight: "13px",
                }}
              >
                Developed by <span className="font-semibold text-slate-700">{DEVELOPER_INFO.name}</span> • <span className="font-semibold text-slate-700">{DEVELOPER_INFO.company}</span>
                <br />
                <span className="text-[8px] text-slate-400 font-mono">Gmail: {DEVELOPER_INFO.email}</span>
              </div>
            </div>

            {/* ডান প্যানেল */}
            <div className="rc-panel rc-pr" style={getPanelBg("RIGHT")}>
              {student.bookNo ? <div className="rc-a rc-tag">{bn(student.bookNo)}</div> : null}
              
              {/* বিজ্ঞান পণ্ডিত — বড় আকর্ষণীয় অফিশিয়াল লোগো (Tutor Center ব্যাজ সহ) */}
              <div className="rc-logo-b rc-a flex flex-col items-center justify-center">
                <img
                  src={logoUrl || "/logo.png"}
                  alt="বিজ্ঞান পণ্ডিত"
                  style={{ maxHeight: "172px", maxWidth: "470px", width: "auto", objectFit: "contain" }}
                />
              </div>

              <div className="rc-a rc-addr" style={{ top: 188 }}>
                সজীব ভিলা (সলঙ্গা রোড), বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ
              </div>
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
                    <span className={(mode === "MONTHLY" || mode === "MODEL") && i + 1 === monthNum ? "rc-msel font-bold" : undefined}>{m}</span>
                    {i < MONTHS_BN.length - 1 ? " / " : ""}
                  </React.Fragment>
                ))}
              </div>

              {/* রেজাল্ট টেবিল: শিক্ষক, বিষয়, উপস্থিতি (P/An), মোট নম্বর, সর্বোচ্চ, প্রাপ্ত, গ্রেড, GPA */}
              <table className="rc-tbl">
                <colgroup>
                  {[74, 150, 66, 72, 82, 72, 50, 70, 14, 94, 94, 56, 76].map((w, i) => (
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
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <div className="text-[20px] font-bold text-slate-900 leading-tight">
                              {bn(topStudent?.totalObtained || overall.classHighestTotal || overall.totalMarks)}
                            </div>
                            <div className="text-[20px] font-bold text-slate-900 leading-tight">
                              {topStudent?.grade || "A+"}
                            </div>
                            <div className="text-[20px] font-bold text-blue-700 leading-tight">
                              {fmtGpa(topStudent?.gpa ?? 5)}
                            </div>
                          </div>
                          <div className="rc-dd" />
                        </td>
                        <td className="rc-pc" rowSpan={rows.length}>
                          <div className="inline-flex flex-col items-center justify-center font-bold">
                            <span className="text-[20px] font-bold leading-tight text-slate-900 border-b-[1.5px] border-slate-900 px-1 pb-0.5 min-w-[36px] text-center">
                              {bn(overall.obtained)}
                            </span>
                            <span className="text-[18px] font-bold leading-tight text-slate-800 pt-0.5 px-1 min-w-[36px] text-center">
                              {bn(overall.totalMarks)}
                            </span>
                          </div>
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
                            {totalFails > 0 ? "0.00" : fmtGpa(overall.gpa)}
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

              <div className="rc-a rc-sm" style={{ top: 648 }}>
                <span>অবস্থানঃ</span>
                <b>{posText}</b>
              </div>
              <div className="rc-a rc-sm" style={{ top: 704 }}>
                <span>জরিমানাঃ</span>
                <b>{fineDisplay}</b>
              </div>

              {/* পরিচালকের স্বাক্ষর — কমপ্যাক্ট ২৮px ও স্বচ্ছ ব্যাকগ্রাউন্ড */}
              {isBothDirectors ? (
                availableDirectors!.slice(0, 2).map((d, i) => (
                  <div key={d.id} className="rc-a rc-sb" style={{ left: 61 + i * 190, width: 185 }}>
                    <div className="rc-sig-wrap">
                      {d.signatureUrl ? (
                        <TransparentSignature src={d.signatureUrl} alt={`${d.name}-এর স্বাক্ষর`} />
                      ) : null}
                    </div>
                    <div className="rc-ln rc-ln-s">
                      স্বাক্ষর ({d.name}
                      {d.institution ? ` -${d.institution}` : ""})
                    </div>
                  </div>
                ))
              ) : (
                <div className="rc-a rc-sb" style={{ left: 61, width: 370 }}>
                  <div className="rc-sig-wrap">
                    {activeSignatureUrl ? (
                      <TransparentSignature src={activeSignatureUrl} alt="ডিরেক্টরের স্বাক্ষর" />
                    ) : null}
                  </div>
                  <div className="rc-ln">
                    ডিরেক্টরের স্বাক্ষর ({directorName} {directorTitle})
                  </div>
                </div>
              )}
              
              <div className="rc-a rc-sb" style={{ left: 436, width: 375 }}>
                <div className="rc-sig-wrap" />
                <div className="rc-ln">অভিভাবকের স্বাক্ষর</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hideCardControls && canPrint && (
        <div className="no-print text-center text-xs text-slate-500">
          💡 টিপস: প্রিন্ট ডায়ালগে <b>A4</b>, <b>Landscape</b>, <b>Margins: None</b> এবং <b>Background graphics</b> টিক দিন —
          ২ পৃষ্ঠার (কভার + রেজাল্ট শিট) সম্পূর্ণ নিখুঁত পিডিএফ হবে।
        </div>
      )}
    </div>

    {/* অ্যাডমিন ছাড়া অন্য কেউ পেজ প্রিন্ট করার চেষ্টা করলে রেজাল্ট কার্ড প্রিন্ট হবে না */}
    {!canPrint && (
      <div className="hidden print:block rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-8 text-center text-slate-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-3">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          রেজাল্ট কার্ড শুধুমাত্র একাডেমি প্রশাসন / অ্যাডমিন কর্তৃক প্রিন্টযোগ্য
        </h3>
        <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
          অফিসিয়াল সিল ও স্বাক্ষরযুক্ত মূল রেজাল্ট কার্ড সংগ্রহের জন্য একাডেমি প্রশাসনের সাথে যোগাযোগ করার অনুরোধ করা হচ্ছে।
        </p>
      </div>
    )}
  </>
  );
}
