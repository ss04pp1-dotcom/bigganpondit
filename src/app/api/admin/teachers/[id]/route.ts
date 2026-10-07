// /api/admin/teachers/[id] — PATCH (edit / reset password / permissions), DELETE.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, teacherUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const id = Number((await ctx.params).id);
    const body = await parseJson(req, teacherUpdateSchema);

    const teacher = await db
      .prepare("SELECT t.id, t.user_id, u.username FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = ?")
      .bind(id)
      .first<{ id: number; user_id: number; username: string }>(undefined as never)
      .catch(() => null);
    if (!teacher) throw new ApiError(404, MSG.notFound);

    if (body.name) {
      await db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.name, teacher.user_id).run();
    }
    if (body.username && body.username !== teacher.username) {
      const dup = await db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .bind(body.username, teacher.user_id)
        .first<{ id: number }>(undefined as never)
        .catch(() => null);
      if (dup) throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে।");
      await db.prepare("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?").bind(body.username, teacher.user_id).run();
    }
    if (body.password) {
      const hash = await hashPassword(body.password);
      await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(hash, teacher.user_id).run();
    }
    if (body.shortName !== undefined) {
      await db.prepare("UPDATE teachers SET short_name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.shortName, id).run();
    }
    if (body.subjectIds) {
      // replace the whole permission set
      await db.prepare("DELETE FROM teacher_subjects WHERE teacher_id = ?").bind(id).run();
      if (body.subjectIds.length) {
        const stmts = body.subjectIds.map((sid) =>
          db.prepare("INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)").bind(id, sid)
        );
        await db.batch(stmts);
      }
    }

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

    const teacher = await db
      .prepare("SELECT t.user_id, t.signature_key FROM teachers t WHERE t.id = ?")
      .bind(id)
      .first<{ user_id: number; signature_key: string | null }>(undefined as never)
      .catch(() => null);
    if (!teacher) throw new ApiError(404, MSG.notFound);

    // deleting the user cascades: teachers row, permissions, sessions
    await db.prepare("DELETE FROM users WHERE id = ?").bind(teacher.user_id).run();
    return ok({ message: MSG.deleted });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
