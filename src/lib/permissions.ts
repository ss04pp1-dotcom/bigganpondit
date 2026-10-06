// Teacher subject permissions — always checked server-side from D1
// (teacher_subjects). Never hard-coded in React components.

import type { D1Database, SubjectRow } from "@/lib/db/types";

export interface SubjectWithClass extends SubjectRow {
  class_name: string;
}

/** All subjects a teacher is authorized to manage (joined with class name). */
export async function getTeacherSubjects(
  db: D1Database,
  teacherId: number | undefined | null
): Promise<SubjectWithClass[]> {
  if (!teacherId) return [];
  const res = await db
    .prepare(
      `SELECT s.*, c.name as class_name
       FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       JOIN classes c ON c.id = s.class_id
       WHERE ts.teacher_id = ?
       ORDER BY c.sort_order DESC, s.name`
    )
    .bind(teacherId)
    .all<SubjectWithClass & { class_name: string }>()
    .catch(() => null);
  return res?.results ?? [];
}

/**
 * Verify the teacher can manage a specific subject.
 * Returns the subject row when allowed, null otherwise.
 */
export async function teacherSubjectAllowed(
  db: D1Database,
  teacherId: number | undefined | null,
  subjectId: number
): Promise<SubjectWithClass | null> {
  if (!teacherId || !subjectId) return null;
  const row = await db
    .prepare(
      `SELECT s.*, c.name as class_name
       FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       JOIN classes c ON c.id = s.class_id
       WHERE ts.teacher_id = ? AND ts.subject_id = ?`
    )
    .bind(teacherId, subjectId)
    .first<SubjectWithClass & { class_name: string }>()
    .catch(() => null);
  return row ?? null;
}

/** Distinct class numbers the teacher has any subject in. */
export async function getTeacherClasses(
  db: D1Database,
  teacherId: number | undefined | null
): Promise<string[]> {
  if (!teacherId) return [];
  const res = await db
    .prepare(
      `SELECT DISTINCT c.name as class_name
       FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       JOIN classes c ON c.id = s.class_id
       WHERE ts.teacher_id = ?
       ORDER BY c.sort_order DESC`
    )
    .bind(teacherId)
    .all<{ class_name: string }>()
    .catch(() => null);
  return (res?.results ?? []).map((r) => r.class_name);
}

/** Whether the teacher may manage students/marks of this class (any subject in it). */
export async function teacherClassAllowed(
  db: D1Database,
  teacherId: number | undefined | null,
  classId: number
): Promise<boolean> {
  if (!teacherId || !classId) return false;
  // Fail-closed security: if teacher has no specific subjects assigned yet, deny access
  const anyAssigned = await db
    .prepare("SELECT 1 AS ok FROM teacher_subjects WHERE teacher_id = ? LIMIT 1")
    .bind(teacherId)
    .first<{ ok: number }>()
    .catch(() => null);
  if (!anyAssigned) return false;

  const row = await db
    .prepare(
      `SELECT 1 AS ok
       FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.teacher_id = ? AND s.class_id = ? LIMIT 1`
    )
    .bind(teacherId, classId)
    .first<{ ok: number }>()
    .catch(() => null);
  return !!row;
}
