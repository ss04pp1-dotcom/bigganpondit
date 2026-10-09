// Report data assembly — every report/dashboard/portal view is built here
// on top of the shared result engine (never duplicated formulas).

import type { D1Database } from "@/lib/db/types";
import { SETTING_DIRECTOR_SIGNATURE } from "@/lib/constants";
import {
  aggregate,
  buildAnnualResult,
  buildMonthlyResult,
  calculateRanking,
  decorateExamRow,
  type ExamRowForDisplay,
  type SearchResultRow,
} from "./engine";

export interface StudentInfo {
  studentId: number;
  name: string;
  roll: number;
  className: string; // '6'..'10'
  division: string | null;
  section: string | null;
  photoKey: string | null;
}

export async function getStudentInfo(db: D1Database, studentId: number, year?: number): Promise<StudentInfo | null> {
  const row = await db
    .prepare(
      `SELECT st.id as student_id, st.name, st.roll, st.division, st.section, st.photo_key, c.name as class_name
       FROM students st JOIN classes c ON c.id = st.class_id WHERE st.id = ?`
    )
    .bind(studentId)
    .first<StudentInfo & { student_id: number; class_name: string; photo_key: string | null }>(undefined as never)
    .catch(() => null);
  if (!row) return null;

  let className = row.class_name;
  let division = row.division;

  if (year) {
    const historical = await db
      .prepare(
        `SELECT c.name as class_name, e.division
         FROM marks m JOIN exams e ON e.id = m.exam_id JOIN classes c ON c.id = e.class_id
         WHERE m.student_id = ? AND e.year = ? LIMIT 1`
      )
      .bind(studentId, year)
      .first<{ class_name: string; division: string | null }>(undefined as never)
      .catch(() => null);
    if (historical?.class_name) {
      className = historical.class_name;
      if (historical.division) division = historical.division;
    }
  }

  return {
    studentId: row.student_id,
    name: row.name,
    roll: row.roll,
    className,
    division,
    section: row.section,
    photoKey: row.photo_key,
  };
}

// ------------------------------------------------------------------
// Search result — exam rows of one student (filters: subject, month, year)
// ------------------------------------------------------------------
export async function getStudentExamRows(
  db: D1Database,
  opts: {
    studentId: number;
    subjectIds?: number[] | null; // null = all
    month?: number | null; // null = all months
    year: number;
  }
): Promise<SearchResultRow[]> {
  const { studentId, subjectIds, month, year } = opts;
  const clauses = ["m.student_id = ?", "e.year = ?"];
  const params: unknown[] = [studentId, year];
  if (month != null) {
    clauses.push("e.month = ?");
    params.push(month);
  }
  if (subjectIds !== null && subjectIds !== undefined) {
    if (subjectIds.length === 0) return [];
    clauses.push(`e.subject_id IN (${subjectIds.map(() => "?").join(",")})`);
    params.push(...subjectIds);
  }
  const rows = (
    await db
      .prepare(
        `SELECT m.id as mark_id, m.attendance, m.obtained_marks,
                e.id as exam_id, e.subject_id, e.month, e.year, e.exam_date, e.title, e.total_marks,
                e.class_id, e.division,
                s.name as subject_name, s.is_fourth_subject, c.name as class_name
         FROM marks m
         JOIN exams e ON e.id = m.exam_id
         JOIN subjects s ON s.id = e.subject_id
         JOIN classes c ON c.id = e.class_id
         WHERE ${clauses.join(" AND ")}
         ORDER BY e.exam_date, e.id`
      )
      .bind(...params)
      .all<Record<string, unknown>>()
  ).results as unknown as {
    exam_id: number;
    subject_id: number;
    subject_name: string;
    is_fourth_subject: number;
    class_name: string;
    division: string | null;
    month: number;
    year: number;
    exam_date: string;
    title: string;
    total_marks: number;
    mark_id: number;
    attendance: "PRESENT" | "ABSENT";
    obtained_marks: number;
  }[];

  if (!rows.length) return [];

  // highest mark per exam — fetch all marks of these exams in one query
  const examIds = [...new Set(rows.map((r) => Number(r.exam_id)))];
  const ph = examIds.map(() => "?").join(",");
  const allMarks = (
    await db
      .prepare(`SELECT exam_id, obtained_marks, attendance FROM marks WHERE exam_id IN (${ph})`)
      .bind(...examIds)
      .all<{ exam_id: number; obtained_marks: number; attendance: string }>()
  ).results;
  const highestByExam = new Map<number, number>();
  for (const m of allMarks) {
    highestByExam.set(m.exam_id, Math.max(highestByExam.get(m.exam_id) ?? 0, m.obtained_marks));
  }

  return rows.map((r) => {
    const base: ExamRowForDisplay = {
      examId: Number(r.exam_id),
      subjectId: Number(r.subject_id),
      subjectName: r.subject_name,
      subjectIsFourth: Number(r.is_fourth_subject) === 1,
      className: r.class_name,
      division: (r.division as string | null) ?? null,
      month: Number(r.month),
      year: Number(r.year),
      examDate: r.exam_date,
      title: r.title,
      total: Number(r.total_marks),
      markId: Number(r.mark_id),
      attendance: r.attendance as "PRESENT" | "ABSENT",
      obtained: Number(r.obtained_marks),
    };
    const highest = highestByExam.get(base.examId) ?? base.obtained;
    return decorateExamRow(base, [{ obtained: highest }]);
  });
}

