// /api/classes/[id] — Update or Delete a Class (Admin only)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      sortOrder?: number;
    };

    const cls = await db
      .prepare("SELECT id, name, sort_order FROM classes WHERE id = ?")
      .bind(id)
      .first<{ id: number; name: string; sort_order: number }>()
      .catch(() => null);
    if (!cls) throw new ApiError(404, "শ্রেণিটি পাওয়া যায়নি।");

    const newName = body.name !== undefined ? body.name.trim() : cls.name;
    const newSortOrder = body.sortOrder !== undefined ? body.sortOrder : cls.sort_order;

    if (!newName) throw new ApiError(400, "শ্রেণির নাম খালি রাখা যাবে না।");

    // Check duplicate name on another class
    if (newName !== cls.name) {
      const dup = await db
        .prepare("SELECT id FROM classes WHERE name = ? AND id != ?")
        .bind(newName, id)
        .first<{ id: number }>()
        .catch(() => null);
      if (dup) {
        throw new ApiError(400, `'${newName}' নামের অন্য একটি শ্রেণি ইতোমধ্যে বিদ্যমান।`);
      }
    }

    await db
      .prepare("UPDATE classes SET name = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newName, newSortOrder, id)
      .run();

    return ok({ message: "শ্রেণির তথ্য সফলভাবে আপডেট করা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const cls = await db
      .prepare("SELECT id, name FROM classes WHERE id = ?")
      .bind(id)
      .first<{ id: number; name: string }>()
      .catch(() => null);
    if (!cls) throw new ApiError(404, "শ্রেণিটি পাওয়া যায়নি।");

    // Check if students exist under this class
    const studentCount = (
      await db
        .prepare("SELECT COUNT(*) as c FROM students WHERE class_id = ?")
        .bind(id)
        .first<{ c: number }>()
        .catch(() => ({ c: 0 }))
    )?.c ?? 0;

    if (studentCount > 0) {
      throw new ApiError(
        400,
        `এই শ্রেণিতে এখনো ${studentCount} জন শিক্ষার্থী রয়েছে। শ্রেণিটি মুছতে প্রথমে শিক্ষার্থীদের অন্য শ্রেণিতে স্থানান্তর অথবা মুছে ফেলুন।`
      );
    }

    // Check if exams exist
    const examCount = (
      await db
        .prepare("SELECT COUNT(*) as c FROM exams WHERE class_id = ?")
        .bind(id)
        .first<{ c: number }>()
        .catch(() => ({ c: 0 }))
    )?.c ?? 0;

    if (examCount > 0) {
      throw new ApiError(
        400,
        `এই শ্রেণির অধীনে ${examCount} টি পরীক্ষা রয়েছে। এটি মুছে ফেলা সম্ভব নয়।`
      );
    }

    // Delete batches and subjects of this class
    await db.prepare("DELETE FROM batches WHERE class_id = ?").bind(id).run();
    await db.prepare("DELETE FROM subjects WHERE class_id = ?").bind(id).run();
    await db.prepare("DELETE FROM classes WHERE id = ?").bind(id).run();

    return ok({ message: `'${cls.name}' শ্রেণি সফলভাবে মুছে ফেলা হয়েছে।` });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
