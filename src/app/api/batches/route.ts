// /api/batches — List all batches & Create new batch (by batch name & class)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson, batchCreateSchema } from "@/lib/validation";
import { classLabel } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"]);
    const db = await getDb();
    const url = new URL(req.url);
    const classIdParam = url.searchParams.get("class_id");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];

    if (classIdParam && Number(classIdParam) > 0) {
      clauses.push("b.class_id = ?");
      params.push(Number(classIdParam));
    }

    if (q) {
      clauses.push("(b.name LIKE ? OR c.name LIKE ? OR b.time_slot LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const batches = (
      await db
        .prepare(
          `SELECT b.id, b.name, b.class_id, b.division, b.time_slot, b.days, b.room_no,
                  b.max_students, b.is_active, b.created_at, b.updated_at,
                  c.name as class_name, c.sort_order as class_sort_order,
                  (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
           FROM batches b
           JOIN classes c ON c.id = b.class_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY c.sort_order DESC, b.name ASC`
        )
        .bind(...params)
        .all<{
          id: number;
          name: string;
          class_id: number;
          division: string | null;
          time_slot: string | null;
          days: string | null;
          room_no: string | null;
          max_students: number;
          is_active: number;
          created_at: string;
          updated_at: string;
          class_name: string;
          class_sort_order: number;
          student_count: number;
        }>()
        .catch(() => null)
    )?.results ?? [];

    return ok({ batches });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const db = await getDb();
    const body = await parseJson(req, batchCreateSchema);

    const name = body.name.trim();
    if (!name) throw new ApiError(400, "ব্যাচের নাম লিখুন।");

    // Validate class exists
    const cls = await db
      .prepare("SELECT id, name FROM classes WHERE id = ?")
      .bind(body.classId)
      .first<{ id: number; name: string }>()
      .catch(() => null);
    if (!cls) throw new ApiError(400, "নির্বাচিত শ্রেণি পাওয়া যায়নি।");

    // Check duplicate batch name under this class
    const dup = await db
      .prepare("SELECT id FROM batches WHERE class_id = ? AND name = ?")
      .bind(body.classId, name)
      .first<{ id: number }>()
      .catch(() => null);
    if (dup) {
      throw new ApiError(400, `'${classLabel(cls.name)}'-এ '${name}' নামের ব্যাচ ইতোমধ্যে রয়েছে। অনুগ্রহ করে অন্য নাম নির্বাচন করুন।`);
    }

    const res = await db
      .prepare(
        `INSERT INTO batches (
          name, class_id, division, time_slot, days, room_no, max_students, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        name,
        body.classId,
        body.division ?? null,
        body.timeSlot ?? null,
        body.days ?? null,
        body.roomNo ?? null,
        body.maxStudents ?? 0,
        body.isActive ? 1 : 0
      )
      .run();

    const id = Number(res.meta.last_row_id ?? 0);

    return ok({
      message: `'${name}' ব্যাচ সফলভাবে যুক্ত করা হয়েছে।`,
      batch: {
        id,
        name,
        class_id: body.classId,
        class_name: cls.name,
        division: body.division ?? null,
        time_slot: body.timeSlot ?? null,
        days: body.days ?? null,
        room_no: body.roomNo ?? null,
        max_students: body.maxStudents ?? 0,
        is_active: body.isActive ? 1 : 0,
        student_count: 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
