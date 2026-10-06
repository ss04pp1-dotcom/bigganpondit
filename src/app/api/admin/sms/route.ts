// /api/admin/sms — Send SMS via configured gateway (Greenweb BD / SSL Wireless / REST)
import { getDb, getSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { getCloudflareEnv } from "@/lib/cloudflare";

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

    if (body.scope === "CLASS" && body.classId) {
      query += " AND class_id = ?";
      params.push(Number(body.classId));
    } else if (body.scope === "SELECTED" && Array.isArray(body.studentIds) && body.studentIds.length > 0) {
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

    // Deduplicate and format valid BD phone numbers
    const validPhones = Array.from(
      new Set(
        students
          .map((s) => s.phone.replace(/[^0-9+]/g, ""))
          .filter((p) => p.length >= 10)
      )
    );

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
      });
    }

    return ok({
      message: `মোট ${validPhones.length} টি নম্বরে বার্তা সফলভাবে গেটওয়েতে প্রেরণ করা হয়েছে।`,
      sentCount: validPhones.length,
      dispatched,
      gatewayResponse: gatewayResponse.slice(0, 100),
      sampleNumbers: validPhones.slice(0, 5),
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
