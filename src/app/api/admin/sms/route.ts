// /api/admin/sms — Send SMS via configured gateway (Greenweb BD / SSL Wireless / REST)
import { getDb, getSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { BD_PHONE_RE, normalizeBdPhone } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      scope?: "ALL" | "CLASS" | "SELECTED";
      classId?: number;
      studentIds?: number[];
      message?: string;
    };

    const message = body.message?.trim();
    if (!message) {
      throw new ApiError(400, "বার্তা (SMS Text) লিখুন।");
    }

    let query = "SELECT id, name, roll, phone FROM students WHERE phone IS NOT NULL AND TRIM(phone) != ''";
    const params: any[] = [];

    // SAFETY: a CLASS-scoped SMS REQUIRES a classId. Without this guard a
    // missing classId silently fell through to ALL students (whole school).
    if (body.scope === "CLASS") {
      if (!body.classId) {
        throw new ApiError(400, "শ্রেণি-নির্দিষ্ট SMS-এর জন্য শ্রেণি নির্বাচন করা আবশ্যক।");
      }
      query += " AND class_id = ?";
      params.push(Number(body.classId));
    } else if (body.scope === "SELECTED") {
      if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
        throw new ApiError(400, "বাছাইকৃত SMS-এর জন্য অন্তত একজন শিক্ষার্থী নির্বাচন করুন।");
      }
      const placeholders = body.studentIds.map(() => "?").join(",");
      query += ` AND id IN (${placeholders})`;
      params.push(...body.studentIds);
    }

    const stmt = db.prepare(query);
    const result = params.length > 0 
      ? await stmt.bind(...params).all<{ id: number; name: string; roll: number; phone: string }>() 
      : await stmt.all<{ id: number; name: string; roll: number; phone: string }>();

    const students = result.results ?? [];
    if (students.length === 0) {
      throw new ApiError(400, "নির্বাচিত ক্যাটাগরিতে কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।");
    }

    // Normalize (Bengali digits -> ASCII, +880/880 -> 0) and validate real BD
    // mobile numbers. Previously numbers were silently DROPPED when invalid
    // (e.g. entered in Bengali numerals) — the guardian never received the
    // SMS and nobody knew. Skipped numbers are now reported back.
    const seen = new Set<string>();
    const validPhones: string[] = [];
    const skipped: { name: string; phone: string }[] = [];
    for (const s of students) {
      const p = normalizeBdPhone(s.phone || "");
      if (BD_PHONE_RE.test(p)) {
        if (!seen.has(p)) {
          seen.add(p);
          validPhones.push(p);
        }
      } else {
        skipped.push({ name: s.name, phone: s.phone || "" });
      }
    }
    const skippedNote =
      skipped.length > 0
        ? ` সতর্কতা: ${skipped.length} জনের নম্বর অবৈধ বলে বাদ দেওয়া হয়েছে।`
        : "";

    if (validPhones.length === 0) {
      throw new ApiError(400, "কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।");
    }

    // Check SMS Gateway API key from settings or env
    const cf = await getCloudflareEnv();
    const apiKey = (await getSetting("sms_gateway_api_key", "")).trim() 
      || String(cf?.SMS_API_KEY ?? process.env.SMS_API_KEY ?? "").trim();
    const gatewayUrl = (await getSetting("sms_gateway_url", "https://api.greenweb.com.bd/api.php")).trim()
      || String(cf?.SMS_GATEWAY_URL ?? process.env.SMS_GATEWAY_URL ?? "https://api.greenweb.com.bd/api.php").trim();

    let dispatched = false;
    let gatewayResponse = "";

    if (apiKey) {
      try {
        const payload = new URLSearchParams({
          token: apiKey,
          to: validPhones.join(","),
          message: message,
        });

        const res = await fetch(gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: payload.toString(),
        });

        gatewayResponse = await res.text().catch(() => "");
        dispatched = res.ok;
      } catch (err: any) {
        console.error("SMS Gateway Dispatch Failed:", err);
        throw new ApiError(502, `এসএমএস গেটওয়ে সংযোগ ত্রুটি: ${err?.message || "ব্যর্থ"}`);
      }
    } else {
      // In development or if key not set, clearly inform user
      return ok({
        message: `মোট ${validPhones.length} টি নম্বরে বার্তা প্রেরণের জন্য প্রস্তুত (রিয়েল গেটওয়ের জন্য অ্যাডমিন সেটিংস থেকে SMS_API_KEY কনফিগার করুন)।`,
        sentCount: validPhones.length,
        dispatched: false,
        sampleNumbers: validPhones.slice(0, 5),
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 10),
      });
    }

    return ok({
      message: `মোট ${validPhones.length} টি নম্বরে বার্তা সফলভাবে গেটওয়েতে প্রেরণ করা হয়েছে।`,
      sentCount: validPhones.length,
      dispatched,
      gatewayResponse: gatewayResponse.slice(0, 100),
      sampleNumbers: validPhones.slice(0, 5),
      skippedCount: skipped.length,
      skipped: skipped.slice(0, 10),
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
