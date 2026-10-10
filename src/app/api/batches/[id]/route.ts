// /api/batches/[id] — View, Update or Delete a Batch
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const batch = await db
      .prepare(
        `SELECT b.*, c.name as class_name, c.sort_order as class_sort_order,
                (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
         FROM batches b
         JOIN classes c ON c.id = b.class_id
         WHERE b.id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>()
      .catch(() => null);

    if (!batch) throw new ApiError(404, "ব্যাচটি পাওয়া যায়নি।");

    // Load enrolled students
    const students = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.roll, s.division, s.section, s.phone, s.photo_key,
                  s.guardian_name, s.guardian_relation, u.username
           FROM students s
           JOIN users u ON u.id = s.user_id
           WHERE s.batch_id = ?
           ORDER BY s.roll ASC`
        )
        .bind(id)
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    return ok({ batch, students });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      classId?: number;
      division?: string | null;
      timeSlot?: string | null;
      days?: string | null;
      roomNo?: string | null;
      maxStudents?: number;
      isActive?: boolean;
    };

    const current = await db
      .prepare("SELECT * FROM batches WHERE id = ?")
      .bind(id)
      .first<{
        id: number;
        name: string;
        class_id: number;
        division: string | null;
        time_slot: string | null;
        days: string | null;
        room_no: string | null;
        max_students: number;
        is_active: number;
      }>()
      .catch(() => null);

    if (!current) throw new ApiError(404, "ব্যাচটি পাওয়া যায়নি।");

    const newName = body.name !== undefined ? body.name.trim() : current.name;
    const newClassId = body.classId !== undefined ? body.classId : current.class_id;

    if (!newName) throw new ApiError(400, "ব্যাচের নাম খালি রাখা যাবে না।");

    // Check duplicate name under the target class
    if (newName !== current.name || newClassId !== current.class_id) {
      const dup = await db
        .prepare("SELECT id FROM batches WHERE class_id = ? AND name = ? AND id != ?")
        .bind(newClassId, newName, id)
        .first<{ id: number }>()
        .catch(() => null);
      if (dup) {
        throw new ApiError(400, `এই শ্রেণিতে '${newName}' নামের অন্য একটি ব্যাচ বিদ্যমান।`);
      }
    }

    const newDivision = body.division !== undefined ? body.division : current.division;
    const newTimeSlot = body.timeSlot !== undefined ? body.timeSlot : current.time_slot;
    const newDays = body.days !== undefined ? body.days : current.days;
    const newRoomNo = body.roomNo !== undefined ? body.roomNo : current.room_no;
    const newMaxStudents = body.maxStudents !== undefined ? body.maxStudents : current.max_students;
    const newIsActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : current.is_active;

    await db
      .prepare(
        `UPDATE batches
         SET name = ?, class_id = ?, division = ?, time_slot = ?, days = ?,
             room_no = ?, max_students = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        newName,
        newClassId,
        newDivision ?? null,
        newTimeSlot ?? null,
        newDays ?? null,
        newRoomNo ?? null,
        newMaxStudents ?? 0,
        newIsActive,
        id
      )
      .run();

    // If batch name changed, also update batch_name in students
    if (newName !== current.name) {
      await db
        .prepare("UPDATE students SET batch_name = ? WHERE batch_id = ?")
        .bind(newName, id)
        .run()
        .catch(() => null);
    }

    return ok({ message: "ব্যাচের তথ্য সফলভাবে আপডেট করা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const db = await getDb();
    const batch = await db
      .prepare("SELECT id, name FROM batches WHERE id = ?")
      .bind(id)
      .first<{ id: number; name: string }>()
      .catch(() => null);

    if (!batch) throw new ApiError(404, "ব্যাচটি পাওয়া যায়নি।");

    // Unassign students from this batch safely
    await db
      .prepare("UPDATE students SET batch_id = NULL, batch_name = NULL WHERE batch_id = ?")
      .bind(id)
      .run();

    // Delete batch
    await db.prepare("DELETE FROM batches WHERE id = ?").bind(id).run();

    return ok({ message: `'${batch.name}' ব্যাচ সফলভাবে মুছে ফেলা হয়েছে।` });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
