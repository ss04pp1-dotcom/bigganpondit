// /api/teacher/student-requests — List student registration requests submitted by current teacher
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const { user, db } = await requireApiUser(["TEACHER"]);
    if (!user.teacherId) return ok({ requests: [], pendingCount: 0 });

    const rows = (
      await db
        .prepare(
          // SECURITY: never select sr.* — password_hash and raw_password must
          // never be returned to teachers.
          `SELECT sr.id, sr.teacher_id, sr.name, sr.class_id, sr.division, sr.section, sr.roll,
                  sr.username, sr.photo_key, sr.father_name, sr.father_occupation,
                  sr.mother_name, sr.mother_occupation, sr.guardian_name, sr.guardian_occupation,
                  sr.guardian_relation, sr.school_name, sr.phone, sr.address, sr.blood_group,
                  sr.dob, sr.status, sr.admin_notes, sr.reviewed_by, sr.reviewed_at,
                  sr.created_at, sr.updated_at,
                  c.name as class_name, rev.name as reviewer_name
           FROM student_requests sr
           JOIN classes c ON c.id = sr.class_id
           LEFT JOIN users rev ON rev.id = sr.reviewed_by
           WHERE sr.teacher_id = ?
           ORDER BY CASE WHEN sr.status = 'PENDING' THEN 0 ELSE 1 END, sr.id DESC`
        )
        .bind(user.teacherId)
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    const pendingCount = (
      await db
        .prepare("SELECT COUNT(*) as c FROM student_requests WHERE teacher_id = ? AND status = 'PENDING'")
        .bind(user.teacherId)
        .first<{ c: number }>()
        .catch(() => null)
    )?.c ?? 0;

    return ok({ requests: rows, pendingCount });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
