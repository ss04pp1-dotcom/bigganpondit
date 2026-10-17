// /api/teachers — List teachers and their assigned subjects (accessible to authenticated users).
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(db);

    const teachers = (
      await db
        .prepare(
          `SELECT t.id, t.user_id, t.short_name, t.photo_key, t.signature_key, u.name, u.username
           FROM teachers t
           JOIN users u ON u.id = t.user_id
           ORDER BY u.name ASC`
        )
        .all<{
          id: number;
          user_id: number;
          short_name: string;
          photo_key: string | null;
          signature_key: string | null;
          name: string;
          username: string;
        }>()
        .catch(() => null)
    )?.results ?? [];

    const links = (
      await db
        .prepare(
          `SELECT ts.teacher_id, ts.subject_id, s.name as subject_name, s.class_id, c.name as class_name, s.is_fourth_subject
           FROM teacher_subjects ts
           JOIN subjects s ON s.id = ts.subject_id
           JOIN classes c ON c.id = s.class_id
           ORDER BY c.sort_order DESC, s.name ASC`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    return ok({
      teachers,
      links,
      currentTeacherId: user?.role === "TEACHER" ? user.teacherId : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
