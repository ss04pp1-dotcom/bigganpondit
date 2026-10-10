// /api/classes — List all classes (authenticated users) + Create new class (Admin)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson, classCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"]);
    const db = await getDb();
    const classes = (
      await db
        .prepare(
          `SELECT c.id, c.name, c.sort_order,
                  (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count,
                  (SELECT COUNT(*) FROM batches b WHERE b.class_id = c.id) as batch_count,
                  (SELECT COUNT(*) FROM subjects sub WHERE sub.class_id = c.id) as subject_count
           FROM classes c
           ORDER BY c.sort_order DESC, c.id ASC`
        )
        .all<{
          id: number;
          name: string;
          sort_order: number;
          student_count: number;
          batch_count: number;
          subject_count: number;
        }>()
        .catch(() => null)
    )?.results ?? [];
    return ok({ classes });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = await parseJson(req, classCreateSchema);

    const name = body.name.trim();
    if (!name) throw new ApiError(400, "শ্রেণির নাম লিখুন।");

    // Check duplicate
    const exists = await db
      .prepare("SELECT id FROM classes WHERE name = ?")
      .bind(name)
      .first<{ id: number }>()
      .catch(() => null);

    if (exists) {
      throw new ApiError(400, `'${name}' নামের শ্রেণি ইতোমধ্যে তৈরি করা রয়েছে।`);
    }

    const sortOrder =
      body.sortOrder !== undefined
        ? body.sortOrder
        : Number(name) || 0;

    const res = await db
      .prepare("INSERT INTO classes (name, sort_order) VALUES (?, ?)")
      .bind(name, sortOrder)
      .run();

    const id = Number(res.meta.last_row_id ?? 0);

    return ok({
      message: `'${name}' শ্রেণি সফলভাবে যুক্ত করা হয়েছে।`,
      class: { id, name, sort_order: sortOrder },
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