// ------------------------------------------------------------------
// Monthly class data — the workhorse for monthly reports, merit lists
// and student positions.
// ------------------------------------------------------------------
export interface MonthlyClassData {
  students: StudentInfo[];
  byStudent: Map<number, Map<number, { name: string; isFourth: boolean; exams: { total: number; obtained: number }[] }>>;
  classHighest: Map<number, number>; // subjectId -> highest aggregated obtained
  subjectNames: Map<number, { name: string; isFourth: boolean }>;
}

export async function getMonthlyClassData(
  db: D1Database,
  opts: {
    classId: number;
    division: string | null;
    month: number;
    year: number;
    subjectIds?: number[] | null;
  }
): Promise<MonthlyClassData> {
  const { classId, division, month, year, subjectIds } = opts;

  const students = (
    await db
      .prepare(
        `SELECT st.id as student_id, st.name, st.roll, st.division, st.section, st.photo_key, c.name as class_name
         FROM students st JOIN classes c ON c.id = st.class_id
         WHERE st.class_id = ? AND COALESCE(st.division, '') = COALESCE(?, '')
         ORDER BY st.roll`
      )
      .bind(classId, division)
      .all<StudentInfo & { student_id: number; class_name: string; photo_key: string | null }>()
  ).results;

  const clauses = ["e.class_id = ?", "COALESCE(e.division, '') = COALESCE(?, '')", "e.month = ?", "e.year = ?"];
  const params: unknown[] = [classId, division, month, year];
  if (subjectIds !== null && subjectIds !== undefined) {
    if (subjectIds.length === 0) {
      return { students: [], byStudent: new Map(), classHighest: new Map(), subjectNames: new Map() };
    }
    clauses.push(`e.subject_id IN (${subjectIds.map(() => "?").join(",")})`);
    params.push(...subjectIds);
  }
  const marks = (
    await db
      .prepare(
        `SELECT m.student_id, m.obtained_marks, e.subject_id, e.total_marks, s.name as subject_name, s.is_fourth_subject
         FROM marks m
         JOIN exams e ON e.id = m.exam_id
         JOIN subjects s ON s.id = e.subject_id
         WHERE ${clauses.join(" AND ")}`
      )
      .bind(...params)
      .all<{
        student_id: number;
        obtained_marks: number;
        subject_id: number;
        total_marks: number;
        subject_name: string;
        is_fourth_subject: number;
      }>()
  ).results;

  const byStudent = new Map<number, Map<number, { name: string; isFourth: boolean; exams: { total: number; obtained: number }[] }>>();
  const subjectNames = new Map<number, { name: string; isFourth: boolean }>();
  const aggByStudentSubject = new Map<string, number>(); // `${studentId}:${subjectId}` -> obtained sum

  for (const m of marks) {
    if (!byStudent.has(m.student_id)) byStudent.set(m.student_id, new Map());
    const sm = byStudent.get(m.student_id)!;
    if (!sm.has(m.subject_id)) {
      sm.set(m.subject_id, { name: m.subject_name, isFourth: Number(m.is_fourth_subject) === 1, exams: [] });
    }
    sm.get(m.subject_id)!.exams.push({ total: m.total_marks, obtained: m.obtained_marks });
    if (!subjectNames.has(m.subject_id)) {
      subjectNames.set(m.subject_id, { name: m.subject_name, isFourth: Number(m.is_fourth_subject) === 1 });
    }
    const key = `${m.student_id}:${m.subject_id}`;
    aggByStudentSubject.set(key, (aggByStudentSubject.get(key) ?? 0) + m.obtained_marks);
  }

  // class highest per subject (max aggregated obtained)
  const classHighest = new Map<number, number>();
  for (const [key, obtained] of aggByStudentSubject) {
    const sid = Number(key.split(":")[1]);
    classHighest.set(sid, Math.max(classHighest.get(sid) ?? 0, obtained));
  }

  return {
    students: students.map((s) => ({
      studentId: s.student_id,
      name: s.name,
      roll: s.roll,
      className: s.class_name,
      division: s.division,
      section: s.section,
      photoKey: s.photo_key,
    })),
    byStudent,
    classHighest,
    subjectNames,
  };
}

