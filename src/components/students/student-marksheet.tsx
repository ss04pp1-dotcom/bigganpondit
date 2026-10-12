"use client";

import React, { useRef } from "react";
import { Printer, GraduationCap, Award, BookOpen, CheckCircle, FileText, Check } from "lucide-react";
import { ReportHeader } from "@/components/app/report-header";
import { StudentAvatar } from "@/components/app/student-avatar";
import { PrintSignatures } from "@/components/app/print-signatures";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  bn,
  classLabel,
  divisionLabel,
  fmtGpa,
  fmtNum,
  fmtPct,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface StudentMarksheetSubject {
  subjectId: number;
  subjectName: string;
  teacherName?: string | null;
  teacherShortName?: string | null;
  totalMarks: number;
  obtained: number;
  classHighest: number;
  grade: string;
  gpa: number;
  isFourth?: boolean;
  attendance?: string;
}

export interface StudentMarksheetProps {
  title: string;
  sessionText: string;
  student: {
    name: string;
    roll: number;
    className: string;
    division?: string | null;
    section?: string | null;
    photoKey?: string | null;
    username?: string;
  };
  subjects: StudentMarksheetSubject[];
  overall: {
    totalMarks: number;
    obtained: number;
    percentage: number;
    gpa: number;
    grade: string;
  };
  position?: number;
  directorInfo?: {
    name?: string | null;
    title?: string | null;
    signatureUrl?: string | null;
    institution?: string | null;
  };
  academyName: string;
  logoUrl: string | null;
}

