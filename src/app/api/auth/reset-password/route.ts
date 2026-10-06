// POST /api/auth/reset-password — Verify OTP and set new password
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      userId?: number;
      otp?: string;
      newPassword?: string;
    };

    const userId = Number(body.userId);
    const otp = body.otp?.trim();
    const newPassword = body.newPassword?.trim();

    if (!userId || !otp || !newPassword) {
      throw new ApiError(400, "ইউজার আইডি, ওটিপি এবং নতুন পাসওয়ার্ড প্রদান করুন।");
    }

    if (newPassword.length < 4) {
      throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    // Find active non-expired reset request
    const resetRow = await db
      .prepare(
        `SELECT id, otp_hash, expires_at
         FROM password_resets
         WHERE user_id = ? AND used = 0 AND expires_at > datetime('now')
         ORDER BY id DESC LIMIT 1`
      )
      .bind(userId)
      .first<{ id: number; otp_hash: string; expires_at: string }>()
      .catch(() => null);

    if (!resetRow) {
      throw new ApiError(400, "ওটিপির মেয়াদ শেষ হয়ে গেছে অথবা কোনো সক্রিয় ওটিপি অনুরোধ পাওয়া যায়নি। পুনরায় ওটিপি পাঠান।");
    }

    const valid = await verifyPassword(otp, resetRow.otp_hash);
    if (!valid) {
      throw new ApiError(400, "ভুল ওটিপি কোড। অনুগ্রহ করে সঠিক ৬-সংখ্যার কোড লিখুন।");
    }

    // Hash and update password
    const newHash = await hashPassword(newPassword);
    await db
      .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newHash, userId)
      .run();

    // Mark reset request as used
    await db
      .prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
      .bind(resetRow.id)
      .run();

    // Invalidate old sessions for safety
    await db
      .prepare("DELETE FROM sessions WHERE user_id = ?")
      .bind(userId)
      .run()
      .catch(() => null);

    return ok({
      message: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
