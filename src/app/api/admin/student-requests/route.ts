// /api/admin/student-requests — List student registration requests submitted by teachers (Admin only)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "PENDING"; // PENDING | ALL | APPROVED | REJECTED

    const whereClause = status === "ALL" ? "1=1" : "sr.status = ?";
    const params = status === "ALL" ? [] : [status];

    const rows = (
      await db
        .prepare(
          `SELECT sr.*, c.name as class_name, u.name as teacher_name, t.short_name as teacher_short_name,
                  rev.name as reviewer_name
           FROM student_requests sr
           JOIN classes c ON c.id = sr.class_id
           LEFT JOIN teachers t ON t.id = sr.teacher_id
           LEFT JOIN users u ON u.id = t.user_id
           LEFT JOIN users rev ON rev.id = sr.reviewed_by
           WHERE ${whereClause}
           ORDER BY CASE WHEN sr.status = 'PENDING' THEN 0 ELSE 1 END, sr.id DESC`
        )
        .bind(...params)
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    const pendingCount = (
      await db
        .prepare("SELECT COUNT(*) as c FROM student_requests WHERE status = 'PENDING'")
        .first<{ c: number }>()
        .catch(() => null)
    )?.c ?? 0;

    return ok({ requests: rows, pendingCount });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
