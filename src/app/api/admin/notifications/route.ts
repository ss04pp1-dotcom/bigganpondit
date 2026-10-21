// /api/admin/notifications — admin push-notification management.
//
// GET  → list notifications with delivery stats + audience/device counts.
// POST → create a notification:
//          * send now (scheduled_at = now → picked up by the next cron tick)
//          * scheduled for a future date/time (Asia/Dhaka input → UTC)
//          * recurring (DAILY / WEEKLY / MONTHLY, optional until-date)
//          * draft (no send until activated)
//
// Only ADMIN (and DIRECTOR where the existing panel allows) may use this —
// an unauthenticated client can never broadcast to academy users.
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { enqueueNotification, dhakaToUtcSql, getServerEnv } from "@/lib/push-service";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1000),
  deepLink: z
    .enum(["notices", "routine", "results", "home", "profile"])
    .optional()
    .nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  targetType: z.enum(["ALL", "STUDENTS", "TEACHERS", "CLASS", "USER"]).default("ALL"),
  targetClassId: z.number().int().positive().optional().nullable(),
  targetUserId: z.number().int().positive().optional().nullable(),
  // "now" → send immediately; "later" → scheduledAt required (Dhaka local).
  when: z.enum(["now", "later", "draft"]).default("now"),
  scheduledAt: z.string().max(32).optional().nullable(), // "YYYY-MM-DD HH:MM" Dhaka
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceUntil: z.string().max(32).optional().nullable(), // "YYYY-MM-DD" Dhaka
});

export async function GET(req: Request) {
  try {
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const kind = url.searchParams.get("kind") || "";

    const where: string[] = [];
    const params: unknown[] = [];
    if (status && /^(DRAFT|PENDING|PROCESSING|SENT|PARTIAL|FAILED|CANCELLED)$/.test(status)) {
      where.push("status = ?");
      params.push(status);
    }
    if (kind && /^(MANUAL|NOTICE|ROUTINE|RESULT|SYSTEM)$/.test(kind)) {
      where.push("kind = ?");
      params.push(kind);
    }

    const rows = await db
      .prepare(
        `SELECT id, title, body, deep_link, target_type, target_class_id, target_user_id,
                kind, status, scheduled_at, recurrence, recurrence_until, attempts,
                max_attempts, next_attempt_at, total_devices, sent_count, failed_count,
                error_message, created_by, created_at, updated_at
           FROM push_notifications
          ${where.length ? "WHERE " + where.join(" AND ") : ""}
          ORDER BY created_at DESC, id DESC
          LIMIT 200`
      )
      .bind(...params)
      .all()
      .catch(() => ({ results: [] }));

    // Active device registrations + audience preview counts.
    const devices = await db
      .prepare(
        `SELECT
           SUM(active) as active_total,
           SUM(CASE WHEN active = 1 AND user_id IN (SELECT user_id FROM students) THEN 1 ELSE 0 END) as students,
           SUM(CASE WHEN active = 1 AND user_id IN (SELECT user_id FROM teachers) THEN 1 ELSE 0 END) as teachers
         FROM device_tokens`
      )
      .first<{ active_total: number | null; students: number | null; teachers: number | null }>()
      .catch(() => null);

    const classes = await db
      .prepare(
        `SELECT c.id, c.name, COUNT(s.id) as student_count
           FROM classes c LEFT JOIN students s ON s.class_id = c.id
          GROUP BY c.id ORDER BY c.name`
      )
      .all<{ id: number; name: string; student_count: number }>()
      .catch(() => ({ results: [] }));

    const env = await getServerEnv();

    return ok({
      notifications: rows.results ?? [],
      devices: {
        total: devices?.active_total ?? 0,
        students: devices?.students ?? 0,
        teachers: devices?.teachers ?? 0,
      },
      classes: classes.results ?? [],
      fcmConfigured: true,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await parseJson(req, createSchema);

    if (body.targetType === "CLASS" && !body.targetClassId) {
      throw new ApiError(400, "শ্রেণি-ভিত্তিক নোটিফিকেশনের জন্য শ্রেণি নির্বাচন করুন।");
    }
    if (body.targetType === "USER" && !body.targetUserId) {
      throw new ApiError(400, "নির্দিষ্ট ব্যবহারকারী নির্বাচন করুন।");
    }
    if (body.when === "later" && !body.scheduledAt) {
      throw new ApiError(400, "সময় নির্ধারণ করুন (তারিখ ও সময়)।");
    }
    if (body.recurrence !== "NONE" && body.when === "draft") {
      throw new ApiError(400, "পুনরাবৃত্ত নোটিফিকেশন ড্রাফট হিসেবে রাখা যায় না।");
    }

    let scheduledAtUtc: string | null = null;
    if (body.when === "later" && body.scheduledAt) {
      try {
        scheduledAtUtc = dhakaToUtcSql(body.scheduledAt);
      } catch {
        throw new ApiError(400, "সময়ের ফরম্যাট সঠিক নয়।");
      }
      if (scheduledAtUtc <= new Date().toISOString().replace("T", " ").slice(0, 19)) {
        throw new ApiError(400, "নির্ধারিত সময় ভবিষ্যতে হতে হবে।");
      }
    }

    let recurrenceUntilUtc: string | null = null;
    if (body.recurrence !== "NONE" && body.recurrenceUntil) {
      // Date-only → end of that day (23:59 Dhaka).
      try {
        recurrenceUntilUtc = dhakaToUtcSql(`${body.recurrenceUntil} 23:59`);
      } catch {
        recurrenceUntilUtc = null;
      }
    }

    const result = await enqueueNotification(db, {
      title: body.title,
      body: body.body,
      deepLink: body.deepLink || null,
      imageUrl: body.imageUrl || null,
      targetType: body.targetType,
      targetClassId: body.targetClassId ?? null,
      targetUserId: body.targetUserId ?? null,
      kind: "MANUAL",
      scheduledAtUtc,
      recurrence:
        body.recurrence === "NONE" || body.when === "draft" ? null : body.recurrence,
      recurrenceUntilUtc,
      idempotencyKey: null, // manual sends may repeat intentionally
      createdBy: user.id,
      asDraft: body.when === "draft",
    });

    if (!result.created) {
      throw new ApiError(409, "একই নোটিফিকেশন ইতিমধ্যে আছে।");
    }

    return ok({
      id: result.id,
      message:
        body.when === "draft"
          ? "ড্রাফট সংরক্ষিত হয়েছে।"
          : body.when === "later"
            ? `নোটিফিকেশন নির্ধারিত সময়ে পাঠানো হবে (${body.scheduledAt})।`
            : "পুশ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