// ------------------------------------------------------------------
// Monthly report for one student (aggregation + position)
// ------------------------------------------------------------------
export interface MonthlyReport {
  student: StudentInfo;
  month: number;
  year: number;
  subjects: ReturnType<typeof buildMonthlyResult>["subjects"];
  overall: ReturnType<typeof buildMonthlyResult>["overall"];
  examRowsBySubject: Map<number, SearchResultRow[]>;
  position?: number;
  cohortSize: number;
}

export async function buildMonthlyReport(
  db: D1Database,
  opts: { studentId: number; month: number; year: number; subjectIds?: number[] | null }
): Promise<MonthlyReport | null> {
  const student = await getStudentInfo(db, opts.studentId);
  if (!student) return null;
  const classId = (
    await db.prepare("SELECT id FROM classes WHERE name = ?").bind(student.className).first<{ id: number }>(undefined as never).catch(() => null)
  )?.id;
  if (!classId) return null;

  const data = await getMonthlyClassData(db, {
    classId,
    division: student.division,
    month: opts.month,
    year: opts.year,
    subjectIds: opts.subjectIds ?? null,
  });

  const bySubject = data.byStudent.get(opts.studentId);
  const result = buildMonthlyResult(bySubject ?? new Map(), data.classHighest);

  // ranking across the cohort (only students who have at least one mark)
  const rankEntries: (import("./engine").RankEntry & { photoKey: string | null; section: string | null })[] = [];
  for (const st of data.students) {
    const sm = data.byStudent.get(st.studentId);
    if (!sm || sm.size === 0) continue;
    const overall = aggregate([...sm.values()].flatMap((v) => v.exams));
    rankEntries.push({
      studentId: st.studentId,
      roll: st.roll,
      name: st.name,
      percentage: overall.percentage,
      totalObtained: overall.obtained,
      gpa: overall.gpa,
      photoKey: st.photoKey,
      section: st.section,
    });
  }
  const ranked = calculateRanking(rankEntries);
  const me = ranked.find((r) => r.studentId === opts.studentId);

  const detailedRows = await getStudentExamRows(db, {
    studentId: opts.studentId,
    subjectIds: opts.subjectIds ?? null,
    month: opts.month,
    year: opts.year,
  });
  const examRowsBySubject = new Map<number, SearchResultRow[]>();
  for (const row of detailedRows) {
    const list = examRowsBySubject.get(row.subjectId) ?? [];
    list.push(row);
    examRowsBySubject.set(row.subjectId, list);
  }

  return {
    student,
    month: opts.month,
    year: opts.year,
    subjects: result.subjects,
    overall: result.overall,
    examRowsBySubject,
    position: me?.position,
    cohortSize: rankEntries.length,
  };
}

