"use client";

import React, { useState } from "react";
import { Printer, FileText, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { MONTHS_BN, bn, classLabel, divisionLabel, fmtGpa, fmtNum } from "@/lib/constants";

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
}

export interface OfficialResultCardProps {
  mode?: "MONTHLY" | "ANNUAL";
  month?: number;
  year?: number;
  student: {
    name: string;
    roll: number;
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
  teacherComments?: {
    comment1?: string;
    comment2?: string;
    guardianComment?: string;
  };
  defaultTab?: "SHEET" | "BOOKLET" | "ALL";
}

export function OfficialResultCard({
  mode = "MONTHLY",
  month = 10,
  year = new Date().getFullYear(),
  student,
  subjects = [],
  overall,
  position,
  fine = "০০/-",
  directorInfo,
  teacherComments,
  defaultTab = "SHEET",
}: OfficialResultCardProps) {
  const [activeView, setActiveView] = useState<"SHEET" | "BOOKLET" | "ALL">(defaultTab);

  const curYear = year;
  const yearSuffix = String(curYear).slice(-2);
  const monthName = MONTHS_BN[month - 1] ?? "অক্টোবর";

  // Group subjects by teacher
  const teacherGroups: {
    teacherName: string;
    teacherShortName: string;
    subjects: OfficialSubjectRow[];
  }[] = [];

  const teacherMap = new Map<string, { shortName: string; subs: OfficialSubjectRow[] }>();

  for (const s of subjects) {
    const tName = s.teacherName || "মেহেদী হাসান";
    const tShort = s.teacherShortName || "MH";
    if (!teacherMap.has(tName)) {
      teacherMap.set(tName, { shortName: tShort, subs: [] });
    }
    teacherMap.get(tName)!.subs.push(s);
  }

  // If no teacher mapping exists or empty, create a fallback realistic grouping
  if (teacherMap.size === 0 && subjects.length > 0) {
    teacherGroups.push({
      teacherName: "মেহেদী হাসান",
      teacherShortName: "MH",
      subjects,
    });
  } else {
    for (const [tName, data] of teacherMap.entries()) {
      teacherGroups.push({
        teacherName: tName,
        teacherShortName: data.shortName,
        subjects: data.subs,
      });
    }
  }

  // Calculate total rows for right-side summary rowSpan
  const totalSubjectRows = subjects.length;
  // Pad with blank rows to reach at least 7 rows for authentic physical sheet look
  const blankRowsCount = Math.max(0, 7 - totalSubjectRows);

  const directorName = directorInfo?.name || "ডাঃ মোঃ শাহিন";
  const directorTitle = directorInfo?.institution ? `-${directorInfo.institution}` : "-এম.বি.বি.এস, রামেক";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-900">
      {/* Interactive Tabs & Print Controls (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveView("SHEET")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
              activeView === "SHEET"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>অফিশিয়াল রেজাল্ট শিট (১০০% আসল লেআউট)</span>
          </button>
          <button
            onClick={() => setActiveView("BOOKLET")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
              activeView === "BOOKLET"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>রেজাল্ট কার্ড কভার ও মন্তব্য পৃষ্ঠা</span>
          </button>
          <button
            onClick={() => setActiveView("ALL")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
              activeView === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>উভয় অংশ একসাথে (বুকলেট প্রিন্ট)</span>
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Printer className="h-4 w-4" />
          <span>প্রিন্ট করুন (A4 — হুবহু অফিশিয়াল কপি)</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: OFICIAL RESULT SHEET (Image 1 Bottom - Tabular Result Sheet)
          ========================================================================= */}
      {(activeView === "SHEET" || activeView === "ALL") && (
        <div className="official-result-sheet print-page mx-auto w-full max-w-[850px] overflow-hidden rounded-md border-[2.5px] border-slate-900 bg-[#edf6ed] p-3 sm:p-5 shadow-md print:m-0 print:w-full print:max-w-none print:border-[2px] print:border-black print:p-4 print:shadow-none">
          
          {/* Header Title */}
          <div className="text-center">
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900">
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-black ${mode === "MONTHLY" ? "bg-black" : "bg-transparent"}`} />
                <span>মাসিক</span>
              </span>
              <span className="mx-2">/</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-black ${mode === "ANNUAL" ? "bg-black" : "bg-transparent"}`} />
                <span>বাৎসরিক রেজাল্ট শিট — ২০</span>
                <span className="inline-block border-b border-dotted border-black min-w-[36px] text-center font-bold">
                  {bn(yearSuffix)}
                </span>
              </span>
            </h2>
            <div className="mx-auto mt-1 h-[1.5px] w-4/5 bg-slate-400" />
          </div>

          {/* Month Strip */}
          <div className="mt-2 text-center text-[11px] sm:text-[12px] font-bold text-slate-900">
            <span className="mr-1">মাসঃ</span>
            {MONTHS_BN.map((mName, idx) => {
              const isSelected = idx + 1 === month;
              return (
                <React.Fragment key={mName}>
                  <span
                    className={`inline-block px-1 py-0.5 transition ${
                      isSelected
                        ? "rounded border-[1.5px] border-slate-900 bg-white font-extrabold shadow-xs"
                        : "text-slate-800"
                    }`}
                  >
                    {mName}
                  </span>
                  {idx < MONTHS_BN.length - 1 && <span className="mx-0.5 text-slate-500">/</span>}
                </React.Fragment>
              );
            })}
          </div>

          {/* Student Info Bar (Added for clean reference print) */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-400 pb-1.5 text-[11px] sm:text-[12px] font-semibold text-slate-800">
            <div>
              <span>শিক্ষার্থীর নাম: </span>
              <span className="font-bold text-slate-950">{student.name}</span>
            </div>
            <div>
              <span>শ্রেণি: </span>
              <span className="font-bold text-slate-950">{classLabel(student.className)}</span>
              {student.division && <span> ({divisionLabel(student.division)})</span>}
              {student.section && <span> | শাখা: {student.section}</span>}
            </div>
            <div>
              <span>রোল: </span>
              <span className="font-bold text-slate-950">{bn(student.roll)}</span>
            </div>
          </div>

          {/* Main Table Matching Image 1 Exactly */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse border-[1.5px] border-slate-900 text-center text-[11px] sm:text-[12px]">
              <thead>
                <tr className="bg-[#e2ede2] font-bold text-slate-950">
                  <th className="border border-slate-900 px-2 py-2 w-[110px]">শিক্ষক</th>
                  <th className="border border-slate-900 px-2 py-2 w-[130px]">বিষয়</th>
                  <th className="border border-slate-900 px-1.5 py-2 w-[70px]">মোট নম্বর</th>
                  <th className="border border-slate-900 px-1.5 py-2 w-[85px] leading-tight">সর্বোচ্চ প্রাপ্ত নম্বর</th>
                  <th className="border border-slate-900 px-1.5 py-2 w-[75px] leading-tight">প্রাপ্ত নম্বর</th>
                  <th className="border border-slate-900 px-1 py-2 w-[55px]">গ্রেড</th>
                  <th className="border border-slate-900 px-1 py-2 w-[70px] leading-tight">GPA (5.00)</th>
                  
                  {/* Summary Columns Header on the right */}
                  <th className="border border-slate-900 px-1.5 py-2 w-[80px] bg-[#fbf2e6] leading-tight">সর্বোচ্চ প্রাপ্ত নম্বর</th>
                  <th className="border border-slate-900 px-1.5 py-2 w-[80px] bg-[#fbf2e6] leading-tight">মোট প্রাপ্ত নম্বর</th>
                  <th className="border border-slate-900 px-1 py-2 w-[55px] bg-[#fbf2e6] leading-tight">মোট গ্রেড</th>
                  <th className="border border-slate-900 px-1.5 py-2 w-[75px] bg-[#fbf2e6] leading-tight">মোট GPA (5.00)</th>
                </tr>
              </thead>
              <tbody>
                {teacherGroups.map((group, groupIdx) => {
                  return group.subjects.map((sub, subIdx) => {
                    const isFirstEverRow = groupIdx === 0 && subIdx === 0;
                    const totalRowsSpan = totalSubjectRows + blankRowsCount;

                    return (
                      <tr key={`sub-${sub.subjectId}-${subIdx}`} className="bg-white/70 hover:bg-white transition-colors">
                        {/* Teacher Cell (Spans all subjects of this teacher) */}
                        {subIdx === 0 && (
                          <td
                            rowSpan={group.subjects.length}
                            className="border border-slate-900 px-2 py-2 font-bold text-slate-950 align-middle bg-[#f5faf5]"
                          >
                            <div>{group.teacherName}</div>
                            {group.teacherShortName && (
                              <div className="text-[10px] text-slate-600">({group.teacherShortName})</div>
                            )}
                          </td>
                        )}

                        {/* Subject Name */}
                        <td className="border border-slate-900 px-2 py-1.5 text-left font-semibold text-slate-900">
                          {sub.subjectName}
                          {sub.isFourth && (
                            <span className="ml-1 rounded bg-violet-100 px-1 py-0.2 text-[9px] text-violet-700">৪র্থ</span>
                          )}
                        </td>

                        {/* Total Marks */}
                        <td className="border border-slate-900 px-1.5 py-1.5 font-medium">
                          {bn(sub.totalMarks)}
                        </td>

                        {/* Class Highest */}
                        <td className="border border-slate-900 px-1.5 py-1.5 font-medium text-slate-700">
                          {bn(sub.classHighest)}
                        </td>

                        {/* Obtained */}
                        <td className="border border-slate-900 px-1.5 py-1.5 font-bold text-slate-950">
                          {bn(sub.obtained)}
                        </td>

                        {/* Grade */}
                        <td className="border border-slate-900 px-1 py-1.5 font-bold text-slate-900">
                          {sub.grade}
                        </td>

                        {/* GPA */}
                        <td className="border border-slate-900 px-1 py-1.5 font-bold text-slate-900">
                          {fmtGpa(sub.gpa)}
                        </td>

                        {/* Right Summary Columns (Rendered ONCE spanning all subject rows) */}
                        {isFirstEverRow && (
                          <>
                            <td
                              rowSpan={totalRowsSpan}
                              className="border border-slate-900 px-2 py-4 align-middle bg-[#fff7ed] text-center font-bold text-slate-900 text-sm sm:text-base"
                            >
                              <div>{bn(overall.classHighestTotal || overall.totalMarks)}</div>
                              <div className="mt-4 border-b border-dotted border-slate-400 w-3/4 mx-auto" />
                            </td>
                            <td
                              rowSpan={totalRowsSpan}
                              className="border border-slate-900 px-2 py-4 align-middle bg-[#fff7ed] text-center font-bold text-slate-950 text-sm sm:text-base"
                            >
                              <div>{bn(overall.obtained)}</div>
                              <div className="mt-4 border-b border-dotted border-slate-400 w-3/4 mx-auto" />
                            </td>
                            <td
                              rowSpan={totalRowsSpan}
                              className="border border-slate-900 px-1 py-4 align-middle bg-[#fff7ed] text-center font-extrabold text-slate-950 text-sm sm:text-base"
                            >
                              <div>{overall.grade}</div>
                              <div className="mt-4 border-b border-dotted border-slate-400 w-3/4 mx-auto" />
                            </td>
                            <td
                              rowSpan={totalRowsSpan}
                              className="border border-slate-900 px-2 py-4 align-middle bg-[#fff7ed] text-center font-extrabold text-blue-700 text-sm sm:text-base"
                            >
                              <div>{fmtGpa(overall.gpa)}</div>
                              <div className="mt-4 border-b border-dotted border-slate-400 w-3/4 mx-auto" />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}

                {/* Extra blank rows as seen in physical printed Image 1 */}
                {Array.from({ length: blankRowsCount }).map((_, i) => (
                  <tr key={`blank-row-${i}`} className="bg-white/70 h-8">
                    <td className="border border-slate-900 px-2 py-1.5 bg-[#f5faf5]" />
                    <td className="border border-slate-900 px-2 py-1.5" />
                    <td className="border border-slate-900 px-1.5 py-1.5" />
                    <td className="border border-slate-900 px-1.5 py-1.5" />
                    <td className="border border-slate-900 px-1.5 py-1.5" />
                    <td className="border border-slate-900 px-1 py-1.5" />
                    <td className="border border-slate-900 px-1 py-1.5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Section: Signatures on Left, Position & Fine on Right */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            
            {/* Left: Director & Guardian Signature Boxes */}
            <div className="flex flex-1 flex-wrap items-end gap-6 sm:gap-10">
              
              {/* Director Signature (Point 08 Compliance) */}
              <div className="min-w-[200px] text-center">
                <div className="h-12 flex items-end justify-center mb-1">
                  {directorInfo?.signatureUrl ? (
                    <img
                      src={directorInfo.signatureUrl}
                      alt="ডিরেক্টরের স্বাক্ষর"
                      className="max-h-12 max-w-[180px] object-contain"
                    />
                  ) : (
                    // Authentic calligraphic digital signature stroke matching Image 1
                    <svg className="w-36 h-10 text-slate-800" viewBox="0 0 160 40" fill="none" stroke="currentColor">
                      <path d="M10 28 C 30 10, 45 35, 70 15 C 90 2, 110 38, 145 20 C 130 35, 115 35, 95 32" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M40 25 L 140 25" strokeWidth="1.2" strokeDasharray="3 3" />
                    </svg>
                  )}
                </div>
                <div className="border-t border-slate-900 pt-1 text-[11px] sm:text-[12px] font-bold text-slate-950">
                  ডিরেক্টরের স্বাক্ষর ({directorName} {directorTitle})
                </div>
              </div>

              {/* Guardian Signature */}
              <div className="min-w-[140px] text-center">
                <div className="h-12 border-b border-dotted border-slate-400" />
                <div className="border-t border-slate-900 pt-1 text-[11px] sm:text-[12px] font-bold text-slate-950">
                  অভিভাবকের স্বাক্ষর
                </div>
              </div>
            </div>

            {/* Right: Position & Fine boxes (Image 1 Bottom Right) */}
            <div className="w-[160px] sm:w-[190px] space-y-1.5 text-[11px] sm:text-[12px]">
              <div className="flex items-center justify-between border-[1.5px] border-slate-900 bg-white px-2.5 py-1">
                <span className="font-bold text-slate-950">অবস্থানঃ</span>
                <span className="font-extrabold text-blue-700 text-sm">
                  {position ? (typeof position === "number" ? `${bn(position)}` : position) : "১ম"}
                </span>
              </div>
              <div className="flex items-center justify-between border-[1.5px] border-slate-900 bg-white px-2.5 py-1">
                <span className="font-bold text-slate-950">জরিমানাঃ</span>
                <span className="font-semibold text-slate-800">{fine}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          SECTION 2: OFFICIAL RESULT CARD BOOKLET (Image 1 Top - Front & Back Covers)
          ========================================================================= */}
      {(activeView === "BOOKLET" || activeView === "ALL") && (
        <div className="official-result-booklet print-page mx-auto w-full max-w-[850px] overflow-hidden rounded-md border-[2.5px] border-slate-900 bg-[#fdfbf7] p-3 sm:p-5 shadow-md print:m-0 print:w-full print:max-w-none print:border-[2px] print:border-black print:p-4 print:shadow-none">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* -------------------------------------------------------------
                LEFT HALF: COMMENTS & QUOTES (Image 1 Top Left)
                ------------------------------------------------------------- */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] p-4 sm:p-5 relative shadow-xs">
              <div className="space-y-4">
                
                {/* Teacher Comment 1 */}
                <div className="rounded-lg border border-sky-200 bg-[#e0f2fe]/80 p-3 shadow-xs">
                  <div className="text-[12px] font-bold text-sky-950">শিক্ষকের মন্তব্য-০১:</div>
                  <div className="mt-1 space-y-2 text-[12px] text-slate-700">
                    <div className="border-b border-dashed border-sky-300 pb-0.5 min-h-[18px]">
                      {teacherComments?.comment1 || "নিয়মিত ক্লাসে উপস্থিতি ও গণিতে মনোযোগ বৃদ্ধি করতে হবে।"}
                    </div>
                    <div className="border-b border-dashed border-sky-300 min-h-[16px]" />
                    <div className="border-b border-dashed border-sky-300 min-h-[16px]" />
                  </div>
                </div>

                {/* Teacher Comment 2 */}
                <div className="rounded-lg border border-emerald-200 bg-[#dcfce7]/80 p-3 shadow-xs">
                  <div className="text-[12px] font-bold text-emerald-950">শিক্ষকের মন্তব্য-০২:</div>
                  <div className="mt-1 space-y-2 text-[12px] text-slate-700">
                    <div className="border-b border-dashed border-emerald-300 pb-0.5 min-h-[18px]">
                      {teacherComments?.comment2 || "বিজ্ঞান ও রসায়ন বিষয়ে ফলাফল সন্তোষজনক, ধারাবাহিকতা বজায় রাখো।"}
                    </div>
                    <div className="border-b border-dashed border-emerald-300 min-h-[16px]" />
                    <div className="border-b border-dashed border-emerald-300 min-h-[16px]" />
                  </div>
                </div>

                {/* Guardian Comment */}
                <div className="rounded-lg border border-amber-200 bg-[#ffedd5]/80 p-3 shadow-xs">
                  <div className="text-[12px] font-bold text-amber-950">অভিভাবকের মন্তব্য:</div>
                  <div className="mt-1 space-y-2 text-[12px] text-slate-700">
                    <div className="border-b border-dashed border-amber-300 pb-0.5 min-h-[18px]">
                      {teacherComments?.guardianComment || "বাসায় প্রতিদিন পড়ার টেবিলে নিয়মিত সময় দিচ্ছে।"}
                    </div>
                    <div className="border-b border-dashed border-amber-300 min-h-[16px]" />
                    <div className="border-b border-dashed border-amber-300 min-h-[16px]" />
                  </div>
                </div>

              </div>

              {/* Bottom Hadith Quote & Publisher Emblem */}
              <div className="mt-6 pt-3 border-t border-slate-300/80 text-center">
                <p className="text-[11px] sm:text-[12px] font-semibold text-slate-800 italic">
                  “মুহাম্মাদ (সাঃ) বলেন, তোমার নিজের জন্য তোমার পরিশ্রমই উত্তম” — সহিহ বুখারি, ২০২৭
                </p>

                {/* Publisher Logo Matching Image 1 */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="h-6 w-6 rounded bg-[#0d6efd] text-white flex items-center justify-center font-bold text-xs">
                    প্র
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[13px] font-extrabold text-[#084298]">দীপ্ত প্রকাশন</span>
                    <span className="block text-[9px] font-semibold text-slate-500">মুখস্থ নয়, মেধা অন্বেষণ</span>
                  </div>
                </div>
              </div>

            </div>

            {/* -------------------------------------------------------------
                RIGHT HALF: FRONT COVER & STUDENT INFO (Image 1 Top Right)
                ------------------------------------------------------------- */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-gradient-to-b from-[#fefbf6] to-[#faf5ee] p-4 sm:p-5 relative shadow-xs">
              
              {/* Top Page Number Badge */}
              <div className="absolute top-3 left-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow-xs">
                {student.bookNo ? bn(student.bookNo) : "১৫১"}
              </div>

              {/* Branding Section */}
              <div className="text-center pt-2">
                <div className="flex items-center justify-center gap-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    <span className="text-[#059669]">বিজ্ঞান </span>
                    <span className="text-[#ea580c]">পণ্ডিত</span>
                  </h1>
                  <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                    Tutor Center ✍️
                  </span>
                </div>
                
                {/* Slogan Pill */}
                <div className="mt-1 inline-block rounded-full bg-[#064e3b] px-3 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  সঠিক দিকনির্দেশনাই সাফল্যের চাবিকাঠি
                </div>

                {/* Address */}
                <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-600">
                  সঞ্জীব ভিলা (সিলভা রোড), বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ
                </p>

                {/* Green Glossy Button "রেজাল্ট কার্ড" */}
                <div className="mt-3">
                  <span className="inline-block rounded-lg bg-gradient-to-r from-[#059669] to-[#10b981] px-5 py-1.5 text-sm sm:text-base font-extrabold text-white shadow-md border border-[#047857]">
                    রেজাল্ট কার্ড
                  </span>
                </div>

                {/* Month & Year Bar */}
                <div className="mt-3 rounded-xl border border-slate-400 bg-white/90 py-1.5 px-4 text-[12px] font-bold text-slate-900 shadow-2xs">
                  <span>মাসঃ </span>
                  <span className="border-b border-dotted border-black min-w-[50px] inline-block font-extrabold text-[#059669]">
                    {monthName}
                  </span>
                  <span className="ml-4">বছরঃ ২০</span>
                  <span className="border-b border-dotted border-black min-w-[30px] inline-block font-extrabold">
                    {bn(yearSuffix)}
                  </span>
                </div>
              </div>

              {/* Student Information Card with Header Tab */}
              <div className="mt-4 rounded-xl border-[1.5px] border-emerald-600 bg-[#edf8f1] p-3 pt-4 relative shadow-xs">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-3.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  শিক্ষার্থীর তথ্য
                </div>
                <div className="space-y-2 text-[12px] font-semibold text-slate-900">
                  <div className="flex items-center">
                    <span className="w-24 shrink-0 text-slate-700">শিক্ষার্থীর নাম :</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-slate-950 pb-0.5">
                      {student.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 shrink-0 text-slate-700">শ্রেণী :</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-slate-950 pb-0.5">
                      {classLabel(student.className)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 shrink-0 text-slate-700">শাখা :</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-slate-950 pb-0.5">
                      {student.division ? divisionLabel(student.division) : student.section || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 shrink-0 text-slate-700">রোল :</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-slate-950 pb-0.5">
                      {bn(student.roll)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quranic Ayat at Bottom */}
              <div className="mt-4 text-center">
                <p className="text-[11px] sm:text-[12px] font-semibold text-slate-800 italic">
                  “ মানুষ তাই পাবে, যা সে চেষ্টা করে ” — (সূরা আন নাজম, ৩৯)
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Print Note */}
      <div className="no-print text-center text-xs text-slate-500">
        💡 টিপস: আপনি ব্রাউজারের প্রিন্ট ডায়ালগে <b>A4</b> পেপার সাইজ এবং <b>Background graphics</b> টিক দিয়ে রাখলে হুবহু রঙিন প্রিন্ট পাবেন।
      </div>
    </div>
  );
}
