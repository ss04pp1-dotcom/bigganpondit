// POST /api/auth/reset-password — Verify OTP and set new password
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { OTP_RATE, assertNotRateLimited, clearRateLimit, recordRateFailure } from "@/lib/auth/rate-limit";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      userId?: number;
      otp?: string;
      newPassword?: string;
    };

    const otp = body.otp?.trim();
    const newPassword = body.newPassword?.trim();
    const username = body.username?.trim();

    // Identify the user by username (forgot-password no longer returns the
    // internal userId — returning it leaked user ids to unauthenticated callers).
    let userId: number | null = null;
    if (username) {
      const user = await db
        .prepare("SELECT id FROM users WHERE username = ?")
        .bind(username)
        .first<{ id: number }>()
        .catch(() => null);
      userId = user?.id ?? null;
    } else if (body.userId) {
      const user = await db
        .prepare("SELECT id FROM users WHERE id = ?")
        .bind(Number(body.userId))
        .first<{ id: number }>()
        .catch(() => null);
      userId = user?.id ?? null;
    }

    if (!userId || !otp || !newPassword) {
      throw new ApiError(400, "ইউজারনাম, ওটিপি এবং নতুন পাসওয়ার্ড প্রদান করুন।");
    }

    if (newPassword.length < 4) {
      throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    // SECURITY: the OTP is a 6-digit code valid for 10 minutes — without an
    // attempt cap the 1M-code space is brute-forceable. Lock after 5 wrong tries.
    const otpKey = `otp:${userId}`;
    await assertNotRateLimited(db, otpKey, OTP_RATE);

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
      throw new ApiError(400, "ওটিপির মেয়াদ শেষ হয়ে গেছে অথবা কোনো সক্রিয় ওটিপি অনুরোধ পাওয়া যায়নি। পুনরায় ওটিপি পাঠান।");
    }

    const valid = await verifyPassword(otp, resetRow.otp_hash);
    if (!valid) {
      // Counts toward the 5-attempt lockout.
      await recordRateFailure(db, otpKey, OTP_RATE);
      throw new ApiError(400, "ভুল ওটিপি কোড। অনুগ্রহ করে সঠিক ৬-সংখ্যার কোড লিখুন।");
    }
    await clearRateLimit(db, otpKey);

    // Hash and update password
    const newHash = await hashPassword(newPassword);
    await db
      .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newHash, userId)
      .run();

    // SECURITY: clear the mirrored raw_password so the admin reveal feature
    // can never display a stale password after a reset.
    await db
      .prepare("UPDATE students SET raw_password = NULL, updated_at = datetime('now') WHERE user_id = ?")
      .bind(userId)
      .run()
      .catch(() => null);

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
