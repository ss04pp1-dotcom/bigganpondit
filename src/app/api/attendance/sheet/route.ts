// /api/attendance/sheet — Monthly attendance sheet (Admin, Director, Teacher)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, handleError, ok } from "@/lib/api";
import { teacherClassAllowed } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const url = new URL(req.url);

    const classIdStr = url.searchParams.get("classId");
    const monthStr = url.searchParams.get("month") || String(new Date().getMonth() + 1);
    const yearStr = url.searchParams.get("year") || String(new Date().getFullYear());

    if (!classIdStr) throw new ApiError(400, "শ্রেণি নির্বাচন করুন।");

    let classId = Number(classIdStr);
    const byId = await db.prepare("SELECT id FROM classes WHERE id = ?").bind(classId).first<{ id: number }>().catch(() => null);
    if (!byId) {
      const byName = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(classIdStr).first<{ id: number }>().catch(() => null);
      if (byName) classId = byName.id;
    }

    // Authorization: a teacher may only view the monthly sheet (incl. student
    // PII — phones/photos) for classes they teach.
    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, classId);
      if (!allowed) {
        throw new ApiError(403, "আপনার এই শ্রেণির হাজিরা দেখার অনুমতি নেই।");
      }
    }

    const month = Number(monthStr);
    const year = Number(yearStr);
    // VALIDATION: month/year must be real ranges — invalid input previously
    // produced a garbage LIKE prefix silently.
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ApiError(400, "মাস অবৈধ।");
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new ApiError(400, "সাল অবৈধ।");
    }

    const monthPadded = String(month).padStart(2, "0");
    const prefix = `${year}-${monthPadded}-%`;

    // Days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Students
    const students = (
      await db
        .prepare(
          `SELECT id, name, roll, section, phone, photo_key
           FROM students
           WHERE class_id = ?
           ORDER BY roll ASC`
        )
        .bind(classId)
        .all<{ id: number; name: string; roll: number; section: string | null; phone: string | null; photo_key: string | null }>()
        .catch(() => null)
    )?.results ?? [];

    // Monthly attendance records for this class
    const records = (
      await db
        .prepare(
          `SELECT student_id, date, status
           FROM attendance
           WHERE class_id = ? AND date LIKE ?`
        )
        .bind(classId, prefix)
        .all<{ student_id: number; date: string; status: string }>()
        .catch(() => null)
    )?.results ?? [];

    // Map by studentId -> date -> status
    const studentDays: Record<number, Record<number, string>> = {};
    for (const r of records) {
      const day = Number(r.date.split("-")[2]);
      if (!studentDays[r.student_id]) studentDays[r.student_id] = {};
      studentDays[r.student_id][day] = r.status;
    }

    const rows = students.map((s) => {
      const days = studentDays[s.id] || {};
      let present = 0;
      let absent = 0;
      let late = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const st = days[d];
        if (st === "PRESENT") present++;
        else if (st === "ABSENT") absent++;
        else if (st === "LATE") late++;
      }

      const totalRecorded = present + absent + late;
      const rate = totalRecorded > 0 ? Math.round((present / totalRecorded) * 100) : 0;

      return {
        ...s,
        days,
        present,
        absent,
        late,
        rate,
      };
    });

    return ok({
      classId,
      month,
      year,
      daysInMonth,
      rows,
      students: rows,
      studentDays,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
