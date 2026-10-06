"use client";

import { useEffect, useState, useCallback } from "react";
import { MeritPodium, type PodiumEntry } from "./merit-podium";
import { StudentAvatar } from "./student-avatar";
import { Trophy, Award, Calendar, BookOpen, User, CheckCircle2, XCircle, ChevronRight, Sparkles, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASS_NUMBERS, DIVISIONS, bn, classLabel, divisionLabel, fmtNum, fmtPct, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RecentResultData {
  exam: {
    id: number;
    title: string;
    examDate: string;
    month: number;
    year: number;
    totalMarks: number;
    className: string;
    division: string | null;
    subjectName: string;
    markCount: number;
  } | null;
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
  const [data, setData] = useState<RecentResultData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type: "recent", class: selectedClass });
      if (selectedClass === "9" || selectedClass === "10") {
        p.set("division", selectedDivision);
      }
      const res = await fetch(`/api/results?${p.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedDivision]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  return (
    <Card className="overflow-hidden border-2 border-indigo-100 bg-white shadow-sm">
      <CardHeader className="border-b border-indigo-50 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-indigo-50/70 pb-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white shadow-xs">
                <Trophy className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-[16px] font-bold text-slate-900">
                রিসেন্ট পাবলিশ হওয়া রেজাল্ট বক্স
              </CardTitle>
            </div>
            <CardDescription className="text-[12px] text-slate-500">
              সর্বশেষ প্রকাশিত পরীক্ষার ফলাফল, সেরা ৩ জন ও অবস্থান তালিকা
            </CardDescription>
          </div>

          {/* Class Selector Dropdown */}
          <div className="flex items-center gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-8 w-[125px] rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-950 shadow-2xs">
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

            {(selectedClass === "9" || selectedClass === "10") && (
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="h-8 w-[100px] rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-950 shadow-2xs">
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
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 py-10 text-center text-sm text-slate-500">
            এই শ্রেণির কোনো সাম্প্রতিক পরীক্ষার ফলাফল প্রকাশিত হয়নি।
          </div>
        ) : (
          <>
            {/* Exam Information Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-slate-900">{data.exam.title}</span>
                <span>•</span>
                <span className="text-indigo-700 font-semibold">{data.exam.subjectName}</span>
                <span>•</span>
                <span>{classLabel(data.exam.className)} {data.exam.division ? `(${divisionLabel(data.exam.division)})` : ""}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  তারিখ: {bn(data.exam.examDate)}
                </span>
                <span>মোট নম্বর: <b className="text-slate-800">{bn(data.exam.totalMarks)}</b></span>
                <span>অংশগ্রহণ: <b className="text-slate-800">{bn(data.exam.markCount)} জন</b></span>
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
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">১ম</span>
                              ) : row.position === 2 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">২য়</span>
                              ) : row.position === 3 ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-400 text-[10px] font-bold text-white">৩য়</span>
                              ) : (
                                bn(row.position)
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StudentAvatar photoKey={row.photoKey} name={row.name} size="sm" className="mx-auto h-7 w-7" />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-semibold text-slate-900">{row.name}</span>
                              {isMe && (
                                <span className="ml-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  আমি
                                </span>
                              )}
                              {row.section && <span className="ml-1 text-[11px] text-slate-500">({row.section})</span>}
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
