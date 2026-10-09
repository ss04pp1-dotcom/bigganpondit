// /api/admin/teachers/[id] — PATCH (edit / reset password / permissions), DELETE.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, teacherUpdateSchema } from "@/lib/validation";
import { getBucket } from "@/lib/storage/r2";

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
      .prepare("SELECT t.user_id, t.signature_key, t.photo_key FROM teachers t WHERE t.id = ?")
      .bind(id)
      .first<{ user_id: number; signature_key: string | null; photo_key: string | null }>(undefined as never)
      .catch(() => null);
    if (!teacher) throw new ApiError(404, MSG.notFound);

    // Detach rows that referenced users(id) WITHOUT an ON DELETE action —
    // on D1 (FKs enforced) deleting an active teacher who ever authored a
    // notice, uploaded a notebook, or recorded attendance died with a 500.
    await db
      .prepare("UPDATE notices SET author_id = NULL WHERE author_id = ?")
      .bind(teacher.user_id)
      .run()
      .catch(() => {});
    await db
      .prepare("UPDATE attendance SET recorded_by = NULL WHERE recorded_by = ?")
      .bind(teacher.user_id)
      .run()
      .catch(() => {});
    try {
      await db.prepare("UPDATE notebooks SET uploaded_by = NULL WHERE uploaded_by = ?").bind(teacher.user_id).run();
    } catch {
      // Legacy table shape: uploaded_by is NOT NULL — remove the notebooks
      // (and their R2 objects) instead of leaving dangling references.
      const nbs = (
        (await db
          .prepare("SELECT file_key FROM notebooks WHERE uploaded_by = ?")
          .bind(teacher.user_id)
          .all<{ file_key: string | null }>()
          .catch(() => null))?.results
      ) ?? [];
      await db.prepare("DELETE FROM notebooks WHERE uploaded_by = ?").bind(teacher.user_id).run().catch(() => {});
      try {
        const bucket = await getBucket();
        for (const nb of nbs) {
          if (nb.file_key && nb.file_key.startsWith("academy/notebooks/")) {
            await bucket.delete(nb.file_key).catch(() => {});
          }
        }
      } catch {
        // storage unavailable — rows already removed
      }
    }

    // deleting the user cascades: teachers row, permissions, sessions
    await db.prepare("DELETE FROM users WHERE id = ?").bind(teacher.user_id).run();

    // Remove the teacher's R2 photo/signature objects (previously orphaned).
    try {
      const bucket = await getBucket();
      if (teacher.signature_key) await bucket.delete(teacher.signature_key).catch(() => {});
      if (teacher.photo_key) await bucket.delete(teacher.photo_key).catch(() => {});
    } catch {
      // storage unavailable — account already deleted
    }

    return ok({ message: MSG.deleted });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
