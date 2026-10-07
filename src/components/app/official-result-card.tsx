"use client";

/**
 * অফিশিয়াল রেজাল্ট কার্ড — ১০০০% পিক্সেল-টু-পিক্সেল হুবহু A4 Landscape (297mm × 210mm)
 * সম্পূর্ণ স্বয়ংক্রিয়: সব ডেটা ডাটাবেস ও প্রপস থেকে আসে।
 * 
 * রিকোয়ারমেন্টস ফিক্স:
 * ১. লোগো বড় ও সুস্পষ্ট (বিজ্ঞান পণ্ডিত ও পাণ্ডিত্য প্রকাশন)
 * ২. উপস্থিতি কলাম ও সারি প্রতিটি বিষয়ের সাথে নিশ্চিত
 * ৩. স্বাক্ষর সাইজ স্বাভাবিক (২৮px) এবং স্বচ্ছ ব্যাকগ্রাউন্ড (কোনো সাদা দাগ থাকবে না)
 * ৪. ব্যাকগ্রাউন্ড থিম পরিবর্তনযোগ্য (Changeable Backgrounds: ফ্লোরাল/আর্ট, রয়্যাল, পার্চমেন্ট, ক্লিন)
 */

import React, { useState } from "react";
import { Printer, BookOpen, FileText, Layers, Palette } from "lucide-react";
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
}

function getOverallGradeFromGpa(gpa: number): string {
  if (gpa >= 5.0) return "A+";
  if (gpa >= 4.0) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.0) return "D";
  return "F";
}

