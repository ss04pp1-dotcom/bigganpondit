// ============================================================
// RESULT ENGINE — the single reusable module for every calculation.
// Used by: teacher dashboard, search result, monthly report,
// annual report, student portal, merit list, print report, API.
// Never duplicate these formulas anywhere else.
// ============================================================

import { gradeFromPercentage, type GradeInfo } from "@/lib/constants";

/** percentage = obtained / total * 100 */
export function calculatePercentage(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (obtained / total) * 100;
}

export function calculateGrade(percentage: number): GradeInfo {
  return gradeFromPercentage(percentage);
}

export function calculateGPA(percentage: number): number {
  return gradeFromPercentage(percentage).gpa;
}

/** Highest obtained mark among the marks of one exam (auto-calculated). */
export function calculateHighestMark(marks: { obtained: number }[]): number {
  let max = 0;
  for (const m of marks) if (m.obtained > max) max = m.obtained;
  return max;
}

// ------------------------------------------------------------------
// Aggregation of a subject across multiple exams in a month:
//   SUM(obtained) / SUM(total) * 100   (never average of percentages)
// ------------------------------------------------------------------
export interface AggregateInput {
  total: number;
  obtained: number;
}

export interface SubjectAggregate {
  totalMarks: number;
  obtained: number;
  percentage: number;
  grade: string;
  gpa: number;
}

export function aggregate(list: AggregateInput[]): SubjectAggregate {
  const totalMarks = list.reduce((s, x) => s + x.total, 0);
  const obtained = list.reduce((s, x) => s + x.obtained, 0);
  const percentage = calculatePercentage(obtained, totalMarks);
  const g = calculateGrade(percentage);
  return {
    totalMarks,
    obtained,
    percentage,
    grade: g.grade,
    gpa: g.gpa,
  };
}

/** One exam row as displayed in search results. */
export interface ExamRowForDisplay {
  examId: number;
  subjectId: number;
  subjectName: string;
  subjectIsFourth: boolean;
  className: string;
  division: string | null;
  month: number;
  year: number;
  examDate: string;
  title: string;
  total: number;
  markId: number | null;
  attendance: "PRESENT" | "ABSENT";
  obtained: number;
}

export interface SearchResultRow extends ExamRowForDisplay {
  percentage: number;
  grade: string;
  gpa: number;
  highest: number; // highest mark in this exam (whole class)
}

export function decorateExamRow(row: ExamRowForDisplay, highestMarks: { obtained: number }[]): SearchResultRow {
  const percentage = calculatePercentage(row.obtained, row.total);
  const g = calculateGrade(percentage);
  return {
    ...row,
    percentage,
    grade: g.grade,
    gpa: g.gpa,
    highest: calculateHighestMark(highestMarks),
  };
}

// ------------------------------------------------------------------
// Ranking — priority: percentage, total obtained, GPA, roll (asc).
// Used for merit list, monthly position, class summaries.
// ------------------------------------------------------------------
export interface RankEntry {
  studentId: number;
  roll: number;
  name: string;
  percentage: number;
  totalObtained: number;
  gpa: number;
}

export interface RankedEntry extends RankEntry {
  position: number;
}

export function calculateRanking<T extends RankEntry>(entries: T[]): (T & { position: number })[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.totalObtained !== a.totalObtained) return b.totalObtained - a.totalObtained;
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    return a.roll - b.roll;
  });
  return sorted.map((e, i) => ({ ...e, position: i + 1 }));
}

// ------------------------------------------------------------------
// Monthly result — per-subject aggregation + overall + position input
// ------------------------------------------------------------------
export interface MonthlySubjectResult extends SubjectAggregate {
  subjectId: number;
  subjectName: string;
  isFourth: boolean;
  examCount: number;
  classHighest: number; // highest aggregated obtained in this subject (class)
}

export interface MonthlyOverall extends SubjectAggregate {
  position?: number;
}

export interface MonthlyResult {
  subjects: MonthlySubjectResult[];
  overall: MonthlyOverall;
}

// ------------------------------------------------------------------
// THE official final-GPA formula (Bangladesh GPA-5 system).
// Exported so the merit list, class summaries and monthly report cards
// ALL use the same computation — previously the merit list used a plain
// percentage->grade GPA while the report card used compulsory-average +
// 4th-subject bonus + fail-cap, so the same student could show GPA 4.00 on
// the merit list and GPA 0.00 on the report card.
// ------------------------------------------------------------------
export interface GpaSubjectInput {
  gpa: number;
  isFourth: boolean;
}

