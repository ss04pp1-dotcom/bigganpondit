// /api/admin/credentials — Admin updates username, password, recovery email and Resend settings
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { setSetting } from "@/lib/db";
import { SETTING_ADMIN_EMAIL, SETTING_RESEND_API_KEY, SETTING_RESEND_FROM } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN"]);

    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      name?: string;
      username?: string;
      newPassword?: string;
      adminEmail?: string;
      resendApiKey?: string;
      resendFromEmail?: string;
    };

    if (!body.currentPassword) {
      throw new ApiError(400, "নিরাপত্তার স্বার্থে আপনার বর্তমান পাসওয়ার্ড প্রদান আবশ্যক।");
    }

    // Verify current admin password
    const userRow = await db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ password_hash: string }>()
      .catch(() => null);

    if (!userRow) throw new ApiError(404, "অ্যাডমিন একাউন্ট পাওয়া যায়নি।");

    const valid = await verifyPassword(body.currentPassword, userRow.password_hash);
    if (!valid) {
      throw new ApiError(400, "বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
    }

    // Update username / name if provided
    if (body.username && body.username.trim() !== user.username) {
      const newU = body.username.trim();
      const dup = await db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .bind(newU, user.id)
        .first<{ id: number }>()
        .catch(() => null);
      if (dup) {
        throw new ApiError(400, `ইউজারনেম '${newU}' ইতোমধ্যে অন্য কারও দ্বারা ব্যবহৃত।`);
      }
      await db
        .prepare("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newU, user.id)
        .run();
    }

    if (body.name && body.name.trim()) {
      await db
        .prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(body.name.trim(), user.id)
        .run();
    }

    // Update password if new password provided
    if (body.newPassword && body.newPassword.trim()) {
      if (body.newPassword.length < 4) {
        throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
      }
      const newHash = await hashPassword(body.newPassword.trim());
      await db
        .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newHash, user.id)
        .run();
    }

    // Update Recovery Email in settings if provided
    if (body.adminEmail !== undefined) {
      await setSetting(SETTING_ADMIN_EMAIL, body.adminEmail.trim());
    }

    // Update Resend API Key if provided
    if (body.resendApiKey !== undefined) {
      await setSetting(SETTING_RESEND_API_KEY, body.resendApiKey.trim());
    }

    if (body.resendFromEmail !== undefined) {
      await setSetting(SETTING_RESEND_FROM, body.resendFromEmail.trim());
    }

    return ok({
      message: "অ্যাডমিন তথ্য ও সিকিউরিটি সেটিংস সফলভাবে আপডেট করা হয়েছে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