// ব্যাকগ্রাউন্ড থিম ডেফিনিশন
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
}: OfficialResultCardProps) {
  const [activeView, setActiveView] = useState<"SHEET" | "BOOKLET" | "ALL">(defaultTab);
  const [bgTheme, setBgTheme] = useState<BgTheme>("FLORAL");

  // Month & Year calculations
  const monthNum = typeof month === "number" ? month : Number(month) || 10;
  const monthName = MONTHS_BN[monthNum - 1] ?? "জানুয়ারী";
  const numYear = Number(year) || new Date().getFullYear();
  const yearStr = bn(numYear);

  // Director details
  const [activeDirectorId, setActiveDirectorId] = useState<number | "BOTH">(() => {
    if (selectedDirectorId !== undefined && selectedDirectorId !== null) return selectedDirectorId;
    if (availableDirectors && availableDirectors.length > 0) return availableDirectors[0].id;
    return 1;
  });

  const activeDirector = availableDirectors?.find((d) => d.id === activeDirectorId);
  const directorName = activeDirector?.name || directorInfo?.name || "ডাঃ মোঃ শাহিন";
  const directorTitle = activeDirector?.institution || directorInfo?.institution || "এম.বি.বি.এস, রামেক";
  const activeSignatureUrl = activeDirector?.signatureUrl || directorInfo?.signatureUrl || null;

  // Student details
  const studentName = student.name || "শিক্ষার্থীর নাম";
  const studentRoll = typeof student.roll === "number" ? bn(student.roll) : bn(String(student.roll || "০১"));
  const studentClass = classLabel(student.className);
  const divText = student.division ? divisionLabel(student.division) : "";
  const shakha = [divText, student.section].filter(Boolean).join(" | ") || "-";

  // Group subjects by teacher
  const mhSubjects: OfficialSubjectRow[] = [];
  const riSubjects: OfficialSubjectRow[] = [];
  const otherSubjects: OfficialSubjectRow[] = [];

  for (const s of subjects) {
    const tShort = (s.teacherShortName || "").toUpperCase();
    const tName = s.teacherName || "";
    if (tShort === "MH" || tName.includes("মেহেদী")) {
      mhSubjects.push(s);
    } else if (tShort === "RI" || tName.includes("রাকিবুল")) {
      riSubjects.push(s);
    } else {
      otherSubjects.push(s);
    }
  }

  const allTeacherList: {
    teacherName: string;
    teacherShort: string;
    subjects: OfficialSubjectRow[];
  }[] = [];

  if (mhSubjects.length > 0) {
    allTeacherList.push({
      teacherName: "মেহেদী হাসান",
      teacherShort: "MH",
      subjects: mhSubjects,
    });
  }
  if (riSubjects.length > 0) {
    allTeacherList.push({
      teacherName: "রাকিবুল ইসলাম",
      teacherShort: "RI",
      subjects: riSubjects,
    });
  }
  if (otherSubjects.length > 0) {
    allTeacherList.push({
      teacherName: otherSubjects[0].teacherName || "শিক্ষক",
      teacherShort: otherSubjects[0].teacherShortName || "",
      subjects: otherSubjects,
    });
  }

  if (allTeacherList.length === 0 && subjects.length > 0) {
    allTeacherList.push({
      teacherName: "মেহেদী হাসান",
      teacherShort: "MH",
      subjects,
    });
  }

  // Calculations for attendance, fails, 4th subject and fine
  let totalTotMarks = 0;
  let totalGotMarks = 0;
  let totalGPAPoints = 0;
  let compulsoryCount = 0;
  let totalFails = 0;
  let totalAbsenceCount = 0;

  let fourthSubjectGPA = 0;
  let hasFourthSubject = false;
  let fourthSubjectFailed = false;

  for (const s of subjects) {
    const tot = s.totalMarks || 100;
    const got = s.obtained;
    const gpa = s.gpa;
    const isFourth = Boolean(s.isFourth);

    // Attendance parsing
    const att = s.attendance || (s.obtained === 0 && s.grade === "F" ? "A1" : "P");
    if (att.startsWith("A")) {
      const num = parseInt(att.substring(1), 10) || 1;
      totalAbsenceCount += num;
    }

    totalTotMarks += tot;
    totalGotMarks += got;

    if (isFourth) {
      hasFourthSubject = true;
      fourthSubjectGPA = gpa;
      if (s.grade === "F") fourthSubjectFailed = true;
    } else {
      totalGPAPoints += gpa;
      compulsoryCount++;
      if (s.grade === "F") totalFails++;
    }
  }

  // SSC 4th Subject Rule
  let finalCalculatedGpa = 0;
  let finalCalculatedGrade = "F";

  if (compulsoryCount > 0) {
    let avgGpa = totalGPAPoints / compulsoryCount;
    if (hasFourthSubject && !fourthSubjectFailed && fourthSubjectGPA > 2.0) {
      const extraGpa = fourthSubjectGPA - 2.0;
      avgGpa += extraGpa / compulsoryCount;
    }
    avgGpa = Math.min(5.0, Math.round(avgGpa * 100) / 100);

    if (totalFails > 0) {
      finalCalculatedGpa = 0;
      finalCalculatedGrade = `F${totalFails > 1 ? bn(totalFails) : ""}`;
    } else {
      finalCalculatedGpa = avgGpa;
      finalCalculatedGrade = getOverallGradeFromGpa(avgGpa);
    }
  }

  // Automatic fine: প্রতি A = ২০ টাকা এবং প্রতি ফেল = ৫০ টাকা
  const calculatedFine = totalAbsenceCount * 20 + totalFails * 50;
  const fineDisplay = fine !== undefined && fine !== null && fine !== "০০/-"
    ? fine
    : `${calculatedFine}.00৳`;

  // Top Student / ১ম স্থান details
  const topMarks = topStudent?.totalObtained ?? overall.classHighestTotal ?? overall.totalMarks;
  const topGrade = topStudent?.grade ?? "A+";
  const topGpa = topStudent?.gpa !== undefined ? topStudent.gpa : 5.0;

  // Format dates for comments
  const todayStr = new Date().toLocaleDateString("en-GB");
  const dateMH = teacherComments?.dateMH || todayStr;
  const dateRI = teacherComments?.dateRI || todayStr;

  const showCover = activeView === "BOOKLET" || activeView === "ALL";
  const showSheet = activeView === "SHEET" || activeView === "ALL";

  const tabCls = (on: boolean, color: string) =>
    `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
      on ? `${color} text-white shadow-xs` : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  // থিমভিত্তিক ব্যাকগ্রাউন্ড আর্টওয়ার্ক (সম্পূর্ণ সেলফ-কন্টেইন্ড ও নিখুঁত প্রিন্ট উপযোগী)
  const getBoxBgStyle = (boxType: "P1_LEFT" | "P1_RIGHT" | "P2"): React.CSSProperties => {
    if (bgTheme === "CLEAN") {
      return { backgroundColor: "#ffffff" };
    }
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
    // Default: FLORAL (যেমন PDF-এ রয়েছে)
    return {
      backgroundColor: "#fbfdfb",
      backgroundImage:
        boxType === "P2"
          ? "radial-gradient(circle at 95% 85%, rgba(240, 170, 160, 0.22) 0%, rgba(180, 220, 190, 0.18) 35%, transparent 60%)"
          : "radial-gradient(circle at 10% 10%, rgba(180, 225, 190, 0.25) 0%, transparent 45%), radial-gradient(circle at 90% 90%, rgba(245, 190, 180, 0.22) 0%, transparent 45%)",
    };
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-900 print:space-y-0">
      {/* কন্ট্রোল বার (প্রিন্টে লুকানো থাকবে) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
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
            <span>দুই পৃষ্ঠা একসাথে (প্রিন্ট মোড)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* ব্যাকগ্রাউন্ড থিম নির্বাচক */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs shadow-2xs">
            <Palette className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-bold text-slate-700 whitespace-nowrap">ডিজাইন ব্যাকগ্রাউন্ড:</span>
            <select
              value={bgTheme}
              onChange={(e) => setBgTheme(e.target.value as BgTheme)}
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

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition"
          >
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট / PDF সেভ করুন (A4 Landscape)</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          পৃষ্ঠা ১: কভার পেজ (১০০০% পিক্সেল পারফেক্ট)
          ========================================================= */}
      {showCover && (
        <div className="a4-page mx-auto">
          <div className="page1-container">
            {/* বাম ভাজ */}
            <div className="p1-left-box relative" style={getBoxBgStyle("P1_LEFT")}>
              {/* ব্যাকগ্রাউন্ড কর্নার ফ্লোরাল ওয়াটারমার্ক */}
              {bgTheme === "FLORAL" && (
                <div className="pointer-events-none absolute -top-4 -left-4 h-36 w-36 opacity-30">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 90 Q30 30 90 10" stroke="#2e7d32" strokeWidth="2.5" />
                    <circle cx="35" cy="45" r="7" fill="#e57373" />
                    <circle cx="55" cy="30" r="8" fill="#81c784" />
                    <circle cx="75" cy="18" r="6" fill="#f06292" />
                    <path d="M35 45 Q45 20 60 25" stroke="#388e3c" strokeWidth="1.5" />
                  </svg>
                </div>
              )}

              <div className="content-layer">
                <div>
                  {/* শিক্ষকের মন্তব্য (MH) */}
                  <div className="separate-box">
                    <div className="box-header-title">শিক্ষকের মন্তব্য (MH):</div>
                    <div className="comment-text">
                      {teacherComments?.comment1 || "আরো ভালো করা উচিত ছিল"}
                    </div>
                    <div className="sig-date-row">
                      <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                        তারিখ: {dateMH}
                      </span>
                      {/* ন্যাচারাল পেন-স্ট্রোক সিগনেচার (স্বচ্ছ ব্যাকগ্রাউন্ড, কোনো সাদা বক্স ছাড়া) */}
                      <div className="sig-img-box !bg-transparent border-b border-dashed border-slate-600">
                        <svg
                          className="h-[26px] w-[75px] text-[#1e3a5f]"
                          style={{ mixBlendMode: "multiply", background: "transparent" }}
                          viewBox="0 0 95 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M 6,20 Q 22,5 34,21 T 58,10 T 78,16" />
                          <path d="M 24,12 Q 46,2 62,15" />
                          <path d="M 50,18 Q 66,24 88,14" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* শিক্ষকের মন্তব্য (RI) */}
                  <div className="separate-box">
                    <div className="box-header-title">শিক্ষকের মন্তব্য (RI):</div>
                    <div className="comment-text">
                      {teacherComments?.comment2 || "পরীক্ষায় অনুপস্থিত থাকা অন্যায়"}
                    </div>
                    <div className="sig-date-row">
                      <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                        তারিখ: {dateRI}
                      </span>
                      {/* ন্যাচারাল পেন-স্ট্রোক সিগনেচার (স্বচ্ছ ব্যাকগ্রাউন্ড) */}
                      <div className="sig-img-box !bg-transparent border-b border-dashed border-slate-600">
                        <svg
                          className="h-[26px] w-[75px] text-[#1e3a5f]"
                          style={{ mixBlendMode: "multiply", background: "transparent" }}
                          viewBox="0 0 95 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="48" cy="16" r="12" strokeWidth="1.5" />
                          <path d="M 37,23 L 44,9 L 55,9 Q 60,9 60,15 Q 60,20 52,20 L 44,20" />
                          <path d="M 51,20 L 59,27" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* অভিভাবকের মন্তব্য */}
                  <div className="parent-comment-box">
                    <div className="box-header-title">অভিভাবকের মন্তব্য:</div>
                    <div className="parent-lines-container">
                      <div className="parent-line" />
                      <div className="parent-line" />
                      <div className="parent-line" />
                      <div className="parent-line" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="quote-pill">
                    "মুহাম্মাদ (সা:) বলেন, তোমার নিজের জন্য তোমার পরিশ্রমই উত্তম" – সহিহ বুখারি, ২০২৭
                  </div>
                  {/* পাণ্ডিত্য প্রকাশন — স্পষ্ট ও বড় লোগো এরিয়া */}
                  <div className="brand-logo-area py-1">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-4xl font-black tracking-tight text-[#0d3b66]"
                          style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}
                        >
                          পাণ্ডিত্য
                        </span>
                        <span className="rounded-lg bg-[#0d3b66] px-2.5 py-1 text-lg font-bold text-white shadow-xs">
                          প্রকাশন
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] font-bold tracking-widest text-slate-700">
                        মুখস্থ নয়, মেধা অন্বেষণ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ডান ভাজ */}
            <div className="p1-right-box relative" style={getBoxBgStyle("P1_RIGHT")}>
              {/* ব্যাকগ্রাউন্ড কর্নার ফ্লোরাল ওয়াটারমার্ক */}
              {bgTheme === "FLORAL" && (
                <div className="pointer-events-none absolute -bottom-4 -right-4 h-36 w-36 opacity-30">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M90 10 Q70 70 10 90" stroke="#2e7d32" strokeWidth="2.5" />
                    <circle cx="65" cy="55" r="7" fill="#e57373" />
                    <circle cx="45" cy="70" r="8" fill="#81c784" />
                    <circle cx="25" cy="82" r="6" fill="#f06292" />
                  </svg>
                </div>
              )}

              <div className="content-layer">
                <div>
                  {/* বিজ্ঞান পণ্ডিত — বড় ও আকর্ষণীয় অফিশিয়াল লোগো (স্ক্রিনশটের মতো ১০০% নিখুঁত) */}
                  <div className="main-logo-area pt-1 pb-1">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="বিজ্ঞান পণ্ডিত লোগো"
                        className="max-h-[140px] w-auto object-contain mx-auto filter drop-shadow-md"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative inline-flex items-center justify-center">
                          <span
                            className="text-5xl sm:text-6xl font-black tracking-tight text-[#1b5e20]"
                            style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}
                          >
                            বিজ্ঞান
                          </span>
                          <span
                            className="ml-2 text-5xl sm:text-6xl font-black tracking-tight text-[#e65100]"
                            style={{ fontFamily: "Kalpurush, Hind Siliguri, sans-serif" }}
                          >
                            পণ্ডিত
                          </span>
                          {/* Tutor Center ব্যাজ */}
                          <span className="absolute -top-3 -right-14 rounded-full bg-[#d32f2f] px-2.5 py-0.5 text-[11px] font-black uppercase text-white shadow-sm tracking-wider">
                            Tutor Center
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13px] font-bold text-slate-700 tracking-wide">
                          সঠিক দিকনির্দেশনাই সাফল্যের চাবিকাঠি
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="sub-address">
                    সজীব ভিলা (সলঙ্গা রোড), বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ
                  </div>
                  <br />
                  <div className="card-badge">রেজাল্ট কার্ড</div>
                  <br />

                  <div className="month-year-pill">
                    <span>
                      মাসঃ <strong>{monthName}</strong>
                    </span>
                    <span>
                      বছরঃ <strong>{yearStr}</strong>
                    </span>
                  </div>

                  <div className="student-info-box">
                    <div style={{ textDecoration: "underline", marginBottom: "6px" }}>
                      শিক্ষার্থীর তথ্য
                    </div>
                    <div>
                      <strong>শিক্ষার্থীর নাম :</strong> {studentName}
                    </div>
                    <div>
                      <strong>শ্রেণী :</strong> {studentClass} | <strong>শাখা :</strong> {shakha}
                    </div>
                    <div>
                      <strong>রোল :</strong> {studentRoll}
                    </div>
                  </div>
                </div>

                <div className="quote-pill">
                  "মানুষ তাই পাবে, যা সে চেষ্টা করে" – (সূরা আল নাজম, ৩৯)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          পৃষ্ঠা ২: রেজাল্ট বিবরণী (১০০০% পিক্সেল পারফেক্ট)
          ========================================================= */}
      {showSheet && (
        <div className="a4-page mx-auto">
          <div className="page2-container relative" style={getBoxBgStyle("P2")}>
            {/* পেজ ২ ব্যাকগ্রাউন্ড আর্ট: নিচে ডানে স্টুডেন্ট ও বইয়ের প্যাস্টেল আর্ট (যেমন PDF এ রয়েছে) */}
            {bgTheme === "FLORAL" && (
              <div className="pointer-events-none absolute bottom-1 right-36 h-28 w-44 opacity-25">
                <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* বইয়ের স্তূপ ও পেন্সিল পট */}
                  <rect x="20" y="70" width="70" height="12" rx="2" fill="#81c784" />
                  <rect x="25" y="56" width="60" height="12" rx="2" fill="#64b5f6" />
                  <rect x="30" y="42" width="50" height="12" rx="2" fill="#ffb74d" />
                  <path d="M100 80 L115 35 L125 40 L110 85 Z" fill="#e57373" />
                  <circle cx="130" cy="50" r="14" fill="#ba68c8" />
                </svg>
              </div>
            )}

            <div className="content-layer">
              <div>
                {/* টাইটেল: লাল ভরাট বৃত্ত সহ */}
                <div className="sheet-title">
                  <span className="red-bullet">{mode === "MONTHLY" ? "●" : "○"}</span> মাসিক /{" "}
                  <span className="red-bullet">{mode === "MODEL" ? "●" : "○"}</span> মডেল টেস্ট /{" "}
                  <span className="red-bullet">{mode === "ANNUAL" ? "●" : "○"}</span> বাৎসরিক রেজাল্ট শীট – {yearStr}
                </div>

                {/* মাস সিলেকশন বার */}
                <div className="month-selection-display">
                  মাস:{" "}
                  {MONTHS_BN.map((m, idx) => {
                    const isCurrent = mode === "MONTHLY" && idx + 1 === monthNum;
                    return (
                      <React.Fragment key={m}>
                        <span className={`month-item ${isCurrent ? "active font-bold" : ""}`}>
                          {m}
                        </span>
                        {idx < MONTHS_BN.length - 1 ? " / " : ""}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* রেজাল্ট টেবিল: উপস্থিতি সহ সব কলাম নিশ্চিত */}
                <table className="result-table">
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }}>শিক্ষক</th>
                      <th style={{ width: "22%" }}>বিষয়</th>
                      <th style={{ width: "9%" }}>উপস্থিতি</th>
                      <th>মোট নম্বর</th>
                      <th className="bg-orange">সর্বোচ্চ নম্বর</th>
                      <th>প্রাপ্ত নম্বর</th>
                      <th>গ্রেড</th>
                      <th>GPA (5.00)</th>
                      <th className="bg-purple" style={{ width: "12%" }}>১ম স্থান</th>
                      <th>মোট প্রাপ্ত নম্বর</th>
                      <th>মোট গ্রেড</th>
                      <th>মোট GPA (5.00)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTeacherList.map((tGroup, tIdx) => {
                      return tGroup.subjects.map((sub, sIdx) => {
                        const isGlobalFirst = tIdx === 0 && sIdx === 0;
                        const att = sub.attendance || (sub.obtained === 0 && sub.grade === "F" ? "A1" : "P");

                        return (
                          <tr key={`t-${tIdx}-s-${sub.subjectId}-${sIdx}`}>
                            {/* শিক্ষক নাম (Vertical RTL rotated) */}
                            {sIdx === 0 && (
                              <td
                                rowSpan={tGroup.subjects.length}
                                className="teacher-col"
                              >
                                {tGroup.teacherName}
                                <br />({tGroup.teacherShort})
                              </td>
                            )}

                            {/* বিষয় */}
                            <td style={{ textAlign: "left", paddingLeft: "8px" }} className="bold-txt">
                              {sub.subjectName} {sub.isFourth ? "(৪র্থ)" : ""}
                            </td>

                            {/* উপস্থিতি কলাম (P / An) — স্পষ্ট ও নিশ্চিত */}
                            <td className="bold-txt" style={{ textAlign: "center" }}>
                              {att.startsWith("A") ? (
                                <span className="text-red-600 font-bold">{att}</span>
                              ) : (
                                <span className="text-emerald-700 font-bold">{att}</span>
                              )}
                            </td>

                            {/* মোট নম্বর */}
                            <td className="bold-txt">{sub.totalMarks}</td>

                            {/* সর্বোচ্চ নম্বর (হালকা হলুদ/অরেঞ্জ) */}
                            <td className="bg-orange bold-txt">{sub.classHighest}</td>

                            {/* প্রাপ্ত নম্বর */}
                            <td className="bold-txt">
                              {sub.obtained !== undefined && sub.obtained !== null ? sub.obtained : "-"}
                            </td>

                            {/* গ্রেড */}
                            <td className={`bold-txt ${sub.grade === "F" ? "text-red-600 font-bold" : ""}`}>
                              {sub.grade}
                            </td>

                            {/* GPA */}
                            <td className="bold-txt">{fmtGpa(sub.gpa)}</td>

                            {/* ডান পাশের সামগ্রিক কলামগুলো (rowSpan = সব বিষয়ের সমষ্টি) */}
                            {isGlobalFirst && (
                              <>
                                {/* ১ম স্থান (হালকা পার্পল/ল্যাভেন্ডার) */}
                                <td rowSpan={subjects.length} className="bg-purple bold-txt">
                                  নম্বর: {topMarks}
                                  <br />
                                  গ্রেড: {topGrade}
                                  <br />
                                  GPA: {fmtGpa(topGpa)}
                                </td>

                                {/* মোট প্রাপ্ত নম্বর */}
                                <td rowSpan={subjects.length} className="bold-txt">
                                  {totalGotMarks}/{totalTotMarks}
                                </td>

                                {/* মোট গ্রেড */}
                                <td rowSpan={subjects.length} className="bold-txt">
                                  {totalFails > 0 ? (
                                    <span className="text-red-600 font-bold">
                                      F{totalFails > 1 ? bn(totalFails) : ""}
                                    </span>
                                  ) : (
                                    finalCalculatedGrade
                                  )}
                                </td>

                                {/* মোট GPA */}
                                <td rowSpan={subjects.length} className="bold-txt">
                                  {totalFails > 0 ? "0.00" : fmtGpa(finalCalculatedGpa)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              {/* ফুটার সামারি ও স্বাক্ষর ব্লক */}
              <div className="footer-summary">
                <div className="signature-area">
                  {/* ডিরেক্টরের স্বাক্ষর — ২৮px সাইজ, স্বচ্ছ ব্যাকগ্রাউন্ড */}
                  <div className="sig-box">
                    <div className="sig-box-img !bg-transparent">
                      {activeSignatureUrl ? (
                        <img
                          src={activeSignatureUrl}
                          alt="Director Sig"
                          className="max-h-[30px] w-auto max-w-[120px] object-contain"
                          style={{ mixBlendMode: "multiply", background: "transparent" }}
                        />
                      ) : (
                        <svg
                          className="h-[28px] w-[100px] text-[#1e3a5f]"
                          style={{ mixBlendMode: "multiply", background: "transparent" }}
                          viewBox="0 0 120 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M 12,23 Q 32,5 50,18 T 82,8 T 106,20" />
                          <path d="M 38,10 Q 64,2 88,14" />
                        </svg>
                      )}
                    </div>
                    <div className="sig-box-title">
                      <strong>ডিরেক্টরের স্বাক্ষর</strong>
                      <br />
                      <span style={{ fontSize: "10px", color: "#333" }}>
                        ({directorName} - {directorTitle})
                      </span>
                    </div>
                  </div>

                  {/* অভিভাবকের স্বাক্ষর */}
                  <div className="sig-box">
                    <div className="sig-box-img !bg-transparent" />
                    <div className="sig-box-title" style={{ marginTop: "auto" }}>
                      <strong>অভিভাবকের স্বাক্ষর</strong>
                    </div>
                  </div>
                </div>

                {/* অবস্থান ও জরিমানা বাক্স */}
                <div className="summary-box">
                  <div>
                    <span>অবস্থানঃ</span> <strong>{position || "১ম"}</strong>
                  </div>
                  <div>
                    <span>জরিমানাঃ</span> <strong>{fineDisplay}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* প্রিন্ট নির্দেশনা */}
      <div className="no-print text-center text-xs text-slate-500">
        💡 টিপস: প্রিন্ট ডায়ালগে <b>A4</b>, <b>Landscape</b>, <b>Margins: None</b> এবং <b>Background graphics</b> টিক দিন —
        ২ পৃষ্ঠার (কভার + রেজাল্ট শিট) নিখুঁত পিডিএফ প্রিন্ট হবে।
      </div>
    </div>
  );
}
