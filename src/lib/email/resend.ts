// Resend email sender — works in both Cloudflare Workers and Node/Bun using standard fetch.
import { getDb, getSetting } from "@/lib/db";
import { SETTING_RESEND_API_KEY, SETTING_RESEND_FROM, DEFAULT_ACADEMY_NAME, SETTING_ACADEMY_NAME, bn } from "@/lib/constants";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function getResendApiKey(): Promise<string | null> {
  // 1) Database settings
  const dbKey = await getSetting(SETTING_RESEND_API_KEY, "");
  if (dbKey?.trim()) return dbKey.trim();

  // 2) Process environment
  if (process.env.RESEND_API_KEY?.trim()) return process.env.RESEND_API_KEY.trim();

  // 3) Cloudflare environment
  const cf = await getCloudflareEnv();
  if (typeof cf?.RESEND_API_KEY === "string" && cf.RESEND_API_KEY.trim()) {
    return cf.RESEND_API_KEY.trim();
  }

  return null;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  otp,
}: {
  to: string;
  userName: string;
  otp: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = await getResendApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: "Resend API Key কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন সেটিংস অথবা Environment Variables-এ RESEND_API_KEY যুক্ত করুন।",
    };
  }

  const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
  const fromEmail = (await getSetting(SETTING_RESEND_FROM, "")).trim() || "Biggan Pondit Security <onboarding@resend.dev>";

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 20px;">${academyName}</h2>
        <p style="color: #64748b; margin: 0; font-size: 13px;">নিরাপত্তা ও পাসওয়ার্ড রিসেট যাচাইকরণ</p>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        আসসালামু আলাইকুম <strong>${userName}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        আপনার অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পাওয়া গেছে। পাসওয়ার্ড পরিবর্তনের জন্য নিচের ৬-সংখ্যার ওটিপি (OTP) কোডটি ব্যবহার করুন:
      </p>

      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 14px 32px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #dc2626; font-size: 12px; margin-top: 8px; font-weight: 600;">
          ⏳ এই কোডটির মেয়াদ পরবর্তী ১০ মিনিট পর্যন্ত কার্যকর থাকবে।
        </p>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
        ⚠️ যদি আপনি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। আপনার অ্যাকাউন্ট এখনও সম্পূর্ণ সুরক্ষিত রয়েছে।
      </p>

      <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
        স্বয়ংক্রিয় বার্তা — দয়া করে এই ইমেইলে উত্তর দেবেন না। • ${academyName}
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `[${otp}] ${academyName} — পাসওয়ার্ড রিসেট কোড`,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as any)?.message || `Resend error (${res.status})`;
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "ইমেইল পাঠাতে ব্যর্থ হয়েছে।" };
  }
}
