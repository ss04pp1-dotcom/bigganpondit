"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { MONTHS_BN, bn, classLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StudentOption {
  id: number;
  name: string;
  roll: number;
}

interface MonthlyReportFilterProps {
  activeClasses: string[];
  className: string;
  requiresDiv: boolean;
  division: string | null;
  students: StudentOption[];
  studentId: number | null;
  mode: string;
  month: number;
  year: number;
  curYear: number;
  basePath?: string;
}

export function MonthlyReportFilter({
  activeClasses,
  className: initialClassName,
  requiresDiv: initialRequiresDiv,
  division: initialDivision,
  students,
  studentId,
  mode: initialMode,
  month: initialMonth,
  year: initialYear,
  curYear,
  basePath = "/teacher/monthly-report",
}: MonthlyReportFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [className, setClassName] = useState(initialClassName);
  const [division, setDivision] = useState(initialDivision ?? "SCIENCE");
  const [selectedStudent, setSelectedStudent] = useState(studentId ? String(studentId) : "all");
  const [mode, setMode] = useState(initialMode);
  const [month, setMonth] = useState(String(initialMonth));
  const [year, setYear] = useState(String(initialYear));

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset loading once searchParams change
  useEffect(() => {
    setLoading(false);
  }, [searchParams]);

  const requiresDiv = className === "9" || className === "10";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const params = new URLSearchParams();
    params.set("class", className);
    if (requiresDiv) {
      params.set("division", division);
    }
    params.set("student", selectedStudent);
    params.set("mode", mode);
    params.set("month", month);
    params.set("year", year);

    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  };

  const isWorking = loading || isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-slate-700">শ্রেণি</Label>
          <Select
            name="class"
            value={className}
            onValueChange={(val) => {
              setClassName(val);
              setSelectedStudent("all");
            }}
          >
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeClasses.map((c) => (
                <SelectItem key={c} value={c}>
                  {classLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {requiresDiv && (
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-700">বিভাগ</Label>
            <Select name="division" value={division} onValueChange={setDivision}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCIENCE">বিজ্ঞান</SelectItem>
                <SelectItem value="HUMANITIES">মানবিক</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-slate-700">শিক্ষার্থী</Label>
          <Select
            name="student"
            value={selectedStudent}
            onValueChange={setSelectedStudent}
          >
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">সব শিক্ষার্থী (সারসংক্ষেপ)</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} — রোল {bn(s.roll)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-slate-700">ধরনের রিপোর্ট</Label>
          <Select name="mode" value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">মাসিক</SelectItem>
              <SelectItem value="MODEL">মডেল টেস্ট</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-slate-700">মাস</Label>
          <Select name="month" value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_BN.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-semibold text-slate-700">বছর</Label>
          <Select name="year" value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[curYear + 1, curYear, curYear - 1, curYear - 2, curYear - 3].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {bn(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            disabled={isWorking}
            className={cn(
              "h-10 w-full font-bold select-none transition-all duration-150 active:scale-95 shadow-xs",
              isWorking
                ? "bg-primary/80 cursor-wait text-white ring-2 ring-primary/30"
                : "bg-primary hover:bg-primary/90 text-white cursor-pointer hover:shadow-md"
            )}
          >
            {isWorking ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>লোড হচ্ছে...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Search className="h-4 w-4" />
                <span>দেখান</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {isWorking && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50/80 px-3 py-1.5 text-[12px] font-medium text-blue-800 animate-pulse border border-blue-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          <span>অনুরোধ প্রক্রিয়াধীন রয়েছে... অনুগ্রহ করে অপেক্ষা করুন।</span>
        </div>
      )}
    </form>
  );
}
