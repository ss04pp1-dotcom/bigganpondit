// /api/students/[id] — GET / PATCH / DELETE with ownership + class permission checks.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, studentUpdateSchema } from "@/lib/validation";
import { teacherClassAllowed } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

async function loadStudent(db: Awaited<ReturnType<typeof getDb>>, id: number) {
  return await db
    .prepare(
      `SELECT st.*, c.name as class_name, u.username
       FROM students st JOIN classes c ON c.id = st.class_id JOIN users u ON u.id = st.user_id
       WHERE st.id = ?`
    )
    .bind(id)
    .first<Record<string, unknown> & { user_id: number; class_name: string; username: string; class_id: number; division: string | null; section: string | null; roll: number; name: string }>(undefined as never)
    .catch(() => null);
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { user, db } = await requireApiUser();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    // Ownership: a student may only read their own record.
    if (user.role === "STUDENT" && user.studentId !== id) {
      throw new ApiError(403, MSG.noPermissionView);
    }

    const st = await loadStudent(db, id);
    if (!st) throw new ApiError(404, MSG.notFound);

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, st.class_id);
      if (!allowed) throw new ApiError(403, MSG.noPermissionView);
    }

    const { user_id, password_hash, ...safe } = st as Record<string, unknown>;
    void user_id;
    void password_hash;
    return ok({ student: safe });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const id = Number((await ctx.params).id);
    const body = await parseJson(req, studentUpdateSchema);

    const st = await loadStudent(db, id);
    if (!st) throw new ApiError(404, MSG.notFound);

    const targetClassId = body.className
      ? (await db.prepare("SELECT id FROM classes WHERE name = ?").bind(body.className).first<{ id: number }>(undefined as never).catch(() => null))?.id ?? 0
      : st.class_id;
    if (!targetClassId) throw new ApiError(400, "শ্রেণি পাওয়া যায়নি।");

    const targetClassName = body.className ?? st.class_name;
    const targetDivision = body.division !== undefined ? (body.division ?? null) : st.division;
    const requiresDivision = targetClassName === "9" || targetClassName === "10";
    if (requiresDivision && !targetDivision) {
      throw new ApiError(400, "৯ম/১০ম শ্রেণির জন্য বিভাগ নির্বাচন করুন।");
    }
    if (!requiresDivision && targetDivision) {
      throw new ApiError(400, "৬ষ্ঠ–৮ম শ্রেণিতে বিভাগ প্রযোজ্য নয়।");
    }

    if (user.role === "TEACHER" && user.teacherId) {
      const allowedCurrent = await teacherClassAllowed(db, user.teacherId, st.class_id);
      const allowedTarget = await teacherClassAllowed(db, user.teacherId, targetClassId);
      if (!allowedCurrent || !allowedTarget) throw new ApiError(403, MSG.noPermissionSubject);
    }

    // username uniqueness (excluding self)
    if (body.username && body.username !== st.username) {
      const dup = await db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .bind(body.username, st.user_id)
        .first<{ id: number }>(undefined as never)
        .catch(() => null);
      if (dup) throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে।");
    }

    // roll uniqueness within class+division (excluding self)
    if (body.roll !== undefined) {
      const dup = await db
        .prepare(
          `SELECT id FROM students WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '') AND roll = ? AND id != ?`
        )
        .bind(targetClassId, targetDivision, body.roll, id)
        .first<{ id: number }>(undefined as never)
        .catch(() => null);
      if (dup) throw new ApiError(400, "এই রোল নম্বর ইতোমধ্যে ব্যবহৃত হয়েছে।");
    }

    if (body.name !== undefined) {
      await db.prepare("UPDATE students SET name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.name, id).run();
      await db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.name, st.user_id).run();
    }
    if (body.className !== undefined && targetClassId) {
      await db.prepare("UPDATE students SET class_id = ?, updated_at = datetime('now') WHERE id = ?").bind(targetClassId, id).run();
    }
    if (body.division !== undefined || body.section !== undefined) {
      await db
        .prepare("UPDATE students SET division = ?, section = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(targetDivision, body.section !== undefined ? (body.section ?? null) : st.section, id)
        .run();
    }
    if (body.roll !== undefined) {
      await db.prepare("UPDATE students SET roll = ?, updated_at = datetime('now') WHERE id = ?").bind(body.roll, id).run();
    }
    if (body.fatherName !== undefined) {
      await db.prepare("UPDATE students SET father_name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.fatherName ?? null, id).run();
    }
    if (body.motherName !== undefined) {
      await db.prepare("UPDATE students SET mother_name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.motherName ?? null, id).run();
    }
    if (body.schoolName !== undefined) {
      await db.prepare("UPDATE students SET school_name = ?, updated_at = datetime('now') WHERE id = ?").bind(body.schoolName ?? null, id).run();
    }
    if (body.phone !== undefined) {
      await db.prepare("UPDATE students SET phone = ?, updated_at = datetime('now') WHERE id = ?").bind(body.phone ?? null, id).run();
    }
    if (body.address !== undefined) {
      await db.prepare("UPDATE students SET address = ?, updated_at = datetime('now') WHERE id = ?").bind(body.address ?? null, id).run();
    }
    if (body.bloodGroup !== undefined) {
      await db.prepare("UPDATE students SET blood_group = ?, updated_at = datetime('now') WHERE id = ?").bind(body.bloodGroup ?? null, id).run();
    }
    if (body.dob !== undefined) {
      await db.prepare("UPDATE students SET dob = ?, updated_at = datetime('now') WHERE id = ?").bind(body.dob ?? null, id).run();
    }
    if (body.username) {
      await db.prepare("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?").bind(body.username, st.user_id).run();
    }
    if (body.password) {
      const hash = await hashPassword(body.password);
      await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(hash, st.user_id).run();
    }

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

    const st = await loadStudent(db, id);
    if (!st) throw new ApiError(404, MSG.notFound);

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, st.class_id);
      if (!allowed) throw new ApiError(403, MSG.noPermissionSubject);
    }

    // Deleting the user cascades: students row, marks, sessions — no orphans.
    await db.prepare("DELETE FROM users WHERE id = ?").bind(st.user_id).run();
    return ok({ message: MSG.deleted });
  } catch (e) {
    return handleError(e);
  }
}