export function computeFinalGpa(
  subjects: GpaSubjectInput[],
  fallbackPct?: number
): { gpa: number; grade: string } {
  const compulsory = subjects.filter((s) => !s.isFourth);
  const optionalSubjects = subjects.filter((s) => s.isFourth);
  // exactly ONE 4th subject contributes the bonus — the best-GPA one
  // (deterministic; see the note in buildMonthlyResult).
  const optional =
    optionalSubjects.length > 0
      ? optionalSubjects.reduce((best, s) => (!best || s.gpa > best.gpa ? s : best), optionalSubjects[0])
      : undefined;
  const hasCompulsoryFail = compulsory.some((s) => s.gpa === 0);

  if (hasCompulsoryFail && compulsory.length > 0) {
    return { gpa: 0.0, grade: "F" };
  }
  if (compulsory.length > 0) {
    let totalGp = compulsory.reduce((sum, s) => sum + s.gpa, 0);
    if (optional && optional.gpa > 2.0) {
      totalGp += optional.gpa - 2.0;
    }
    const finalGpa = Math.min(5.0, Math.round((totalGp / compulsory.length) * 100) / 100);
    let finalGrade = "F";
    if (finalGpa >= 5.0) finalGrade = "A+";
    else if (finalGpa >= 4.0) finalGrade = "A";
    else if (finalGpa >= 3.5) finalGrade = "A-";
    else if (finalGpa >= 3.0) finalGrade = "B";
    else if (finalGpa >= 2.0) finalGrade = "C";
    else if (finalGpa >= 1.0) finalGrade = "D";
    return { gpa: finalGpa, grade: finalGrade };
  }
  const og = calculateGrade(fallbackPct ?? 0);
  return { gpa: og.gpa, grade: og.grade };
}

export function buildMonthlyResult(
  bySubject: Map<
    number,
    { name: string; isFourth: boolean; exams: AggregateInput[] }
  >,
  classHighestBySubject: Map<number, number>
): MonthlyResult {
  const subjects: MonthlySubjectResult[] = [];
  let totalMarks = 0;
  let obtained = 0;

  for (const [subjectId, s] of bySubject) {
    const agg = aggregate(s.exams);
    subjects.push({
      subjectId,
      subjectName: s.name,
      isFourth: s.isFourth,
      examCount: s.exams.length,
      ...agg,
      classHighest: classHighestBySubject.get(subjectId) ?? agg.obtained,
    });
    totalMarks += agg.totalMarks;
    obtained += agg.obtained;
  }

  // stable subject order: by name
  subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "bn"));

  const overallPct = calculatePercentage(obtained, totalMarks);

  // ------------------------------------------------------------------
  // Fourth (optional) subject handling.
  // Bangladesh rule: exactly ONE 4th subject contributes the bonus
  // (gpa - 2, only when above 2.0). Data may legitimately contain MORE than
  // one is_fourth_subject subject (e.g. কৃষিশিক্ষা + উচ্চতর গণিত for the same
  // class, and students typically sit only the one they chose).
  //
  // The previous code used `subjects.find(isFourth)` — which picked whichever
  // subject came first alphabetically and SILENTLY DROPPED the rest from the
  // GPA. Two students with identical marks could get different GPAs depending
  // on subject-name ordering.
  //
  // Deterministic fix: among the 4th subjects the student actually has marks
  // in, the one with the HIGHEST GPA is chosen for the bonus (ties resolved
  // by the stable subject order above). Marks of all subjects still count
  // toward totalMarks/obtained/percentage — only the GPA divisor follows the
  // compulsory set.
  // ------------------------------------------------------------------

  // The single official formula (shared with the merit list / class summary):
  const { gpa: finalGpa, grade: finalGrade } = computeFinalGpa(subjects, overallPct);

  return {
    subjects,
    overall: {
      totalMarks,
      obtained,
      percentage: overallPct,
      grade: finalGrade,
      gpa: finalGpa,
    },
  };
}

// ------------------------------------------------------------------
// Annual result — percentage per month (Jan..Dec)
// ------------------------------------------------------------------
export interface AnnualMonth {
  month: number; // 1-12
  percentage: number | null; // null => N/A (no results)
  totalMarks: number;
  obtained: number;
  examCount: number;
}

export interface AnnualResult {
  months: AnnualMonth[];
  overall: { percentage: number | null; grade: string | null; gpa: number | null; totalMarks: number; obtained: number };
}

export function buildAnnualResult(
  byMonth: Map<number, AggregateInput[]>
): AnnualResult {
  const months: AnnualMonth[] = [];
  let totalMarks = 0;
  let obtained = 0;
  for (let m = 1; m <= 12; m++) {
    const exams = byMonth.get(m) ?? [];
    if (exams.length === 0) {
      months.push({ month: m, percentage: null, totalMarks: 0, obtained: 0, examCount: 0 });
      continue;
    }
    const agg = aggregate(exams);
    months.push({ month: m, percentage: agg.percentage, totalMarks: agg.totalMarks, obtained: agg.obtained, examCount: exams.length });
    totalMarks += agg.totalMarks;
    obtained += agg.obtained;
  }
  const pct = totalMarks > 0 ? calculatePercentage(obtained, totalMarks) : null;
  const g = pct !== null ? calculateGrade(pct) : null;
  return {
    months,
    overall: {
      percentage: pct,
      grade: g?.grade ?? null,
      gpa: g?.gpa ?? null,
      totalMarks,
      obtained,
    },
  };
}
