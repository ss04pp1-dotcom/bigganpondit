// /api/admin/results/publish — Admin publish/unpublish control for exam results
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
import { notifyResultPublished } from "@/lib/push-events";
import { z } from "zod";

const publishSchema = z.object({
  examId: z.number().int().positive().optional(),
  classId: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  publish: z.boolean(), // true = publish, false = unpublish
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR"]);
    const db = await getDb();
    const body = await parseJson(req, publishSchema);

    const isPublishedVal = body.publish ? 1 : 0;

    if (body.examId) {
      const exam = await db
        .prepare("SELECT id, title FROM exams WHERE id = ?")
        .bind(body.examId)
        .first<{ id: number; title: string }>()
        .catch(() => null);

      if (!exam) throw new ApiError(404, "পরীক্ষা পাওয়া যায়নি।");

      await db
        .prepare("UPDATE exams SET is_published = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(isPublishedVal, body.examId)
        .run();

      // Event-triggered push: notify the class only when results become
      // visible (publish=true). Unpublishing does not notify.
      if (body.publish) {
        const examInfo = await db
          .prepare(
            "SELECT e.class_id, e.title, e.month, e.year, c.name as class_name FROM exams e JOIN classes c ON c.id = e.class_id WHERE e.id = ?"
          )
          .bind(body.examId)
          .first<{ class_id: number; title: string; month: number; year: number; class_name: string }>()
          .catch(() => null);
        if (examInfo) {
          await notifyResultPublished(db, {
            classId: examInfo.class_id,
            className: examInfo.class_name,
            label: `${examInfo.title} (${examInfo.month}/${examInfo.year})`,
            eventId: `exam:${body.examId}`,
          });
        }
      }

      return ok({
        success: true,
        examId: body.examId,
        isPublished: body.publish,
        message: body.publish
          ? "পরীক্ষার ফলাফল সফলভাবে প্রকাশ করা হয়েছে!"
          : "পরীক্ষার ফলাফল অপ্রকাশিত (ড্রাফট) করা হয়েছে।",
      });
    }

    if (body.classId && body.month && body.year) {
      await db
        .prepare(
          "UPDATE exams SET is_published = ?, updated_at = datetime('now') WHERE class_id = ? AND month = ? AND year = ?"
        )
        .bind(isPublishedVal, body.classId, body.month, body.year)
        .run();

      // Event-triggered push: class-wide monthly publish.
      if (body.publish) {
        const cls = await db
          .prepare("SELECT id, name FROM classes WHERE id = ?")
          .bind(body.classId)
          .first<{ id: number; name: string }>()
          .catch(() => null);
        if (cls) {
          await notifyResultPublished(db, {
            classId: cls.id,
            className: cls.name,
            label: `${body.month}/${body.year}`,
            eventId: `class:${body.classId}:${body.month}:${body.year}`,
          });
        }
      }

      return ok({
        success: true,
        isPublished: body.publish,
        message: body.publish
          ? "এই শ্রেণি ও মাসের সকল পরীক্ষার ফলাফল প্রকাশিত হয়েছে!"
          : "এই শ্রেণি ও মাসের সকল পরীক্ষার ফলাফল অপ্রকাশিত করা হয়েছে।",
      });
    }

    throw new ApiError(400, "নির্দিষ্ট পরীক্ষা বা শ্রেণি ও মাস প্রদান করুন।");
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
