// /api/admin/teachers — teacher management (admin).
// GET: list with permissions. POST: create teacher + permissions.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, teacherCreateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const teachers = (
      await db
        .prepare(
          `SELECT t.id, t.user_id, t.short_name, t.photo_key, t.signature_key, u.name, u.username
           FROM teachers t JOIN users u ON u.id = t.user_id ORDER BY u.id`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    const links = (
      await db
        .prepare(
          `SELECT ts.teacher_id, ts.subject_id, s.name as subject_name, s.class_id, c.name as class_name, s.is_fourth_subject
           FROM teacher_subjects ts
           JOIN subjects s ON s.id = ts.subject_id
           JOIN classes c ON c.id = s.class_id`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    const subjects = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.is_fourth_subject, c.name as class_name
           FROM subjects s JOIN classes c ON c.id = s.class_id ORDER BY c.sort_order DESC, s.name`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    return ok({ teachers, links, subjects });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = await parseJson(req, teacherCreateSchema);

    const dup = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(body.username)
      .first<{ id: number }>()
      .catch(() => null);
    if (dup) throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে।");

    const hash = await hashPassword(body.password);
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'TEACHER')")
      .bind(body.name, body.username, hash)
      .run();
    const userId = Number(res.meta.last_row_id ?? 0);
    if (!userId) throw new ApiError(500, "সংরক্ষণ করা যায়নি।");

    await db.prepare("INSERT INTO teachers (user_id, short_name) VALUES (?, ?)").bind(userId, body.shortName).run();

    const teacher = await db.prepare("SELECT id FROM teachers WHERE user_id = ?").first<{ id: number }>().catch(() => null);
    if (teacher && body.subjectIds.length) {
      const stmts = body.subjectIds.map((sid) =>
        db.prepare("INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)").bind(teacher.id, sid)
      );
      await db.batch(stmts);
    }

    return ok({ message: MSG.saved }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
