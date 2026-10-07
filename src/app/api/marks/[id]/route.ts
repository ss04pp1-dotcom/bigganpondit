// /api/marks/[id] — PATCH (correct marks) / DELETE (admin).
// Teachers may only correct marks of their own authorized subjects.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { markUpdateSchema, parseJson } from "@/lib/validation";
import { teacherSubjectAllowed } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

async function loadMark(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  return await db
    .prepare(
      `SELECT m.id, m.exam_id, m.student_id, m.attendance, m.obtained_marks, e.total_marks, e.subject_id
       FROM marks m JOIN exams e ON e.id = m.exam_id WHERE m.id = ?`
    )
    .bind(id)
    .first<{ id: number; exam_id: number; student_id: number; attendance: string; obtained_marks: number; total_marks: number; subject_id: number }>(undefined as never)
    .catch(() => null);
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const id = Number((await ctx.params).id);
    const body = await parseJson(req, markUpdateSchema);

    const mark = await loadMark(db, id);
    if (!mark) throw new ApiError(404, MSG.notFound);

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherSubjectAllowed(db, user.teacherId, mark.subject_id);
      if (!allowed) throw new ApiError(403, MSG.noPermissionSubject);
    }

    const obtained = body.attendance === "ABSENT" ? 0 : Math.round(body.obtainedMarks * 100) / 100;
    if (obtained > mark.total_marks) {
      throw new ApiError(400, `প্রাপ্ত নম্বর ${mark.total_marks}-এর বেশি হতে পারে না।`);
    }

    await db
      .prepare("UPDATE marks SET attendance = ?, obtained_marks = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.attendance, obtained, id)
      .run();
    return ok({ message: MSG.updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const id = Number((await ctx.params).id);
    const mark = await loadMark(db, id);
    if (!mark) throw new ApiError(404, MSG.notFound);

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherSubjectAllowed(db, user.teacherId, mark.subject_id);
      if (!allowed) throw new ApiError(403, MSG.noPermissionSubject);
    }

    await db.prepare("DELETE FROM marks WHERE id = ?").bind(id).run();
    return ok({ message: MSG.deleted });
  } catch (e) {
    return handleError(e);
  }
}