export function StudentMarksheet({
  title,
  sessionText,
  student,
  subjects,
  overall,
  position,
  directorInfo,
  academyName,
  logoUrl,
}: StudentMarksheetProps) {
  function handlePrint() {
    window.print();
  }

  const isPassed = overall.grade !== "F";

  return (
    <div className="space-y-4">
      {/* অ্যাকশন বার (প্রিন্টে লুকানো থাকবে) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <p className="text-[11px] text-slate-500">
              {student.name} • {classLabel(student.className)} • {sessionText}
            </p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 shadow-xs"
        >
          <Printer className="h-4 w-4" />
          মার্কশিট প্রিন্ট করুন (A4)
        </Button>
      </div>

      {/* মূল একাডেমিক মার্কশিট (A4 Portrait Print Optimized) */}
      <Card className="print-area overflow-hidden border border-slate-300 bg-white shadow-sm">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* ইনজেক্টেড প্রিন্ট স্টাইল — নিখুঁত A4 Portrait পেপার নিশ্চিত করে */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 10mm 12mm 10mm 12mm;
                  }
                  body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: #fff !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .print-area {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .print-avoid-break {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                }
              `,
            }}
          />

          {/* ১. একাডেমি হেডার */}
          <ReportHeader
            academyName={academyName}
            logoUrl={logoUrl}
            subtitle={`${title} — ${sessionText}`}
          />

          {/* ২. শিক্ষার্থীর তথ্য বক্স */}
          <div className="print-avoid-break flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-4">
              <StudentAvatar photoKey={student.photoKey} name={student.name} size="xl" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900">{student.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
                  <span>শ্রেণি: <b>{classLabel(student.className)}</b></span>
                  {student.division && (
                    <span>• বিভাগ: <b>{divisionLabel(student.division)}</b></span>
                  )}
                  {student.section && (
                    <span>• শাখা: <b>{student.section}</b></span>
                  )}
                  <span>• রোল: <b>{bn(student.roll)}</b></span>
                  {student.username && (
                    <span className="font-mono text-slate-500">• @{student.username}</span>
                  )}
                </div>
              </div>
            </div>

            {/* সার্বিক ফলাফলের সংক্ষিপ্ত ব্যাজ */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  ফলাফল
                </span>
                <p className={cn("text-base font-extrabold", isPassed ? "text-emerald-700" : "text-rose-600")}>
                  {isPassed ? "উত্তীর্ণ (PASSED)" : "অনুত্তীর্ণ (FAILED)"}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-lg shadow-xs">
                {overall.grade}
              </div>
            </div>
          </div>

          {/* ৩. বিষয়ভিত্তিক নম্বর ও গ্রেড টেবিল */}
          <div className="print-avoid-break overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 text-[12px] border-y border-slate-300">
                  <th className="border border-slate-300 px-3 py-2 text-center font-bold w-12">ক্র.</th>
                  <th className="border border-slate-300 px-3 py-2 text-left font-bold">বিষয়ের নাম</th>
                  <th className="border border-slate-300 px-3 py-2 text-right font-bold w-20">পূর্ণমান</th>
                  <th className="border border-slate-300 px-3 py-2 text-right font-bold w-24">প্রাপ্ত নম্বর</th>
                  <th className="border border-slate-300 px-3 py-2 text-right font-bold w-20">সর্বোচ্চ</th>
                  <th className="border border-slate-300 px-3 py-2 text-center font-bold w-20">লেটার গ্রেড</th>
                  <th className="border border-slate-300 px-3 py-2 text-center font-bold w-20">জিপিএ (GPA)</th>
                  <th className="border border-slate-300 px-3 py-2 text-center font-bold w-20">উপস্থিতি</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                      কোনো ফলাফল রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => (
                    <tr
                      key={s.subjectId || idx}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        s.attendance === "A1" || s.attendance === "ABSENT" ? "bg-rose-50/40" : ""
                      )}
                    >
                      <td className="border border-slate-300 px-3 py-2 text-center font-medium text-slate-600">
                        {bn(idx + 1)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                        {s.subjectName}
                        {s.isFourth && (
                          <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            ৪র্থ বিষয়
                          </span>
                        )}
                        {s.teacherName && (
                          <span className="block text-[11px] font-normal text-slate-500">
                            শিক্ষক: {s.teacherName}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-slate-700">
                        {fmtNum(s.totalMarks)}
                      </td>
                      <td className={cn(
                        "border border-slate-300 px-3 py-2 text-right font-mono font-bold",
                        s.grade === "F" ? "text-rose-600" : "text-slate-900"
                      )}>
                        {fmtNum(s.obtained)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-slate-600">
                        {fmtNum(s.classHighest)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-center">
                        <span className={cn(
                          "inline-block rounded px-2 py-0.5 text-[11px] font-bold",
                          s.grade === "A+" && "bg-emerald-100 text-emerald-800",
                          s.grade === "A" && "bg-blue-100 text-blue-800",
                          s.grade === "A-" && "bg-cyan-100 text-cyan-800",
                          s.grade === "B" && "bg-indigo-100 text-indigo-800",
                          s.grade === "C" && "bg-amber-100 text-amber-800",
                          s.grade === "D" && "bg-orange-100 text-orange-800",
                          s.grade === "F" && "bg-rose-100 text-rose-800"
                        )}>
                          {s.grade}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-mono font-bold text-slate-800">
                        {fmtGpa(s.gpa)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-center text-xs">
                        {s.attendance === "A1" || s.attendance === "ABSENT" ? (
                          <span className="font-bold text-rose-600">অনুপস্থিত</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">উপস্থিত</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="border border-slate-300 px-3 py-2.5 text-right">
                    সর্বমোট প্রাপ্ত ফলাফল:
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-mono">
                    {fmtNum(overall.totalMarks)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-blue-700">
                    {fmtNum(overall.obtained)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-xs text-slate-500">
                    শতকরা {fmtPct(overall.percentage)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-sm font-extrabold text-blue-800">
                    {overall.grade}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-extrabold text-blue-800">
                    {fmtGpa(overall.gpa)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">
                    {isPassed ? "উত্তীর্ণ" : "অনুত্তীর্ণ"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ৪. সারসংক্ষেপ ও গ্রেডিং স্কেল নির্দেশিকা */}
          <div className="print-avoid-break grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* ফলাফল সামারি কার্ড */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                সার্বিক ফলাফল মূল্যায়ন
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[11px]">মোট প্রাপ্ত নম্বর</span>
                  <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                    {fmtNum(overall.obtained)} / {fmtNum(overall.totalMarks)}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[11px]">অর্জিত শতকরা</span>
                  <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                    {fmtPct(overall.percentage)}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[11px]">সার্বিক জিপিএ (GPA)</span>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                    {fmtGpa(overall.gpa)}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <span className="text-slate-500 text-[11px]">মেধা স্থান (র‍্যাংক)</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {position !== undefined ? `${bn(position)} তম` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* স্ট্যান্ডার্ড গ্রেডিং স্কেল টেবিল */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                গ্রেডিং স্কেল (Grading System)
              </h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-center text-[10px] sm:text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="py-1 px-1.5">নম্বর ব্যাপ্তি</th>
                      <th className="py-1 px-1.5">গ্রেড</th>
                      <th className="py-1 px-1.5">জিপিএ</th>
                      <th className="py-1 px-1.5">মূল্যায়ন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td>৮০–১০০%</td><td className="font-bold text-emerald-700">A+</td><td>৫.০০</td><td>অসাধারণ</td></tr>
                    <tr><td>৭০–৭৯%</td><td className="font-bold text-blue-700">A</td><td>৪.০০</td><td>খুব ভালো</td></tr>
                    <tr><td>৬০–৬৯%</td><td className="font-bold text-cyan-700">A-</td><td>৩.৫০</td><td>ভালো</td></tr>
                    <tr><td>৫০–৫৯%</td><td className="font-bold text-indigo-700">B</td><td>৩.০০</td><td>সন্তোষজনক</td></tr>
                    <tr><td>৪০–৪৯%</td><td className="font-bold text-amber-700">C</td><td>২.০০</td><td>চলতিমান</td></tr>
                    <tr><td>৩৩–৩৯%</td><td className="font-bold text-orange-700">D</td><td>১.০০</td><td>উত্তীর্ণ</td></tr>
                    <tr><td>০–৩২%</td><td className="font-bold text-rose-700">F</td><td>০.০০</td><td>অনুত্তীর্ণ</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ৫. স্বাক্ষর ও সিল অংশ */}
          <PrintSignatures
            directorName={directorInfo?.name || "পরিচালক"}
            directorSignatureUrl={directorInfo?.signatureUrl}
            directorInstitution={directorInfo?.institution}
            showGuardian={true}
            className="mt-8"
          />
        </CardContent>
      </Card>
    </div>
  );
}
