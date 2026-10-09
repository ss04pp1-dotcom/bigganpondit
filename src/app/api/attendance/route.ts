// /api/attendance — Daily attendance management (Admin, Director, Teacher)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { teacherClassAllowed } from "@/lib/permissions";
import { todayISODateDhaka } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const url = new URL(req.url);
    const classIdStr = url.searchParams.get("classId");
    const date = url.searchParams.get("date") || todayISODateDhaka();

    if (!classIdStr) {
      throw new ApiError(400, "শ্রেণি নির্বাচন করুন।");
    }
    let classId = Number(classIdStr);
    const byId = await db.prepare("SELECT id FROM classes WHERE id = ?").bind(classId).first<{ id: number }>().catch(() => null);
    if (!byId) {
      const byName = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(classIdStr).first<{ id: number }>().catch(() => null);
      if (byName) classId = byName.id;
    }

    // Authorization: a teacher may only view attendance (incl. student PII —
    // phones/photos) for classes they teach.
    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, classId);
      if (!allowed) {
        throw new ApiError(403, "আপনার এই শ্রেণির হাজিরা দেখার অনুমতি নেই।");
      }
    }

    // Get all students of this class
    const students = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.roll, s.section, s.phone, s.photo_key,
                  a.status as attendance_status, a.remarks as attendance_remarks
           FROM students s
           LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
           WHERE s.class_id = ?
           ORDER BY s.roll ASC`
        )
        .bind(date, classId)
        .all<{
          id: number;
          name: string;
          roll: number;
          section: string | null;
          phone: string | null;
          photo_key: string | null;
          attendance_status: string | null;
          attendance_remarks: string | null;
        }>()
        .catch(() => null)
    )?.results ?? [];

    const total = students.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    for (const s of students) {
      if (s.attendance_status === "PRESENT") present++;
      else if (s.attendance_status === "ABSENT") absent++;
      else if (s.attendance_status === "LATE") late++;
      else unmarked++;
    }

    return ok({
      date,
      classId,
      students,
      stats: {
        total,
        present,
        absent,
        late,
        unmarked,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const body = (await req.json().catch(() => ({}))) as {
      classId?: number | string;
      date?: string;
      entries?: Array<{
        studentId: number;
        status: "PRESENT" | "ABSENT" | "LATE";
        remarks?: string;
      }>;
      records?: Array<{
        studentId: number;
        status: "PRESENT" | "ABSENT" | "LATE";
        remarks?: string;
      }>;
    };

    const entries = body.entries || body.records;
    if (!body.classId || !body.date || !Array.isArray(entries)) {
      throw new ApiError(400, "শ্রেণি, তারিখ এবং হাজিরার তালিকা আবশ্যক।");
    }

    const date = body.date.trim();
    // VALIDATION: date must be a real YYYY-MM-DD calendar date (no future
    // dates — attendance is recorded on/before the day itself).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      throw new ApiError(400, "তারিখের ফরম্যাট ভুল (YYYY-MM-DD)।");
    }
    const today = todayISODateDhaka();
    if (date > today) {
      throw new ApiError(400, "ভবিষ্যতের তারিখে হাজিরা দেওয়া যায় না।");
    }

    let classId = Number(body.classId);
    const byId = await db.prepare("SELECT id FROM classes WHERE id = ?").bind(classId).first<{ id: number }>().catch(() => null);
    if (!byId) {
      const byName = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(String(body.classId)).first<{ id: number }>().catch(() => null);
      if (byName) classId = byName.id;
    }

    // Authorization check for teachers
    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, classId);
      if (!allowed) {
        throw new ApiError(403, "আপনার এই শ্রেণির হাজিরা প্রদানের অনুমতি নেই।");
      }
    }

    // VALIDATION: status enum + every student must belong to the class
    const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "LATE"]);
    const validEntries: Array<{ studentId: number; status: "PRESENT" | "ABSENT" | "LATE"; remarks: string | null }> = [];
    for (const entry of entries) {
      const studentId = Number(entry.studentId);
      const status = String(entry.status ?? "");
      if (!Number.isInteger(studentId) || studentId <= 0) {
        throw new ApiError(400, "অবৈধ শিক্ষার্থী আইডি।");
      }
      if (!VALID_STATUSES.has(status)) {
        throw new ApiError(400, `অবৈধ হাজিরা স্থিতি (${status})।`);
      }
      validEntries.push({ studentId, status: status as "PRESENT" | "ABSENT" | "LATE", remarks: entry.remarks?.trim() || null });
    }

    if (validEntries.length > 0) {
      const ids = Array.from(new Set(validEntries.map((e) => e.studentId)));
      const validRows = (
        await db
          .prepare(
            `SELECT id FROM students WHERE id IN (${ids.map(() => "?").join(",")}) AND class_id = ?`
          )
          .bind(...ids, classId)
          .all<{ id: number }>()
          .catch(() => null)
      )?.results ?? [];
      const validIds = new Set(validRows.map((r) => r.id));
      const invalid = ids.filter((sid) => !validIds.has(sid));
      if (invalid.length > 0) {
        throw new ApiError(400, `${invalid.length} জন শিক্ষার্থী এই শ্রেণির নয় — হাজিরা সংরক্ষণ করা যায়নি।`);
      }
    }

    // High performance batching: convert N+1 sequential queries into batched chunk executions
    const stmts: import("@/lib/db/types").D1PreparedStatement[] = [];
    for (const entry of validEntries) {
      stmts.push(
        db.prepare(
          `INSERT INTO attendance (student_id, class_id, date, status, remarks, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(student_id, date) DO UPDATE SET
             status = excluded.status,
             remarks = excluded.remarks,
             recorded_by = excluded.recorded_by`
        ).bind(entry.studentId, classId, date, entry.status, entry.remarks, user.id)
      );
    }

    // Cloudflare D1 max batch statement limit is 100
    const CHUNK_SIZE = 80;
    for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
      await db.batch(stmts.slice(i, i + CHUNK_SIZE));
    }

    return ok({ message: "হাজিরা সফলভাবে সংরক্ষণ করা হয়েছে।", count: stmts.length });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
