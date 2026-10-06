// /api/attendance — Daily attendance management (Admin, Director, Teacher)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const db = await getDb();
    const url = new URL(req.url);
    const classIdStr = url.searchParams.get("classId");
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!classIdStr) {
      throw new ApiError(400, "শ্রেণি নির্বাচন করুন।");
    }

    const classId = Number(classIdStr);

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
      classId?: number;
      date?: string;
      entries?: Array<{
        studentId: number;
        status: "PRESENT" | "ABSENT" | "LATE";
        remarks?: string;
      }>;
    };

    if (!body.classId || !body.date || !Array.isArray(body.entries)) {
      throw new ApiError(400, "শ্রেণি, তারিখ এবং হাজিরার তালিকা আবশ্যক।");
    }

    const date = body.date.trim();
    const classId = Number(body.classId);

    for (const entry of body.entries) {
      const studentId = Number(entry.studentId);
      const status = entry.status || "PRESENT";
      const remarks = entry.remarks?.trim() || null;

      await db
        .prepare(
          `INSERT INTO attendance (student_id, class_id, date, status, remarks, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(student_id, date) DO UPDATE SET
             status = excluded.status,
             remarks = excluded.remarks,
             recorded_by = excluded.recorded_by`
        )
        .bind(studentId, classId, date, status, remarks, user.id)
        .run();
    }

    return ok({ message: "হাজিরা সফলভাবে সংরক্ষণ করা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
