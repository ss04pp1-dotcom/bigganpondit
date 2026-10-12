// /api/batches/[id]/students — Manage and assign students to a batch
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const batchId = Number((await ctx.params).id);
    if (!Number.isInteger(batchId) || batchId <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const batch = await db
      .prepare(
        `SELECT b.*, c.name as class_name, c.sort_order as class_sort_order,
                (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
         FROM batches b
         JOIN classes c ON c.id = b.class_id
         WHERE b.id = ?`
      )
      .bind(batchId)
      .first<Record<string, unknown>>()
      .catch(() => null);

    if (!batch) throw new ApiError(404, "ব্যাচটি পাওয়া যায়নি।");

    // Fetch all students belonging to the batch's class
    const students = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.roll, s.division, s.section, s.phone, s.photo_key,
                  s.batch_id, COALESCE(b2.name, s.batch_name) as batch_name,
                  s.guardian_name, u.username
           FROM students s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN batches b2 ON b2.id = s.batch_id
           WHERE s.class_id = ?
           ORDER BY s.roll ASC`
        )
        .bind(batch.class_id)
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    return ok({ batch, students });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const batchId = Number((await ctx.params).id);
    if (!Number.isInteger(batchId) || batchId <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const batch = await db
      .prepare("SELECT id, name, class_id, max_students FROM batches WHERE id = ?")
      .bind(batchId)
      .first<{ id: number; name: string; class_id: number; max_students: number }>()
      .catch(() => null);

    if (!batch) throw new ApiError(404, "ব্যাচটি পাওয়া যায়নি।");

    const cls = await db
      .prepare("SELECT name, COALESCE(is_active, 1) as is_active FROM classes WHERE id = ?")
      .bind(batch.class_id)
      .first<{ name: string; is_active: number }>()
      .catch(() => null);
    if (cls && cls.is_active === 0) {
      throw new ApiError(400, `'${cls.name}' শ্রেণিটি বর্তমানে নিষ্ক্রিয় রয়েছে — এই শ্রেণির ব্যাচে শিক্ষার্থী যুক্ত বা পরিবর্তন করা যাবে না।`);
    }

    const body = (await req.json().catch(() => ({}))) as {
      studentIds?: number[];
    };

    if (!Array.isArray(body.studentIds)) {
      throw new ApiError(400, "শিক্ষার্থীদের তালিকা পাঠানো হয়নি।");
    }

    const selectedIds = Array.from(
      new Set(body.studentIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))
    );

    // Verify all selected students belong to the batch's class
    if (selectedIds.length > 0) {
      const placeholders = selectedIds.map(() => "?").join(",");
      const validStudents = (
        await db
          .prepare(`SELECT id FROM students WHERE class_id = ? AND id IN (${placeholders})`)
          .bind(batch.class_id, ...selectedIds)
          .all<{ id: number }>()
          .catch(() => null)
      )?.results ?? [];

      const validIdSet = new Set(validStudents.map((s) => s.id));
      const invalidCount = selectedIds.filter((id) => !validIdSet.has(id)).length;
      if (invalidCount > 0) {
        throw new ApiError(400, "নির্বাচিত কিছু শিক্ষার্থী এই শ্রেণির নয়।");
      }
    }

    // Atomic database update using db.batch
    const stmts: any[] = [];

    if (selectedIds.length === 0) {
      // Clear all students from this batch
      stmts.push(
        db
          .prepare("UPDATE students SET batch_id = NULL, batch_name = NULL WHERE batch_id = ?")
          .bind(batchId)
      );
    } else {
      const placeholders = selectedIds.map(() => "?").join(",");
      // Unassign students currently in this batch who were unselected
      stmts.push(
        db
          .prepare(
            `UPDATE students SET batch_id = NULL, batch_name = NULL WHERE batch_id = ? AND id NOT IN (${placeholders})`
          )
          .bind(batchId, ...selectedIds)
      );
      // Assign selected students to this batch
      stmts.push(
        db
          .prepare(
            `UPDATE students SET batch_id = ?, batch_name = ? WHERE id IN (${placeholders}) AND class_id = ?`
          )
          .bind(batch.id, batch.name, ...selectedIds, batch.class_id)
      );
    }

    if (stmts.length > 0) {
      await db.batch(stmts);
    }

    return ok({
      message: `সফলভাবে ${selectedIds.length} জন শিক্ষার্থীকে ব্যাচে অন্তর্ভুক্ত করা হয়েছে।`,
      count: selectedIds.length,
    });
  } catch (e) {
    return handleError(e);
  }
}
