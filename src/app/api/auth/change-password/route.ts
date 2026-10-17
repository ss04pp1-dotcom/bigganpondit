// POST /api/auth/change-password — User changes their own password
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();

    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      throw new ApiError(400, "বর্তমান পাসওয়ার্ড ও নতুন পাসওয়ার্ড উভয়টি আবশ্যক।");
    }

    if (body.newPassword.length < 4) {
      throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    // Verify current password
    const userRow = await db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ password_hash: string }>()
      .catch(() => null);

    if (!userRow) throw new ApiError(404, "ইউজার পাওয়া যায়নি।");

    const valid = await verifyPassword(body.currentPassword, userRow.password_hash);
    if (!valid) {
      throw new ApiError(400, "বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
    }

    if (user.role !== "ADMIN") {
      throw new ApiError(
        403,
        "শিক্ষক ও শিক্ষার্থীদের সরাসরি পাসওয়ার্ড পরিবর্তন নিষিদ্ধ। অ্যাডমিনের অনুমোদনের জন্য পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠান।"
      );
    }

    const newHash = await hashPassword(body.newPassword);
    // SECURITY: invalidate every active session for this user so a stolen
    // session cannot outlive a password change.
    await db.batch([
      db
        .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newHash, user.id),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    ]);

    return ok({
      message: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। নিরাপত্তার জন্য সব সেশন বাতিল করা হয়েছে — নতুন পাসওয়ার্ড দিয়ে আবার লগইন করুন।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
