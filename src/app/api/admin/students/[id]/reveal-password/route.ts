// /api/admin/students/[id]/reveal-password
// Strictly Admin-only endpoint to reveal/view student password.
// SECURITY: revealing requires re-entering the ADMIN's OWN password —
// the old flow "verified" via a fake 650ms fingerprint spinner.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { OTP_RATE, assertNotRateLimited, clearRateLimit, recordRateFailure } from "@/lib/auth/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    // STRICT SECURITY: Only ADMIN can view student passwords
    const { user, db } = await requireApiUser(["ADMIN"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ভুল শিক্ষার্থী আইডি।");

    const body = (await req.json().catch(() => ({}))) as { adminPassword?: string };
    const adminPassword = body.adminPassword ?? "";

    // REAL verification: the admin must re-enter their own password.
    const rlKey = `reveal:${user.id}`;
    await assertNotRateLimited(db, rlKey, OTP_RATE);
    const adminRow = await db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ password_hash: string }>()
      .catch(() => null);
    if (!adminRow || !(await verifyPassword(adminPassword, adminRow.password_hash))) {
      await recordRateFailure(db, rlKey, OTP_RATE);
      throw new ApiError(401, "আপনার পাসওয়ার্ড সঠিক নয়।");
    }
    await clearRateLimit(db, rlKey);

    const st = await db
      .prepare(
        `SELECT st.id, st.name, st.roll, st.raw_password, st.user_id,
                c.name as class_name, u.username
         FROM students st
         JOIN classes c ON c.id = st.class_id
         JOIN users u ON u.id = st.user_id
         WHERE st.id = ?`
      )
      .bind(id)
      .first<{
        id: number;
        name: string;
        roll: number;
        raw_password: string | null;
        user_id: number;
        class_name: string;
        username: string;
      }>();

    if (!st) throw new ApiError(404, "শিক্ষার্থী পাওয়া যায়নি।");

    let password = st.raw_password;
    // SECURITY: never fabricate a password. If raw_password is missing (the
    // password was reset through OTP / admin approval), the caller must set a
    // new password instead of being shown a wrong default.

    return ok({
      studentId: st.id,
      studentName: st.name,
      roll: st.roll,
      className: st.class_name,
      username: st.username,
      password: password,
      passwordAvailable: !!password,
      revealedBy: user.name || user.username,
      revealedAt: new Date().toISOString(),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    // STRICT SECURITY: Only ADMIN can reset/update student password
    const { user, db } = await requireApiUser(["ADMIN"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ভুল শিক্ষার্থী আইডি।");

    const body = (await req.json().catch(() => ({}))) as { newPassword?: string };
    const newPassword = body.newPassword?.trim();
    if (!newPassword || newPassword.length < 4) {
      throw new ApiError(400, "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    const st = await db
      .prepare("SELECT user_id, name FROM students WHERE id = ?")
      .bind(id)
      .first<{ user_id: number; name: string }>();

    if (!st) throw new ApiError(404, "শিক্ষার্থী পাওয়া যায়নি।");

    const newHash = await hashPassword(newPassword);

    // SECURITY: a password reset must kick out any stolen session that is
    // still active for this student.
    await db.batch([
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(newHash, st.user_id),
      db.prepare("UPDATE students SET raw_password = ?, updated_at = datetime('now') WHERE id = ?").bind(newPassword, id),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(st.user_id),
    ]);

    return ok({
      message: `${st.name}-এর নতুন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে।`,
      password: newPassword,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
