// POST /api/auth/forgot-password — Request password reset OTP via Resend email
import { getDb, getSetting } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { SETTING_ADMIN_EMAIL } from "@/lib/constants";
import { sendPasswordResetEmail, getResendApiKey } from "@/lib/email/resend";
import { getCloudflareEnv } from "@/lib/cloudflare";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const visible = name.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      usernameOrEmail?: string;
    };

    const target = body.usernameOrEmail?.trim();
    if (!target) {
      throw new ApiError(400, "ইউজারনেম অথবা ইমেইল প্রদান করুন।");
    }

    // 1) Find user by username
    const user = await db
      .prepare("SELECT id, name, username, role FROM users WHERE username = ?")
      .bind(target)
      .first<{ id: number; name: string; username: string; role: string }>()
      .catch(() => null);

    if (!user) {
      // Ambiguous error to prevent username enumeration if desired, but clear for school admins
      throw new ApiError(404, `ইউজারনেম '${target}' পাওয়া যায়নি।`);
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
      throw new ApiError(
        400,
        "এই অ্যাকাউন্টের জন্য কোনো রিকভারি ইমেইল কনফিগার করা নেই। অনুগ্রহ করে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।"
      );
    }

    // Check if Resend is configured
    const apiKey = await getResendApiKey();
    if (!apiKey) {
      throw new ApiError(
        400,
        "Resend Email API Key কনফিগার করা নেই। অ্যাডমিন সেটিংস থেকে RESEND_API_KEY সেট করুন।"
      );
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
      throw new ApiError(500, `ইমেইল পাঠানো যায়নি: ${sendResult.error}`);
    }

    return ok({
      message: `আপনার রিকভারি ইমেইলে (${maskEmail(email)}) ৬-সংখ্যার ওটিপি কোড পাঠানো হয়েছে।`,
      userId: user.id,
      emailMasked: maskEmail(email),
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
