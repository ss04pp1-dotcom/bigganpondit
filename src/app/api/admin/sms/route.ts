// /api/admin/sms — Send SMS to all classes, specific class, or selected students
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

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
    const result = params.length > 0 ? await stmt.bind(...params).all<{ id: number; name: string; roll: number; phone: string }>() : await stmt.all<{ id: number; name: string; roll: number; phone: string }>();

    const students = result.results ?? [];
    if (students.length === 0) {
      throw new ApiError(400, "নির্বাচিত ক্যাটাগরিতে কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।");
    }

    // Deduplicate valid phone numbers
    const validPhones = Array.from(
      new Set(
        students
          .map((s) => s.phone.replace(/[^0-9+]/g, ""))
          .filter((p) => p.length >= 10)
      )
    );

    return ok({
      message: `মোট ${validPhones.length} টি নম্বরে বার্তা সফলভাবে প্রেরণ করা হয়েছে।`,
      sentCount: validPhones.length,
      sampleNumbers: validPhones.slice(0, 5),
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