// ------------------------------------------------------------------
// Class summary (all students) — monthly report "All" view & merit list
// ------------------------------------------------------------------
export interface ClassSummaryEntry {
  studentId: number;
  name: string;
  roll: number;
  photoKey: string | null;
  section: string | null;
  percentage: number;
  totalObtained: number;
  totalMarks: number;
  gpa: number;
  grade: string;
  position: number;
  bySubjectPct: Map<number, number>; // subjectId -> aggregated percentage
}

export async function buildMonthlyClassSummary(
  db: D1Database,
  opts: { classId: number; division: string | null; month: number; year: number; subjectIds?: number[] | null }
): Promise<{ entries: ClassSummaryEntry[]; subjectNames: Map<number, { name: string; isFourth: boolean }> }> {
  const data = await getMonthlyClassData(db, { ...opts, subjectIds: opts.subjectIds ?? null });
  const rankEntries: (import("./engine").RankEntry & { photoKey: string | null; section: string | null })[] = [];
  const details = new Map<number, ClassSummaryEntry>();

  for (const st of data.students) {
    const sm = data.byStudent.get(st.studentId);
    if (!sm || sm.size === 0) continue;
    const overall = aggregate([...sm.values()].flatMap((v) => v.exams));
    const bySubjectPct = new Map<number, number>();
    for (const [sid, v] of sm) {
      bySubjectPct.set(sid, aggregate(v.exams).percentage);
    }
    const entry: ClassSummaryEntry = {
      studentId: st.studentId,
      name: st.name,
      roll: st.roll,
      photoKey: st.photoKey,
      section: st.section,
      percentage: overall.percentage,
      totalObtained: overall.obtained,
      totalMarks: overall.totalMarks,
      gpa: overall.gpa,
      grade: overall.grade,
      position: 0,
      bySubjectPct,
    };
    details.set(st.studentId, entry);
    rankEntries.push({
      studentId: st.studentId,
      roll: st.roll,
      name: st.name,
      percentage: overall.percentage,
      totalObtained: overall.obtained,
      gpa: overall.gpa,
      photoKey: st.photoKey,
      section: st.section,
    });
  }

  const ranked = calculateRanking(rankEntries);
  for (const r of ranked) {
    const d = details.get(r.studentId);
    if (d) d.position = r.position;
  }
  return {
    entries: ranked
      .map((r) => details.get(r.studentId)!)
      .filter(Boolean),
    subjectNames: data.subjectNames,
  };
}

// ------------------------------------------------------------------
// Annual report — one student, Jan..Dec percentages
// ------------------------------------------------------------------
export async function buildStudentAnnualReport(
  db: D1Database,
  opts: { studentId: number; year: number; subjectIds?: number[] | null }
): Promise<{ student: StudentInfo; annual: ReturnType<typeof buildAnnualResult> } | null> {
  const student = await getStudentInfo(db, opts.studentId, opts.year);
  if (!student) return null;

  const clauses = ["m.student_id = ?", "e.year = ?"];
  const params: unknown[] = [opts.studentId, opts.year];
  if (opts.subjectIds !== null && opts.subjectIds !== undefined) {
    if (opts.subjectIds.length === 0) return { student, annual: buildAnnualResult(new Map()) };
    clauses.push(`e.subject_id IN (${opts.subjectIds.map(() => "?").join(",")})`);
    params.push(...opts.subjectIds);
  }
  const rows = (
    await db
      .prepare(
        `SELECT e.month, e.total_marks, m.obtained_marks
         FROM marks m JOIN exams e ON e.id = m.exam_id
         WHERE ${clauses.join(" AND ")}`
      )
      .bind(...params)
      .all<{ month: number; total_marks: number; obtained_marks: number }>()
  ).results;

  const byMonth = new Map<number, { total: number; obtained: number }[]>();
  for (const r of rows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, []);
    byMonth.get(r.month)!.push({ total: r.total_marks, obtained: r.obtained_marks });
  }
  return { student, annual: buildAnnualResult(byMonth) };
}

