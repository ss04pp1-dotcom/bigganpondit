// POST /api/auth/forgot-password — Request password reset OTP via Resend email
import { getDb, getSetting } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { SETTING_ADMIN_EMAIL } from "@/lib/constants";
import { sendPasswordResetEmail, getResendApiKey } from "@/lib/email/resend";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { FORGOT_RATE, assertNotRateLimited, clientIp, recordRateFailure } from "@/lib/auth/rate-limit";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const visible = name.slice(0, 2);
  return `${visible}***@${domain}`;
}

// The exact same response for "no such account", "no recovery email" and
// "provider not configured" — differing responses would let an attacker
// enumerate which usernames exist.
const GENERIC_RESPONSE = {
  ok: true,
  message: "যদি অ্যাকাউন্টের তথ্য সঠিক হয়, তবে রিকভারি মাধ্যমে নির্দেশনা পাঠানো হয়েছে।",
};

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      usernameOrEmail?: string;
    };

    const target = body.usernameOrEmail?.trim();
    if (!target) {
      throw new ApiError(400, "ইউজারনাম অথবা ইমেইল প্রদান করুন।");
    }

    // Throttle OTP requests per client (each request sends a paid email).
    const ipKey = `forgotpw:${clientIp(req)}`;
    await assertNotRateLimited(db, ipKey, FORGOT_RATE);

    // 1) Find user by username
    const user = await db
      .prepare("SELECT id, name, username, role FROM users WHERE username = ?")
      .bind(target)
      .first<{ id: number; name: string; username: string; role: string }>()
      .catch(() => null);

    if (!user) {
      // Timing-safe mitigation against username enumeration
      return ok(GENERIC_RESPONSE);
    }

    // 2) Find email address for user
    let email = "";
    if (user.role === "ADMIN") {
      email = await getSetting(SETTING_ADMIN_EMAIL, "");
      if (!email) {
        const cf = await getCloudflareEnv();
        email = String(cf?.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "");
      }
    }

    if (!email || !email.includes("@")) {
      // Previously a 400 here revealed that this account exists.
      console.error("[forgot-password] no recovery email configured for an existing account — returning generic response");
      return ok(GENERIC_RESPONSE);
    }

    // Check if Resend is configured
    const apiKey = await getResendApiKey();
    if (!apiKey) {
      console.error("[forgot-password] RESEND_API_KEY not configured — returning generic response");
      return ok(GENERIC_RESPONSE);
    }

    // 3) Generate 6-digit OTP
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const rawOtp = String(100000 + (array[0] % 900000));
    const otpHash = await hashPassword(rawOtp);

    // Expire old unused OTPs for this user
    await db
      .prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0")
      .bind(user.id)
      .run()
      .catch(() => null);

    // Save OTP to database (valid for 10 minutes)
    await db
      .prepare(
        `INSERT INTO password_resets (user_id, otp_hash, email, expires_at, used)
         VALUES (?, ?, ?, datetime('now', '+10 minutes'), 0)`
      )
      .bind(user.id, otpHash, email)
      .run();

    // 4) Send email via Resend
    const sendResult = await sendPasswordResetEmail({
      to: email,
      userName: user.name,
      otp: rawOtp,
    });

    if (!sendResult.ok) {
      console.error("[forgot-password] send failed:", sendResult.error);
      return ok(GENERIC_RESPONSE);
    }

    return ok({
      message: `আপনার রিকভারি ইমেইলে (${maskEmail(email)}) ৬-সংখ্যার ওটিপি কোড পাঠানো হয়েছে।`,
      emailMasked: maskEmail(email),
      // NOTE: userId intentionally NOT returned — it disclosed internal user
      // ids to unauthenticated callers. reset-password now accepts username.
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
