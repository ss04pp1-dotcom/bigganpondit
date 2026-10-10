// /api/admin/subjects — subject management (admin).

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, subjectCreateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN", "TEACHER", "DIRECTOR"]);
    const db = await getDb();
    const subjects = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.division, s.is_fourth_subject, c.name as class_name, c.sort_order,
                  GROUP_CONCAT(u.name, ', ') as teacher_names,
                  GROUP_CONCAT(t.short_name, ', ') as teacher_short_names
           FROM subjects s
           JOIN classes c ON c.id = s.class_id
           LEFT JOIN teacher_subjects ts ON ts.subject_id = s.id
           LEFT JOIN teachers t ON t.id = ts.teacher_id
           LEFT JOIN users u ON u.id = t.user_id
           GROUP BY s.id
           ORDER BY c.sort_order DESC, s.name`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];
    return ok({ subjects });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = await parseJson(req, subjectCreateSchema);

    const cls = await db
      .prepare("SELECT id, name FROM classes WHERE name = ?")
      .bind(body.className)
      .first<{ id: number; name: string }>()
      .catch(() => null);
    if (!cls) throw new ApiError(404, "শ্রেণি পাওয়া যায়নি।");

    if ((cls.name === "9" || cls.name === "10") === false && body.division) {
      throw new ApiError(400, "এই শ্রেণিতে বিভাগ প্রযোজ্য নয়।");
    }

    await db
      .prepare("INSERT INTO subjects (name, class_id, division, is_fourth_subject) VALUES (?, ?, ?, ?)")
      .bind(body.name, cls.id, body.division ?? null, body.isFourthSubject ? 1 : 0)
      .run();
    return ok({ message: MSG.saved }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
