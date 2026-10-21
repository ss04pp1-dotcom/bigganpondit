// /api/admin/sms — Send SMS via Phone SMS App (grouped/auto-batched) or optional SMS Gateway
import { getDb, getSetting, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { BD_PHONE_RE, normalizeBdPhone } from "@/lib/constants";

async function resolveGatewayConfig() {
  const cf = await getCloudflareEnv();
  const apiKey =
    (await getSetting("sms_gateway_api_key", "")).trim() ||
    String(cf?.SMS_API_KEY ?? process.env.SMS_API_KEY ?? "").trim();
  const gatewayUrl =
    (await getSetting("sms_gateway_url", "https://api.greenweb.com.bd/api.php")).trim() ||
    String(
      cf?.SMS_GATEWAY_URL ??
        process.env.SMS_GATEWAY_URL ??
        "https://api.greenweb.com.bd/api.php"
    ).trim();
  return { apiKey, gatewayUrl };
}

export async function GET() {
  try {
    await requireApiUser(["ADMIN"]);
    const { apiKey, gatewayUrl } = await resolveGatewayConfig();
    return ok({
      hasGatewayKey: Boolean(apiKey),
      gatewayUrl,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const body = (await req.json().catch(() => ({}))) as {
      apiKey?: string;
      gatewayUrl?: string;
    };
    if (body.apiKey !== undefined) {
      await setSetting("sms_gateway_api_key", body.apiKey.trim());
    }
    if (body.gatewayUrl !== undefined) {
      await setSetting(
        "sms_gateway_url",
        body.gatewayUrl.trim() || "https://api.greenweb.com.bd/api.php"
      );
    }
    const { apiKey, gatewayUrl } = await resolveGatewayConfig();
    return ok({
      message: apiKey
        ? "ঐচ্ছিক SMS গেটওয়ে কী সংরক্ষিত হয়েছে।"
        : "SMS গেটওয়ে কী মুছে ফেলা হয়েছে (ডিফল্ট ফোনের SMS অ্যাপ ব্যবহৃত হবে)।",
      hasGatewayKey: Boolean(apiKey),
      gatewayUrl,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      scope?: "ALL" | "CLASS" | "BATCH" | "SELECTED";
      classId?: number;
      batchId?: number;
      studentIds?: number[];
      message?: string;
      mode?: "PHONE_APP" | "GATEWAY" | "AUTO";
      groupSize?: number;
    };

    const message = body.message?.trim();
    if (!message) {
      throw new ApiError(400, "বার্তা (SMS Text) লিখুন।");
    }

    let query =
      "SELECT id, name, roll, phone FROM students WHERE phone IS NOT NULL AND TRIM(phone) != ''";
    const params: any[] = [];

    if (body.scope === "CLASS") {
      if (!body.classId) {
        throw new ApiError(400, "শ্রেণি-নির্দিষ্ট SMS-এর জন্য শ্রেণি নির্বাচন করা আবশ্যক।");
      }
      query += " AND class_id = ?";
      params.push(Number(body.classId));
    } else if (body.scope === "BATCH") {
      if (!body.batchId) {
        throw new ApiError(400, "ব্যাচ-নির্দিষ্ট SMS-এর জন্য ব্যাচ নির্বাচন করা আবশ্যক।");
      }
      query += " AND batch_id = ?";
      params.push(Number(body.batchId));
    } else if (body.scope === "SELECTED") {
      if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
        throw new ApiError(400, "বাছাইকৃত SMS-এর জন্য অন্তত একজন শিক্ষার্থী নির্বাচন করুন।");
      }
      const placeholders = body.studentIds.map(() => "?").join(",");
      query += ` AND id IN (${placeholders})`;
      params.push(...body.studentIds);
    }

    query += " ORDER BY class_id DESC, roll ASC";

    const stmt = db.prepare(query);
    const result =
      params.length > 0
        ? await stmt
            .bind(...params)
            .all<{ id: number; name: string; roll: number; phone: string }>()
        : await stmt.all<{ id: number; name: string; roll: number; phone: string }>();

    const students = result.results ?? [];
    if (students.length === 0) {
      throw new ApiError(400, "নির্বাচিত ক্যাটাগরিতে কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।");
    }

    const seen = new Set<string>();
    const validPhones: string[] = [];
    const recipients: { id: number; name: string; roll: number; phone: string }[] = [];
    const skipped: { name: string; phone: string }[] = [];

    for (const s of students) {
      const p = normalizeBdPhone(s.phone || "");
      if (BD_PHONE_RE.test(p)) {
        if (!seen.has(p)) {
          seen.add(p);
          validPhones.push(p);
          recipients.push({ id: s.id, name: s.name, roll: s.roll, phone: p });
        }
      } else {
        skipped.push({ name: s.name, phone: s.phone || "" });
      }
    }

    const skippedNote =
      skipped.length > 0
        ? ` (সতর্কতা: ${skipped.length} জনের নম্বর অবৈধ বলে বাদ দেওয়া হয়েছে)`
        : "";

    if (validPhones.length === 0) {
      throw new ApiError(400, "কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।");
    }

    const chunkSize = Math.min(100, Math.max(5, Number(body.groupSize) || 20));
    const groups: string[][] = [];
    const recipientGroups: { id: number; name: string; roll: number; phone: string }[][] = [];
    for (let i = 0; i < validPhones.length; i += chunkSize) {
      groups.push(validPhones.slice(i, i + chunkSize));
      recipientGroups.push(recipients.slice(i, i + chunkSize));
    }

    const { apiKey, gatewayUrl } = await resolveGatewayConfig();
    const requestedMode = body.mode || "PHONE_APP";
    const useGateway = requestedMode === "GATEWAY" || (requestedMode === "AUTO" && Boolean(apiKey));

    if (!useGateway || !apiKey) {
      return ok({
        message:
          groups.length > 1
            ? `মোট ${validPhones.length} টি নম্বর ${groups.length} টি গ্রুপে ভাগ করা হয়েছে। ফোনের SMS অ্যাপ দিয়ে পর্যায়ক্রমে প্রেরণ করুন।${skippedNote}`
            : `মোট ${validPhones.length} টি নম্বরে ফোনের SMS অ্যাপ দিয়ে বার্তা প্রেরণ শুরু হচ্ছে।${skippedNote}`,
        mode: "PHONE_APP",
        sentCount: validPhones.length,
        dispatched: false,
        phones: validPhones,
        groups,
        recipientGroups,
        groupSize: chunkSize,
        smsText: message,
        sampleNumbers: validPhones.slice(0, 5),
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 10),
      });
    }

    let dispatched = false;
    let gatewayResponse = "";

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

    return ok({
      message: `মোট ${validPhones.length} টি নম্বরে বার্তা সফলভাবে গেটওয়েতে প্রেরণ করা হয়েছে।${skippedNote}`,
      mode: "GATEWAY",
      sentCount: validPhones.length,
      dispatched,
      phones: validPhones,
      groups,
      recipientGroups,
      groupSize: chunkSize,
      smsText: message,
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
