"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Printer,
  Search,
  Award,
  Loader2,
  FileText,
  CalendarRange,
  Users,
  CheckCircle2,
  Building2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASS_NUMBERS, MONTHS_BN, bn, classLabel } from "@/lib/constants";
import {
  OfficialResultCard,
  type DirectorOption,
} from "@/components/app/official-result-card";

interface StudentOption {
  id: number;
  name: string;
  roll: number;
}

interface CardData {
  student: {
    id: number;
    name: string;
    roll: number;
    className: string;
    division?: string | null;
    section?: string | null;
    bookNo?: string | number;
  };
  subjects: any[];
  overall: any;
  position?: number | string;
  fine?: number | string;
  topStudent?: {
    totalMarks?: number;
    totalObtained?: number;
    grade?: string;
    gpa?: number;
  };
  teacherComments?: {
    comment1?: string;
    comment2?: string;
    guardianComment?: string;
  };
}

export function AdminResultCardView() {
  const [mode, setMode] = useState<"MONTHLY" | "ANNUAL" | "MODEL">("MONTHLY");
  const [className, setClassName] = useState("10");
  const [division, setDivision] = useState("SCIENCE");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [studentId, setStudentId] = useState("all");

  const [loading, setLoading] = useState(false);
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [availableDirectors, setAvailableDirectors] = useState<DirectorOption[]>([]);
  const [selectedDirectorId, setSelectedDirectorId] = useState<number | "BOTH">(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState<string>("বিজ্ঞান পণ্ডিত একাডেমি");
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(null);
  const [publicationLogoUrl, setPublicationLogoUrl] = useState<string | null>(null);
  const [publicationName, setPublicationName] = useState<string>("বিজ্ঞান পণ্ডিত প্রকাশনী");
  const [previewIndex, setPreviewIndex] = useState(0);

  // Reset preview index when filters change
  useEffect(() => {
    setPreviewIndex(0);
  }, [mode, className, division, month, year, studentId]);

  const requiresDiv = className === "9" || className === "10";

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        mode: mode.toLowerCase(),
        class: className,
        month,
        year,
        studentId,
      });
      if (requiresDiv) p.set("division", division);

      const res = await fetch(`/api/admin/result-cards?${p.toString()}`);
      const json = await res.json();

      if (json.ok) {
        setCards(json.cards || []);
        setStudentsList(json.studentsList || []);
        setAvailableDirectors(json.availableDirectors || []);
        setLogoUrl(json.logoUrl || null);
        if (json.publicationLogoUrl !== undefined) setPublicationLogoUrl(json.publicationLogoUrl || null);
        if (json.publicationName) setPublicationName(json.publicationName);
        if (json.cardBgUrl !== undefined) setCardBgUrl(json.cardBgUrl);
        if (json.academyName) setAcademyName(json.academyName);

        // Keep or select first director if valid
        if (json.availableDirectors && json.availableDirectors.length > 0) {
          setSelectedDirectorId((prev) => {
            if (prev === "BOTH") return "BOTH";
            const exists = json.availableDirectors.some((d: any) => d.id === prev);
            return exists ? prev : json.availableDirectors[0].id;
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [mode, className, division, month, year, studentId, requiresDiv]);

  // Initial load
  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Controls (Hidden on Print) */}
      <Card className="no-print border-slate-200 shadow-xs">
        <CardContent className="pt-4 space-y-4">
          {/* Mode Switcher Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">ফলাফলের ধরন:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("MONTHLY")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    mode === "MONTHLY"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>মাসিক রেজাল্ট কার্ড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("MODEL")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    mode === "MODEL"
                      ? "bg-white text-purple-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>মডেল টেস্ট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("ANNUAL")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    mode === "ANNUAL"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>বাৎসরিক রেজাল্ট কার্ড</span>
                </button>
              </div>
            </div>

            {/* Quick Status / Logo & Signature Indicators */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {logoUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> আপলোডকৃত লোগো সক্রিয়
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  ডিফল্ট লোগো
                </span>
              )}
              {availableDirectors.length > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                  <Building2 className="h-3 w-3" /> {bn(availableDirectors.length)} জন পরিচালক নিবন্ধিত
                </span>
              )}
            </div>
          </div>

          {/* Filters Form Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            {/* Class */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">শ্রেণি</Label>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((c) => (
                    <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Division (Class 9 & 10) */}
            {requiresDiv && (
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">বিভাগ</Label>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCIENCE">বিজ্ঞান</SelectItem>
                    <SelectItem value="HUMANITIES">মানবিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Month (for Monthly and Model Test mode) */}
            {(mode === "MONTHLY" || mode === "MODEL") && (
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-700">মাস</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_BN.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Year */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">বছর</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[Number(year) + 1, Number(year), Number(year) - 1, Number(year) - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>{bn(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Selector */}
            <div className="space-y-1.5 col-span-2 sm:col-span-2">
              <Label className="text-[12px] font-semibold text-slate-700">শিক্ষার্থী নির্বাচন</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">👥 সকল শিক্ষার্থী (একসাথে সব প্রিন্ট)</SelectItem>
                  {studentsList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} — রোল {bn(s.roll)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Director Signature Selector */}
            <div className="space-y-1.5 col-span-2 sm:col-span-3">
              <Label className="text-[12px] font-semibold text-slate-700">
                স্বাক্ষর নির্বাচন {availableDirectors.length > 1 ? `(${bn(availableDirectors.length)} জন পাওয়া গেছে)` : ""}
              </Label>
              <Select
                value={String(selectedDirectorId)}
                onValueChange={(val) => setSelectedDirectorId(val === "BOTH" ? "BOTH" : Number(val))}
              >
                <SelectTrigger className="h-10 bg-white font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableDirectors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} {d.institution ? `(${d.institution})` : "(পরিচালক)"}
                    </SelectItem>
                  ))}
                  {availableDirectors.length > 1 && (
                    <SelectItem value="BOTH">
                      🤝 উভয় পরিচালকের যৌথ স্বাক্ষর (পাশাপাশি ২টি স্বাক্ষর)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-2 col-span-2 sm:col-span-3">
              <Button
                type="button"
                className="h-10 flex-1 gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold"
                onClick={fetchCards}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                খুঁজুন
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handlePrint}
                disabled={loading || cards.length === 0}
              >
                <Printer className="h-4 w-4" />
                {cards.length > 1 ? `সব কার্ড প্রিন্ট (${bn(cards.length)})` : "প্রিন্ট করুন"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="no-print flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm font-semibold">রেজাল্ট কার্ডের তথ্য তৈরি হচ্ছে…</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && cards.length === 0 && (
        <Card className="no-print">
          <CardContent className="py-14 text-center text-slate-500">
            <FileText className="mx-auto h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800">কোনো রেজাল্ট কার্ড পাওয়া যায়নি</h3>
            <p className="mt-1 text-xs text-slate-500">
              নির্বাচিত শ্রেণি বা মাসে কোনো নম্বর যুক্ত করা হয়নি অথবা শিক্ষার্থী পাওয়া যায়নি।
            </p>
          </CardContent>
        </Card>
      )}

      {/* Render Cards */}
      {!loading && cards.length > 0 && (() => {
        const safeIndex = Math.min(Math.max(0, previewIndex), Math.max(0, cards.length - 1));
        const currentCard = cards[safeIndex];

        return (
          <div className="space-y-4 print:space-y-0 print:m-0 print:p-0">
            {/* Batch Preview & Print Navigation Bar (Hidden on Print) */}
            {cards.length > 1 && (
              <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs">
                    <Users className="h-3.5 w-3.5" />
                    সকল শিক্ষার্থী ({bn(cards.length)} জন)
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    স্ক্রিন প্রিভিউ: কার্ড <b className="text-emerald-800">{bn(safeIndex + 1)}</b> / {bn(cards.length)}
                  </span>
                  {currentCard && (
                    <span className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800">
                      {currentCard.student.name} — রোল: {bn(currentCard.student.roll)}
                    </span>
                  )}
                </div>

                {/* Switcher & Batch Print */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={safeIndex === 0}
                    className="h-8 gap-1 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    পূর্ববর্তী
                  </Button>

                  {/* Jump selector */}
                  <Select
                    value={String(safeIndex)}
                    onValueChange={(val) => setPreviewIndex(Number(val))}
                  >
                    <SelectTrigger className="h-8 w-44 bg-white text-xs font-semibold">
                      <SelectValue placeholder="কার্ড নির্বাচন..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 text-xs">
                      {cards.map((c, i) => (
                        <SelectItem key={c.student.id} value={String(i)}>
                          {bn(i + 1)}. {c.student.name} (রোল {bn(c.student.roll)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                    disabled={safeIndex === cards.length - 1}
                    className="h-8 gap-1 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    পরবর্তী
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Cards List: On screen ONLY 1 card is displayed; for print ALL cards are printed! */}
            <div className="space-y-0 print:space-y-0 print:m-0 print:p-0">
              {cards.map((card, idx) => {
                const isPreview = idx === safeIndex;
                const isLastCard = idx === cards.length - 1;
                return (
                  <div
                    key={`card-${card.student.id}-${idx}`}
                    className={isPreview ? "block print:block" : "hidden print:block"}
                  >
                    <OfficialResultCard
                      mode={mode}
                      month={Number(month)}
                      year={Number(year)}
                      student={card.student}
                      subjects={card.subjects}
                      overall={card.overall}
                      position={card.position}
                      fine={card.fine}
                      topStudent={card.topStudent}
                      teacherComments={card.teacherComments}
                      availableDirectors={availableDirectors}
                      selectedDirectorId={selectedDirectorId}
                      onDirectorChange={(newDirId) => setSelectedDirectorId(newDirId)}
                      logoUrl={logoUrl}
                      publicationLogoUrl={publicationLogoUrl}
                      publicationName={publicationName}
                      academyName={academyName}
                      defaultTab="ALL"
                      cardBgUrl={cardBgUrl}
                      onCardBgChange={setCardBgUrl}
                      isLastCard={isLastCard}
                      hideCardControls={!isPreview}
                      isAdmin={true}
                      canPrint={true}
                      showPrintButton={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
