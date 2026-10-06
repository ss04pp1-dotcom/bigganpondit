// /api/admin/subjects/[id] — PATCH / DELETE with marks-existence guard.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, subjectUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const id = Number((await ctx.params).id);
    const body = await parseJson(req, subjectUpdateSchema);

    const subj = await db
      .prepare("SELECT s.*, c.name as class_name FROM subjects s JOIN classes c ON c.id = s.class_id WHERE s.id = ?")
      .bind(id)
      .first<{ id: number; name: string; class_id: number; division: string | null; is_fourth_subject: number; class_name: string }>(undefined as never)
      .catch(() => null);
    if (!subj) throw new ApiError(404, MSG.notFound);

    let classId = subj.class_id;
    if (body.className) {
      const cls = await db.prepare("SELECT id, name FROM classes WHERE name = ?").bind(body.className).first<{ id: number; name: string }>(undefined as never).catch(() => null);
      if (!cls) throw new ApiError(404, "শ্রেণি পাওয়া যায়নি।");
      classId = cls.id;
      if ((cls.name === "9" || cls.name === "10") === false && body.division) {
        throw new ApiError(400, "এই শ্রেণিতে বিভাগ প্রযোজ্য নয়।");
      }
    }

    await db
      .prepare(
        "UPDATE subjects SET name = ?, class_id = ?, division = ?, is_fourth_subject = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(
        body.name ?? subj.name,
        classId,
        body.division !== undefined ? (body.division ?? null) : subj.division,
        body.isFourthSubject !== undefined ? (body.isFourthSubject ? 1 : 0) : subj.is_fourth_subject,
        id
      )
      .run();

    return ok({ message: MSG.updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const id = Number((await ctx.params).id);

    const subj = await db
      .prepare("SELECT id FROM subjects WHERE id = ?")
      .bind(id)
      .first<{ id: number }>(undefined as never)
      .catch(() => null);
    if (!subj) throw new ApiError(404, MSG.notFound);

    // guard: block deletion when marks exist for this subject
    const used = await db
      .prepare(
        `SELECT 1 FROM marks m JOIN exams e ON e.id = m.exam_id WHERE e.subject_id = ? LIMIT 1`
      )
      .bind(id)
      .first<{ 1: number }>(undefined as never)
      .catch(() => null);
    if (used) {
      throw new ApiError(400, "এই বিষয়ের নম্বর ইতোমধ্যে দেওয়া হয়েছে, তাই মুছে ফেলা যাবে না।");
    }

    await db.prepare("DELETE FROM subjects WHERE id = ?").bind(id).run();
    return ok({ message: MSG.deleted });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
