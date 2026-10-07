"use client";

import React from "react";

interface PrintSignaturesProps {
  directorName?: string | null;
  directorSignatureUrl?: string | null;
  directorInstitution?: string | null;
  teacherName?: string | null;
  teacherSignatureUrl?: string | null;
  teacherSubject?: string | null;
  isSingleTeacher?: boolean;
  showGuardian?: boolean;
  className?: string;
}

export function PrintSignatures({
  directorName = "পরিচালক",
  directorSignatureUrl,
  directorInstitution,
  teacherName,
  teacherSignatureUrl,
  teacherSubject,
  isSingleTeacher = false,
  showGuardian = true,
  className = "",
}: PrintSignaturesProps) {
  return (
    <div className={`print-avoid-break mt-6 pt-4 border-t border-slate-200/80 ${className}`}>
      <div className="flex items-end justify-between gap-4 text-center">
        {/* Guardian signature (optional) */}
        {showGuardian && (
          <div className="w-36 sm:w-44 text-center">
            <div className="h-12 border-b border-dashed border-slate-300" />
            <p className="pt-1.5 text-[11px] sm:text-xs text-slate-500 font-medium">অভিভাবকের স্বাক্ষর</p>
          </div>
        )}

        {/* Teacher signature (Included when single teacher subject result is printed) */}
        {isSingleTeacher && teacherName && (
          <div className="w-40 sm:w-48 text-center">
            <div className="h-12 flex items-end justify-center mb-1">
              {teacherSignatureUrl ? (
                <img
                  src={teacherSignatureUrl}
                  alt="শিক্ষকের স্বাক্ষর"
                  className="max-h-12 max-w-full object-contain mix-blend-multiply filter contrast-125 brightness-95"
                />
              ) : (
                <div className="w-full border-b border-dashed border-slate-300" />
              )}
            </div>
            <p className="border-t border-slate-800 pt-1 text-[12px] font-bold text-slate-900">
              {teacherName}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              {teacherSubject ? `বিষয় শিক্ষক (${teacherSubject})` : "বিষয় শিক্ষক"}
            </p>
          </div>
        )}

        {/* Director signature (Mandatory on all printed sheets per point 08) */}
        <div className="w-40 sm:w-48 text-center ml-auto">
          <div className="h-12 flex items-end justify-center mb-1">
            {directorSignatureUrl ? (
              <img
                src={directorSignatureUrl}
                alt="পরিচালকের স্বাক্ষর"
                className="max-h-12 max-w-full object-contain mix-blend-multiply filter contrast-125 brightness-95"
              />
            ) : (
              <div className="w-full border-b border-dashed border-slate-300" />
            )}
          </div>
          <p className="border-t border-slate-800 pt-1 text-[12px] font-bold text-slate-900">
            {directorName || "পরিচালক"}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
            পরিচালক — বিজ্ঞান পণ্ডিত একাডেমি
          </p>
          {directorInstitution && (
            <p className="text-[9px] text-slate-400 truncate max-w-xs">{directorInstitution}</p>
          )}
        </div>
      </div>
    </div>
  );
}
