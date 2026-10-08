// /api/admin/results/publish — Admin publish/unpublish control for exam results
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson } from "@/lib/validation";
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
