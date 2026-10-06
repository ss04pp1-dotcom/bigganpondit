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
          `SELECT sr.*, c.name as class_name, rev.name as reviewer_name
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
