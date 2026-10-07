"use client";

import React, { useState, useEffect } from "react";
import { Printer, FileText, BookOpen, Layers } from "lucide-react";
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
}

export interface DirectorOption {
  id: number;
  name: string;
  institution?: string | null;
  signatureUrl?: string | null;
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
  availableDirectors?: DirectorOption[];
  selectedDirectorId?: number | null | "BOTH";
  onDirectorChange?: (directorId: number | "BOTH") => void;
  logoUrl?: string | null;
  academyName?: string | null;
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
  availableDirectors,
  selectedDirectorId,
  onDirectorChange,
  logoUrl,
  academyName,
  teacherComments,
  defaultTab = "ALL",
}: OfficialResultCardProps) {
  const [activeView, setActiveView] = useState<"SHEET" | "BOOKLET" | "ALL">(defaultTab);

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
      ? `- ${activeDirector.institution}`
      : "- এম.বি.বি.এস, রামেক"
    : directorInfo?.institution
      ? `- ${directorInfo.institution}`
      : "- এম.বি.বি.এস, রামেক";
  
  // ডাইনামিক সিগনেচার হ্যান্ডলিং 
  const activeSignatureUrl = activeDirector ? activeDirector.signatureUrl : directorInfo?.signatureUrl;

  const yearSuffix = String(year).slice(-2);
  const monthName = MONTHS_BN[month - 1] ?? "অক্টোবর";

  // Group subjects by teacher
  const teacherGroups: {
    teacherName: string;
    teacherShortName: string;
    subjects: OfficialSubjectRow[];
  }[] = [];
  const teacherMap = new Map<string, { shortName: string; subs: OfficialSubjectRow[] }>();

  for (const s of subjects) {
    const tName = s.teacherName || "";
    const tShort = s.teacherShortName || "";
    if (!teacherMap.has(tName)) {
      teacherMap.set(tName, { shortName: tShort, subs: [] });
    }
    teacherMap.get(tName)!.subs.push(s);
  }

  for (const [tName, data] of teacherMap.entries()) {
    teacherGroups.push({
      teacherName: tName,
      teacherShortName: data.shortName,
      subjects: data.subs,
    });
  }

  // =========================================================================
  // DYNAMIC SCALING LOGIC (বিষয় বাড়লে যাতে A4 পেজের বাইরে না যায়)
  // =========================================================================
  const minRows = 8; 
  const actualRows = subjects.length;
  const gapRows = teacherGroups.length > 1 ? teacherGroups.length - 1 : 0;
  const totalDataRows = actualRows + gapRows;
  
  const displayRowCount = Math.max(minRows, totalDataRows);
  const blankRowsCount = displayRowCount - totalDataRows;
  const totalRowsSpan = displayRowCount;

  // টেবিলের বডির জন্য মোট 85mm জায়গা বরাদ্দ। বিষয় বাড়লে সে অনুযায়ী উচ্চতা ও ফন্ট কমবে।
  const baseHeightMm = 85; 
  const rowHeightMm = baseHeightMm / displayRowCount;
  const gapHeightMm = Math.min(2.2, rowHeightMm * 0.25);
  
  const scaleRatio = minRows / displayRowCount;
  const baseFontSize = Math.max(10, 14 * scaleRatio); // ফন্ট সাইজ ১০ এর নিচে নামবে না
  const subFontSize = Math.max(11, 15 * scaleRatio);

  return (
    <div 
      className="rc-container w-full flex flex-col items-center gap-4 bg-[#cfd4da] min-h-screen p-4 font-sans print:p-0 print:bg-white print:block"
      style={{
        '--row-h': `${rowHeightMm}mm`,
        '--gap-h': `${gapHeightMm}mm`,
        '--font-base': `${baseFontSize}px`,
        '--font-sub': `${subFontSize}px`,
      } as React.CSSProperties}
    >
      
      {/* ----------------- ইনজেক্টেড CSS (শুধুমাত্র এই কম্পোনেন্টের জন্য) ----------------- */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.rawgit.com/mahfuzm/bangla-fonts/master/kalpurush/kalpurush.css');
        .rc-container * { font-family: 'Kalpurush', 'Hind Siliguri', sans-serif; box-sizing: border-box; }
        
        .rc-page { width: 297mm; height: 210mm; background: #fff; padding: 5mm; position: relative; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,.25); margin: 0 auto; }
        .rc-fill { flex: 1; border-bottom: 1.4px dotted #333; height: 1em; min-width: 10px; }
        .rc-dl { border-bottom: 1.4px dotted #333; height: 9mm; }

        /* Cover Page */
        .rc-cover { display: flex; gap: 6mm; height: 100%; }
        .rc-half { flex: 1; border: 2px solid #222; padding: 5mm; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg,#dbeaf8 0%,#fff 38%,#fbe4e4 72%,#f8d9e0 100%); }
        .rc-cbox { border: 1px solid #444; border-radius: 3px; padding: 2mm 3mm; margin-bottom: 5mm; }
        .rc-cbox.b1 { background: #d9eaf6; } .rc-cbox.b2 { background: #e2eed6; } .rc-cbox.b3 { background: #fbe2d2; }
        .rc-cbox .t { display: flex; align-items: flex-end; gap: 2mm; font-weight: bold; font-size: 14px; }
        .rc-cbox .t u { white-space: nowrap; }
        .rc-pill { border: 1.5px solid #333; border-radius: 20px; background: rgba(255,255,255,.9); text-align: center; font-size: 11.5px; padding: 2mm 4mm; font-weight: 600; }
        .rc-brand { height: 38mm; display: flex; align-items: center; justify-content: center; }
        .rc-right { align-items: center; text-align: center; position: relative; }
        .rc-tag { position: absolute; top: -1px; left: -1px; background: #111; color: #ffd400; font-weight: bold; font-size: 13px; padding: 1mm 3mm; border-radius: 0 0 6px 0; }
        
        /* Logo Styles */
        .rc-logo { margin-top: 12mm; height: 34mm; display: flex; align-items: center; justify-content: center; }
        .rc-logo img { max-height: 100%; max-width: 180px; object-fit: contain; }
        .rc-logo h1 { font-size: 46px; color: #1b7a2f; letter-spacing: 1px; margin:0; }
        
        .rc-tagline { font-size: 11px; font-weight: 600; text-align: left; width: 100%; }
        .rc-addr { border: 1.5px solid #222; border-radius: 8px; background: rgba(255,255,255,.9); font-size: 11px; font-weight: bold; padding: 1.5mm 4mm; display: inline-block; margin-top: 1mm; }
        .rc-badge { margin-top: 8mm; display: inline-block; background: linear-gradient(#2fa14a,#157a2e); color: #fff; font-size: 24px; font-weight: bold; padding: 3mm 12mm; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 3px 6px rgba(0,0,0,.35); }
        .rc-my { margin: 9mm auto 0; width: 92%; border: 1.5px solid #222; border-radius: 20px; background: #fbe9dc; display: flex; justify-content: space-between; padding: 1.5mm 8mm; font-weight: bold; font-size: 13px; }
        .rc-info-wrap { width: 92%; margin: 8mm auto 0; position: relative; }
        .rc-info-tab { position: absolute; top: -8mm; left: 50%; transform: translateX(-50%); background: #e5efd4; border: 1.5px solid #333; border-bottom: none; border-radius: 16px 16px 0 0; padding: 1mm 9mm; font-weight: bold; font-size: 13px; }
        .rc-info { background: #e5efd4; border: 1.5px solid #333; border-radius: 14px; padding: 4mm 5mm; display: flex; flex-direction: column; gap: 3mm; }
        .rc-row { display: flex; align-items: flex-end; gap: 2mm; font-weight: bold; font-size: 15px; }
        .rc-row b { width: 30mm; text-align: left; }

        /* Sheet Page */
        .rc-sheet { height: 100%; border: 2.5px solid #555; background: #e4edd6; padding: 4mm 6mm; display: flex; flex-direction: column; }
        .rc-stitle { margin: 0 2mm; border-top: 1.5px solid #888; border-bottom: 1.5px solid #888; background: rgba(255,255,255,.35); text-align: center; font-size: 24px; font-weight: bold; padding: 1mm 0; }
        .rc-stitle .rc-dots { display: inline-block; width: 22mm; border-bottom: 1.4px dotted #333; }
        .rc-months { text-align: center; font-weight: bold; font-size: 13px; margin: 2.5mm 0; }
        .rc-table { width: 100%; border-collapse: collapse; text-align: center; font-weight: bold; font-size: var(--font-base); }
        .rc-table th, .rc-table td { border: 1.5px solid #222; background: #e4edd6; padding: 1mm; }
        .rc-table th { background: #fff; font-size: 14px; line-height: 1.25; height: 16mm; }
        
        /* DYNAMIC SCALING FOR TABLE ROWS */
        .rc-table tbody td { height: var(--row-h); font-size: var(--font-base); }
        .rc-table td.rc-sub { background: #fff; font-size: var(--font-sub); }
        .rc-table td.rc-teacher { background: #e4edd6; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; font-size: var(--font-base); line-height: 1.3; }
        .rc-table .rc-sp { width: 2mm; padding: 0; border-top: none; border-bottom: none; background: #fff; }
        .rc-table tr.rc-gap td { height: var(--gap-h); padding: 0; border-left: none; border-right: none; background: #fff; }
        .rc-table tr.rc-gap td:first-child { border-left: 1.5px solid #222; }
        
        /* Right Side Summary Cells */
        .rc-table td.rc-top { background: #e9e9e9; border-top: none; vertical-align: middle; }
        .rc-table td.rc-peach { background: #fbe2d2; border-top: none; vertical-align: middle; }
        .rc-summary-val { font-size: calc(var(--font-base) + 3px); font-weight: 800; }
        .rc-table .rc-dd { border-bottom: 1.4px dotted #333; width: 80%; margin: 6px auto 0 auto; }
        .rc-table th.rc-pk { background: #fbe2d2; }

        /* Footer */
        .rc-foot { margin-top: auto; display: flex; gap: 6mm; align-items: flex-end; height: 34mm; }
        .rc-sigbox { flex: 1; border-top: 1.5px solid #222; border-left: 1.5px solid #222; border-right: 1.5px solid #222; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; text-align: center; font-weight: bold; font-size: 12px; position: relative; }
        .rc-sigbox .rc-line { border-top: 1.5px solid #222; padding: 1mm; }
        .rc-sigbox img { position: absolute; bottom: 8mm; left: 50%; transform: translateX(-50%); max-height: 18mm; max-width: 90%; object-fit: contain; }
        .rc-sumcol { width: 58mm; display: flex; flex-direction: column; gap: 2mm; height: 100%; justify-content: flex-end; }
        .rc-sumcol div { background: #fff; border: 1.5px solid #222; height: 13mm; display: flex; align-items: center; justify-content: space-between; padding: 0 3mm; font-weight: bold; font-size: 16px; }

        /* Advanced Responsive Zooming for Screens */
        @media screen and (max-width: 1250px) { .rc-page { zoom: 0.65; } }
        @media screen and (max-width: 900px) { .rc-page { zoom: 0.45; } }
        @media screen and (max-width: 600px) { .rc-page { zoom: 0.32; } }
        
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body, html { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .rc-page { box-shadow: none; zoom: 1 !important; width: 297mm; height: 209mm; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .rc-page:last-child { page-break-after: auto; }
        }
      `}} />

      {/* ----------------- Top Controls (No Print) ----------------- */}
      <div className="no-print w-full max-w-[297mm] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm z-10">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveView("BOOKLET")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${activeView === "BOOKLET" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <BookOpen className="h-4 w-4" /> কভার পৃষ্ঠা
          </button>
          <button onClick={() => setActiveView("SHEET")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${activeView === "SHEET" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <FileText className="h-4 w-4" /> রেজাল্ট শিট
          </button>
          <button onClick={() => setActiveView("ALL")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${activeView === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <Layers className="h-4 w-4" /> একসাথে উভয় পৃষ্ঠা
          </button>
        </div>

        <div className="flex items-center gap-3">
          {availableDirectors && availableDirectors.length > 1 && (
            <select
              value={String(activeDirectorId)}
              onChange={(e) => {
                const val = e.target.value === "BOTH" ? "BOTH" : Number(e.target.value);
                setActiveDirectorId(val);
                onDirectorChange?.(val);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none"
            >
              {availableDirectors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition">
            <Printer className="h-4 w-4" /> ল্যান্ডস্কেপ প্রিন্ট
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 print:gap-0">
        
        {/* ======================= PAGE 1: COVER ======================= */}
        {(activeView === "BOOKLET" || activeView === "ALL") && (
          <div className="rc-page">
            <div className="rc-cover">
              {/* Left Half: Comments */}
              <div className="rc-half">
                <div>
                  <div className="rc-cbox b1">
                    <div className="t"><u>শিক্ষকের মন্তব্য-০১:</u><span className="rc-fill"></span></div>
                    <div className="rc-dl">{teacherComments?.comment1 || ""}</div><div className="rc-dl"></div><div className="rc-dl"></div>
                  </div>
                  <div className="rc-cbox b2">
                    <div className="t"><u>শিক্ষকের মন্তব্য-০২:</u><span className="rc-fill"></span></div>
                    <div className="rc-dl">{teacherComments?.comment2 || ""}</div><div className="rc-dl"></div><div className="rc-dl"></div>
                  </div>
                  <div className="rc-cbox b3">
                    <div className="t"><u>অভিভাবকের মন্তব্য:</u><span className="rc-fill"></span></div>
                    <div className="rc-dl">{teacherComments?.guardianComment || ""}</div><div className="rc-dl"></div><div className="rc-dl"></div>
                  </div>
                </div>
                <div>
                  <div className="rc-pill">“মুহাম্মাদ (সঃ) বলেন, তোমার নিজের জন্য তোমার পরিশ্রমই উত্তম” – সহিহ বুখারি, ২০২৭</div>
                  <div className="rc-brand">
                    <b style={{ color: '#1a4f9c', fontSize: '26px' }}>পাণ্ডিত্য প্রকাশন</b>
                  </div>
                </div>
              </div>

              {/* Right Half: Student Info & Branding */}
              <div className="rc-half rc-right">
                <div className="rc-tag">{student.bookNo ? bn(student.bookNo) : "১৫১"}</div>
                <div style={{ width: '100%' }}>
                  <div className="rc-logo">
                    {/* লোগো থাকলে লোগো দেখাবে, না থাকলে টেক্সট */}
                    {logoUrl ? <img src={logoUrl} alt="Academy Logo" /> : <h1>{academyName || "বিজ্ঞান পণ্ডিত"}</h1>}
                  </div>
                  <div className="rc-tagline">সঠিক দিকনির্দেশনাই সাফল্যের চাবিকাঠি</div>
                  <div className="rc-addr">সজীব ভিলা (সলঙ্গা রোড), বোয়ালিয়া বাজার, উল্লাপাড়া, সিরাজগঞ্জ</div><br />
                  <div className="rc-badge">রেজাল্ট কার্ড</div>
                  <div className="rc-my">
                    <span>মাসঃ {monthName}</span>
                    <span>বছরঃ ২০{bn(yearSuffix)}</span>
                  </div>
                  
                  <div className="rc-info-wrap">
                    <div className="rc-info-tab">শিক্ষার্থীর তথ্য</div>
                    <div className="rc-info">
                      <div className="rc-row"><b>শিক্ষার্থীর নাম</b>:<span className="rc-fill text-center font-extrabold">{student.name}</span></div>
                      <div className="rc-row"><b>শ্রেণী</b>:<span className="rc-fill text-center font-extrabold">{classLabel(student.className)}</span></div>
                      <div className="rc-row"><b>শাখা</b>:<span className="rc-fill text-center font-extrabold">{student.division ? divisionLabel(student.division) : student.section || "—"}</span></div>
                      <div className="rc-row"><b>রোল</b>:<span className="rc-fill text-center font-extrabold">{bn(student.roll)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="rc-pill" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11px' }}>
                  “মানুষ তাই পাবে, যা সে চেষ্টা করে” – (সূরা আল নাজম, ৩৯)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= PAGE 2: RESULT SHEET ======================= */}
        {(activeView === "SHEET" || activeView === "ALL") && (
          <div className="rc-page">
            <div className="rc-sheet">
              
              <div className="rc-stitle">
                {mode === "MONTHLY" ? "●" : "○"}মাসিক / {mode === "ANNUAL" ? "●" : "○"}বাৎসরিক রেজাল্ট শিট – ২০
                <span className="rc-dots">{bn(yearSuffix)}</span>
              </div>
              <div className="rc-months">
                মাসঃ জানুয়ারী / ফেব্রুয়ারী / মার্চ / এপ্রিল / মে / জুন / জুলাই / আগস্ট / সেপ্টেম্বর / অক্টোবর / নভেম্বর / ডিসেম্বর
              </div>

              <table className="rc-table">
                <thead>
                  <tr>
                    <th style={{ width: '7%' }}>শিক্ষক</th>
                    <th style={{ width: '20%' }}>বিষয়</th>
                    <th>মোট নম্বর</th>
                    <th>সর্বোচ্চ<br />প্রাপ্ত নম্বর</th>
                    <th>প্রাপ্ত<br />নম্বর</th>
                    <th>গ্রেড</th>
                    <th>GPA<br />(5.00)</th>
                    <th className="rc-sp"></th>
                    <th>সর্বোচ্চ<br />প্রাপ্ত নম্বর</th>
                    <th className="rc-pk">মোট প্রাপ্ত<br />নম্বর</th>
                    <th className="rc-pk">মোট<br />গ্রেড</th>
                    <th className="rc-pk">মোট GPA<br />(5.00)</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherGroups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {group.subjects.map((sub, sIdx) => {
                        const isFirstEverRow = gIdx === 0 && sIdx === 0;
                        return (
                          <tr key={sub.subjectId}>
                            {/* Teacher Column (Spans rows) */}
                            {sIdx === 0 && (
                              <td className="rc-teacher" rowSpan={group.subjects.length}>
                                {group.teacherName} {group.teacherShortName ? `(${group.teacherShortName})` : ""}
                              </td>
                            )}
                            
                            <td className="rc-sub">
                              {sub.subjectName} {sub.isFourth && <span style={{ fontSize: '10px' }}>(৪র্থ)</span>}
                            </td>
                            <td>{bn(sub.totalMarks)}</td>
                            <td>{bn(sub.classHighest)}</td>
                            <td>{bn(sub.obtained)}</td>
                            <td>{sub.grade}</td>
                            <td>{fmtGpa(sub.gpa)}</td>

                            {/* Right side summary (Spans ALL rows including gaps) */}
                            {isFirstEverRow && (
                              <>
                                <td className="rc-sp" rowSpan={totalRowsSpan}></td>
                                <td className="rc-top" rowSpan={totalRowsSpan}>
                                  <div className="rc-summary-val">{bn(overall.classHighestTotal || overall.totalMarks)}</div>
                                  <div className="rc-dd"></div>
                                </td>
                                <td className="rc-peach" rowSpan={totalRowsSpan}>
                                  <div className="rc-summary-val">{bn(overall.obtained)}</div>
                                  <div className="rc-dd"></div>
                                </td>
                                <td className="rc-peach" rowSpan={totalRowsSpan}>
                                  <div className="rc-summary-val">{overall.grade}</div>
                                  <div className="rc-dd"></div>
                                </td>
                                <td className="rc-peach" rowSpan={totalRowsSpan}>
                                  <div className="rc-summary-val text-blue-700">{fmtGpa(overall.gpa)}</div>
                                  <div className="rc-dd"></div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      
                      {/* Gap row between teachers */}
                      {gIdx < teacherGroups.length - 1 && (
                        <tr className="rc-gap">
                          <td colSpan={7}></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Blank rows if subjects are less */}
                  {Array.from({ length: blankRowsCount }).map((_, i) => (
                    <tr key={`blank-${i}`}>
                      {i === 0 && teacherGroups.length === 0 && <td className="rc-teacher" rowSpan={blankRowsCount}></td>}
                      <td className="rc-sub"></td>
                      <td></td><td></td><td></td><td></td><td></td>
                      {teacherGroups.length === 0 && i === 0 && (
                         <>
                           <td className="rc-sp" rowSpan={blankRowsCount}></td>
                           <td className="rc-top" rowSpan={blankRowsCount}><div className="rc-dd"></div></td>
                           <td className="rc-peach" rowSpan={blankRowsCount}><div className="rc-dd"></div></td>
                           <td className="rc-peach" rowSpan={blankRowsCount}><div className="rc-dd"></div></td>
                           <td className="rc-peach" rowSpan={blankRowsCount}><div className="rc-dd"></div></td>
                         </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer / Signatures */}
              <div className="rc-foot">
                <div className="rc-sigbox">
                  {/* সিগনেচার প্রপস থেকে ডাইনামিক্যালি আসবে */}
                  {activeSignatureUrl && <img src={activeSignatureUrl} alt="Director Sign" />}
                  <div className="rc-line">ডিরেক্টরের স্বাক্ষর ({directorName} {directorTitle})</div>
                </div>
                <div className="rc-sigbox">
                  <div className="rc-line">অভিভাবকের স্বাক্ষর</div>
                </div>
                <div className="rc-sumcol">
                  <div><span>অবস্থানঃ</span> <span className="text-blue-700">{position ? (typeof position === "number" ? bn(position) : position) : ""}</span></div>
                  <div><span>জরিমানাঃ</span> <span className="text-red-600">{fine}</span></div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