export interface DirectorSignatureItem {
  id: number;
  name: string;
  institution: string | null;
  signatureUrl: string | null;
}

export async function getAllDirectorsList(db: D1Database): Promise<DirectorSignatureItem[]> {
  const rows = (
    await db
      .prepare(
        `SELECT d.id, d.signature_key, u.name, d.institution
         FROM directors d
         JOIN users u ON u.id = d.user_id
         ORDER BY d.id ASC`
      )
      .all<{ id: number; signature_key: string | null; name: string; institution: string | null }>()
      .catch(() => null)
  )?.results ?? [];

  const fallbackKey = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(SETTING_DIRECTOR_SIGNATURE)
    .first<{ value: string | null }>()
    .catch(() => null);

  const fallbackUrl = fallbackKey?.value ? `/api/files/${fallbackKey.value}` : null;

  const result: DirectorSignatureItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    institution: r.institution,
    signatureUrl: r.signature_key ? `/api/files/${r.signature_key}` : fallbackUrl,
  }));

  if (result.length === 0) {
    result.push({
      id: 1,
      name: "ডাঃ মোঃ শাহিন",
      institution: "এম.বি.বি.এস, রামেক",
      signatureUrl: fallbackUrl,
    });
  }

  return result;
}

export async function getDirectorSignatureInfo(db: D1Database, directorId?: number | null) {
  let d: { id: number; signature_key: string | null; name: string; institution: string | null } | null = null;
  if (directorId) {
    d = await db
      .prepare(
        `SELECT d.id, d.signature_key, u.name, d.institution
         FROM directors d
         JOIN users u ON u.id = d.user_id
         WHERE d.id = ?`
      )
      .bind(directorId)
      .first<{ id: number; signature_key: string | null; name: string; institution: string | null }>()
      .catch(() => null);
  }

  if (!d) {
    d = await db
      .prepare(
        `SELECT d.id, d.signature_key, u.name, d.institution
         FROM directors d
         JOIN users u ON u.id = d.user_id
         ORDER BY (d.signature_key IS NOT NULL) DESC, d.id ASC
         LIMIT 1`
      )
      .first<{ id: number; signature_key: string | null; name: string; institution: string | null }>()
      .catch(() => null);
  }

  const fallbackKey = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(SETTING_DIRECTOR_SIGNATURE)
    .first<{ value: string | null }>()
    .catch(() => null);

  const key = d?.signature_key || fallbackKey?.value || null;
  return {
    id: d?.id ?? null,
    signatureUrl: key ? `/api/files/${key}` : null,
    name: d?.name || "পরিচালক",
    institution: d?.institution || null,
  };
}

export async function getSubjectTeachersMap(db: D1Database): Promise<Map<number, { name: string; shortName: string }>> {
  const map = new Map<number, { name: string; shortName: string }>();
  const rows = (
    await db
      .prepare(
        `SELECT ts.subject_id, u.name as teacher_name, t.short_name as teacher_short_name
         FROM teacher_subjects ts
         JOIN teachers t ON t.id = ts.teacher_id
         JOIN users u ON u.id = t.user_id`
      )
      .all<{ subject_id: number; teacher_name: string; teacher_short_name: string }>()
      .catch(() => null)
  )?.results ?? [];
  for (const r of rows) {
    map.set(r.subject_id, {
      name: r.teacher_name,
      shortName: r.teacher_short_name || (r.teacher_name ? r.teacher_name.slice(0, 2).toUpperCase() : ""),
    });
  }
  return map;
}
