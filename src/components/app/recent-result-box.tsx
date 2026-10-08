"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MeritPodium, type PodiumEntry } from "./merit-podium";
import { StudentAvatar } from "./student-avatar";
import {
  Trophy,
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  ClipboardEdit,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CLASS_NUMBERS, DIVISIONS, bn, classLabel, divisionLabel, fmtNum, fmtPct, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RecentSubject {
  id: number;
  name: string;
  hasResults: boolean;
  markCount: number;
}

interface RecentExamOption {
  id: number;
  title: string;
  examDate: string;
  markCount: number;
}

interface RecentResultData {
  exam: {
    id: number;
    title: string;
    examDate: string;
    month: number;
    year: number;
    totalMarks: number;
    className: string;
    classId?: number;
    division: string | null;
    subjectId?: number;
    subjectName: string;
    markCount: number;
    highestMark?: number;
  } | null;
  subjects?: RecentSubject[];
  exams?: RecentExamOption[];
  top3: PodiumEntry[];
  results: Array<{
    studentId: number;
    name: string;
    roll: number;
    section: string | null;
    photoKey: string | null;
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    position: number;
    attendance: string;
    hidePhoto: boolean;
  }>;
  myResult: any | null;
  isStudentView: boolean;
}

export function RecentResultBox({
  user,
  defaultClass = "10",
}: {
  user: { role: Role; studentId?: number; className?: string | null };
  defaultClass?: string;
}) {
  const [selectedClass, setSelectedClass] = useState(user.className || defaultClass || "10");
  const [selectedDivision, setSelectedDivision] = useState<string>("SCIENCE");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedExamId, setSelectedExamId] = useState<string>("LATEST");
  const [data, setData] = useState<RecentResultData | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<RecentSubject[]>([]);
  const [availableExams, setAvailableExams] = useState<RecentExamOption[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(
    async (subOverride?: string, examOverride?: string) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ type: "recent", class: selectedClass });
        if (selectedClass === "9" || selectedClass === "10") {
          p.set("division", selectedDivision);
        }
        const activeSub = subOverride !== undefined ? subOverride : selectedSubject;
        if (activeSub && activeSub !== "ALL") {
          p.set("subjectId", activeSub);
        }
        const activeExam = examOverride !== undefined ? examOverride : selectedExamId;
        if (activeExam && activeExam !== "LATEST") {
          p.set("examId", activeExam);
        }

        const res = await fetch(`/api/results?${p.toString()}`);
        const json = await res.json();
        if (json.ok) {
          setData(json);
          if (json.subjects) {
            setAvailableSubjects(json.subjects);
          }
          if (json.exams) {
            setAvailableExams(json.exams);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [selectedClass, selectedDivision, selectedSubject, selectedExamId]
  );

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    setSelectedSubject("ALL");
    setSelectedExamId("LATEST");
  };

  const handleDivisionChange = (div: string) => {
    setSelectedDivision(div);
    setSelectedSubject("ALL");
    setSelectedExamId("LATEST");
  };

  const handleSubjectChange = (sub: string) => {
    setSelectedSubject(sub);
    setSelectedExamId("LATEST");
  };

  const isTeacherOrAdmin = user.role === "ADMIN" || user.role === "TEACHER" || user.role === "DIRECTOR";

  return (
    <Card className="overflow-hidden border-2 border-indigo-100 bg-white shadow-sm">
      <CardHeader className="border-b border-indigo-50 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-indigo-50/70 pb-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white shadow-xs">
                <Trophy className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-[16px] font-bold text-slate-900">
                রিসেন্ট পাবলিশ হওয়া রেজাল্ট বক্স
              </CardTitle>
              {data?.exam && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <Check className="h-3 w-3" />
                  {selectedSubject === "ALL" ? "অটো সর্বশেষ ফলাফল" : "বিষয়ভিত্তিক ফলাফল"}
                </span>
              )}
            </div>
            <CardDescription className="text-[12px] text-slate-500">
              সর্বশেষ প্রকাশিত পরীক্ষার ফলাফল, সেরা ৩ জন ও অবস্থান তালিকা
            </CardDescription>
          </div>

          {/* Filter Bar with Class, Division, Subject Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Class Selector (only editable if not student) */}
            {user.role !== "STUDENT" ? (
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger className="h-8 w-[115px] rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-950 shadow-2xs">
                  <SelectValue placeholder="শ্রেণি" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_NUMBERS.map((n) => (
                    <SelectItem key={n} value={n} className="text-xs">
                      {classLabel(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="inline-flex h-8 items-center rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 text-xs font-semibold text-indigo-900">
                {classLabel(selectedClass)}
              </div>
            )}

            {/* 2. Division Selector (for class 9 and 10) */}
            {(selectedClass === "9" || selectedClass === "10") && user.role !== "STUDENT" && (
              <Select value={selectedDivision} onValueChange={handleDivisionChange}>
                <SelectTrigger className="h-8 w-[105px] rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-950 shadow-2xs">
                  <SelectValue placeholder="বিভাগ" />
                </SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 3. Subject Selector Dropdown (requested by user) */}
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="h-8 min-w-[135px] max-w-[190px] rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-950 shadow-2xs">
                <BookOpen className="mr-1 h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                <SelectValue placeholder="বিষয় নির্বাচন" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="ALL" className="text-xs font-semibold text-indigo-900">
                  সব বিষয় (সর্বশেষ প্রকাশিত)
                </SelectItem>
                {availableSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span>{s.name}</span>
                      {s.hasResults ? (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                          ফলাফল আছে
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">খালি</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 4. Exam Selector Dropdown (when multiple exams exist for current subject) */}
            {availableExams.length > 1 && (
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="h-8 min-w-[125px] max-w-[170px] rounded-lg border-indigo-200 bg-white text-xs font-medium text-slate-800 shadow-2xs">
                  <Calendar className="mr-1 h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <SelectValue placeholder="পরীক্ষা" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LATEST" className="text-xs font-bold text-indigo-900">
                    সর্বশেষ পরীক্ষা
                  </SelectItem>
                  {availableExams.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id.toString()} className="text-xs">
                      {ex.title} ({bn(ex.examDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 5. Refresh Button */}
            <button
              onClick={() => loadRecent()}
              title="ফলাফল রিফ্রেশ করুন"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-indigo-600 shadow-2xs hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ফলাফল লোড হচ্ছে...
          </div>
        ) : !data?.exam ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {selectedSubject !== "ALL"
                ? "এই বিষয়ের জন্য এখনো কোনো পরীক্ষার ফলাফল প্রকাশিত হয়নি।"
                : `${classLabel(selectedClass)} শ্রেণির কোনো সাম্প্রতিক পরীক্ষার ফলাফল প্রকাশিত হয়নি।`}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {selectedSubject !== "ALL"
                ? "আপনি অন্য বিষয় নির্বাচন করতে পারেন অথবা 'সব বিষয় (সর্বশেষ প্রকাশিত)' নির্বাচন করে অন্যান্য ফলাফল দেখতে পারেন।"
                : "পরীক্ষার নম্বর এন্ট্রি করার সাথে সাথে স্বয়ংক্রিয়ভাবে এখানে ফলাফল ও মেধা তালিকা প্রদর্শিত হবে।"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {selectedSubject !== "ALL" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSubject("ALL");
                    setSelectedExamId("LATEST");
                  }}
                  className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  সকল বিষয় দেখুন
                </Button>
              )}
              {isTeacherOrAdmin && (
                <Link
                  href={
                    user.role === "ADMIN"
                      ? `/admin/marks?class=${selectedClass}${
                          selectedClass === "9" || selectedClass === "10" ? `&division=${selectedDivision}` : ""
                        }${selectedSubject !== "ALL" ? `&subjectId=${selectedSubject}` : ""}`
                      : `/teacher/marks?class=${selectedClass}${
                          selectedClass === "9" || selectedClass === "10" ? `&division=${selectedDivision}` : ""
                        }${selectedSubject !== "ALL" ? `&subjectId=${selectedSubject}` : ""}`
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                >
                  <ClipboardEdit className="h-3.5 w-3.5" /> নম্বর এন্ট্রি করুন
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Exam Information Banner with Live Status and Direct Marks Entry Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="font-bold text-slate-900">{data.exam.title}</span>
                <span className="text-slate-300">•</span>
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800 font-bold">
                  {data.exam.subjectName}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600">
                  {classLabel(data.exam.className)}{" "}
                  {data.exam.division ? `(${divisionLabel(data.exam.division)})` : ""}
                </span>
                {selectedSubject === "ALL" && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    <Sparkles className="h-2.5 w-2.5" /> সর্বশেষ প্রকাশিত
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  তারিখ: {bn(data.exam.examDate)}
                </span>
                <span>
                  মোট নম্বর: <b className="text-slate-800">{bn(data.exam.totalMarks)}</b>
                </span>
                <span>
                  অংশগ্রহণ: <b className="text-slate-800">{bn(data.exam.markCount)} জন</b>
                </span>
                {data.exam.highestMark !== undefined && (
                  <span className="text-emerald-700 font-semibold">
                    সর্বোচ্চ: <b>{bn(data.exam.highestMark)}</b>
                  </span>
                )}
                {isTeacherOrAdmin && data.exam.subjectId && (
                  <Link
                    href={
                      user.role === "ADMIN"
                        ? `/admin/marks?class=${data.exam.className}${
                            data.exam.division ? `&division=${data.exam.division}` : ""
                          }&subjectId=${data.exam.subjectId}`
                        : `/teacher/marks?class=${data.exam.className}${
                            data.exam.division ? `&division=${data.exam.division}` : ""
                          }&subjectId=${data.exam.subjectId}`
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
                  >
                    <ClipboardEdit className="h-3 w-3" /> নম্বর এডিট
                  </Link>
                )}
              </div>
            </div>

            {/* Top 3 Podium */}
            {data.top3.length > 0 && (
              <div className="pt-2">
                <div className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-amber-700">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
                  <span>শীর্ষ মেধা স্থান (১ম, ২য় ও ৩য়)</span>
                </div>
                <MeritPodium top3={data.top3} />
              </div>
            )}

            {/* Results Table Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">
                  {user.role === "STUDENT" ? "আমার পরীক্ষার ফলাফল" : "সকল শিক্ষার্থীর ফলাফল তালিকা"}
                </h4>
                {user.role === "STUDENT" && (
                  <span className="text-[11px] text-slate-400">
                    * শিক্ষার্থী প্যানেলে শুধু নিজের ও ১ম/২য়/৩য় স্থান দেখানো হয়।
                  </span>
                )}
              </div>

              {data.results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  আপনার ফলাফল পাওয়া যায়নি।
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-[11px] font-semibold text-slate-600">
                        <th className="px-3 py-2 text-center w-12">স্থান</th>
                        <th className="px-3 py-2 w-12 text-center">ছবি</th>
                        <th className="px-3 py-2">শিক্ষার্থী</th>
                        <th className="px-3 py-2 text-center">রোল</th>
                        <th className="px-3 py-2 text-right">প্রাপ্ত নম্বর</th>
                        <th className="px-3 py-2 text-right">শতকরা</th>
                        <th className="px-3 py-2 text-center">উপস্থিতি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.results.map((row) => {
                        const isTop = row.position <= 3;
                        const isMe = user.role === "STUDENT" && row.studentId === user.studentId;
                        return (
                          <tr
                            key={row.studentId}
                            className={cn(
                              "transition-colors",
                              isMe ? "bg-blue-50/90 font-medium" : isTop ? "bg-amber-50/30" : "hover:bg-slate-50"
                            )}
                          >
                            <td className="px-3 py-2 text-center font-bold text-slate-700">
                              {row.attendance === "ABSENT" ? (
                                <span className="text-red-500 font-normal text-[10px]">অনুপস্থিত</span>
                              ) : row.position === 1 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                                  ১ম
                                </span>
                              ) : row.position === 2 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">
                                  ২য়
                                </span>
                              ) : row.position === 3 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-400 text-[10px] font-bold text-white">
                                  ৩য়
                                </span>
                              ) : (
                                bn(row.position)
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StudentAvatar
                                photoKey={row.photoKey}
                                name={row.name}
                                size="sm"
                                className="mx-auto h-7 w-7"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-semibold text-slate-900">{row.name}</span>
                              {isMe && (
                                <span className="ml-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  আমি
                                </span>
                              )}
                              {row.section && (
                                <span className="ml-1 text-[11px] text-slate-500">({row.section})</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600">{bn(row.roll)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-800">
                              {row.attendance === "ABSENT" ? (
                                <span className="text-red-500 font-normal">০</span>
                              ) : (
                                `${fmtNum(row.obtainedMarks)} / ${fmtNum(row.totalMarks)}`
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-indigo-700">
                              {row.attendance === "ABSENT" ? "০%" : fmtPct(row.percentage)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {row.attendance === "ABSENT" ? (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                  <XCircle className="h-3 w-3" /> অনুপস্থিত
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" /> উপস্থিত
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
