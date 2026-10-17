// /api/admin/notifications/[id] — edit / cancel / delete / retry / activate.
//
// PATCH:
//   { action: "cancel" }                → CANCELLED (only PENDING/DRAFT/PROCESSING-failed)
//   { action: "activate" }              → DRAFT → PENDING now
//   { action: "retry" }                 → FAILED → PENDING (resets attempts)
//   { action: "edit", title?, body?...} → edit DRAFT / future PENDING fields
// DELETE:
//   removes DRAFT or CANCELLED rows only (audit trail of sends is kept).
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { activateDraft, dhakaToUtcSql, processDueNotifications, utcSqlToDhaka } from "@/lib/push-service";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["cancel", "activate", "retry", "edit", "resend"]),
  title: z.string().trim().min(2).max(120).optional(),
  body: z.string().trim().min(2).max(1000).optional(),
  deepLink: z.enum(["notices", "routine", "results", "home", "profile"]).optional().nullable(),
  targetType: z.enum(["ALL", "STUDENTS", "TEACHERS", "CLASS", "USER"]).optional(),
  targetClassId: z.number().int().positive().optional().nullable(),
  scheduledAt: z.string().max(32).optional(), // Dhaka local "YYYY-MM-DD HH:MM"
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "অবৈধ আইডি।");

    const body = await parseJson(req, patchSchema);

    const row = await db
      .prepare("SELECT id, status, recurrence FROM push_notifications WHERE id = ?")
      .bind(id)
      .first<{ id: number; status: string; recurrence: string | null }>()
      .catch(() => null);
    if (!row) throw new ApiError(404, "নোটিফিকেশন পাওয়া যায়নি।");

    switch (body.action) {
      case "cancel": {
        if (!["PENDING", "DRAFT", "PROCESSING", "FAILED"].includes(row.status)) {
          throw new ApiError(400, "শুধু অপেক্ষমাণ/ড্রাফট/ব্যর্থ নোটিফিকেশন বাতিল করা যায়।");
        }
        await db
          .prepare(
            `UPDATE push_notifications SET status = 'CANCELLED', updated_at = datetime('now')
              WHERE id = ? AND status != 'SENT' AND status != 'PARTIAL'`
          )
          .bind(id)
          .run();
        return ok({ cancelled: true });
      }

      case "activate": {
        if (row.status !== "DRAFT") throw new ApiError(400, "শুধু ড্রাফট সক্রিয় করা যায়।");
        const activated = await activateDraft(db, id);
        if (!activated) throw new ApiError(409, "সক্রিয় করা যায়নি — আবার চেষ্টা করুন।");
        return ok({ activated: true, message: "নোটিফিকেশন কিউতে যোগ হয়েছে।" });
      }

      case "retry":
      case "resend": {
        await db
          .prepare(
            `UPDATE push_notifications
               SET status = 'PENDING', attempts = 0, next_attempt_at = NULL,
                   error_message = NULL, scheduled_at = datetime('now'),
                   sent_count = 0, failed_count = 0, total_devices = 0, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(id)
          .run();
        processDueNotifications(db).catch(() => null);
        return ok({ retried: true, message: "পুনরায় পাঠানো হচ্ছে..." });
      }

      case "edit": {
        if (!["DRAFT", "PENDING"].includes(row.status)) {
          throw new ApiError(400, "শুধু ড্রাফট বা অপেক্ষমাণ নোটিফিকেশন সম্পাদনা করা যায়।");
        }
        const sets: string[] = [];
        const vals: unknown[] = [];
        if (body.title) {
          sets.push("title = ?");
          vals.push(body.title);
        }
        if (body.body) {
          sets.push("body = ?");
          vals.push(body.body);
        }
        if (body.deepLink !== undefined) {
          sets.push("deep_link = ?");
          vals.push(body.deepLink || null);
        }
        if (body.targetType) {
          sets.push("target_type = ?");
          vals.push(body.targetType);
        }
        if (body.targetClassId !== undefined) {
          sets.push("target_class_id = ?");
          vals.push(body.targetClassId ?? null);
        }
        if (body.recurrence !== undefined) {
          sets.push("recurrence = ?");
          vals.push(body.recurrence === "NONE" ? null : body.recurrence);
        }
        if (body.scheduledAt) {
          const utc = dhakaToUtcSql(body.scheduledAt);
          if (utc <= new Date().toISOString().replace("T", " ").slice(0, 19)) {
            throw new ApiError(400, "নির্ধারিত সময় ভবিষ্যতে হতে হবে।");
          }
          sets.push("scheduled_at = ?");
          vals.push(utc);
        }
        if (sets.length === 0) throw new ApiError(400, "কোনো পরিবর্তন দেওয়া হয়নি।");
        sets.push("updated_at = datetime('now')");
        await db
          .prepare(`UPDATE push_notifications SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...vals, id)
          .run();
        return ok({ edited: true, message: "সংরক্ষিত হয়েছে।" });
      }
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "অবৈধ আইডি।");

    const res = await db
      .prepare("DELETE FROM push_notifications WHERE id = ?")
      .bind(id)
      .run()
      .catch(() => null);
    if (Number((res?.meta as any)?.changes ?? 0) === 0) {
      throw new ApiError(400, "নোটিফিকেশন পাওয়া যায়নি বা মুছে ফেলা যায়নি।");
    }
    return ok({ deleted: true, message: "হিস্টোরি থেকে মুছে ফেলা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
