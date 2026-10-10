// GET /api — status + ensures the database is bootstrapped.

import { getDb } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { APP_TITLE } from "@/lib/constants";

export async function GET() {
  try {
    const db = await getDb();
    
    // Check tables in SQLite
    const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{ name: string }>()).results.map(t => t.name);
    
    // Check student count
    const studentCount = (await db.prepare("SELECT COUNT(*) as c FROM students").first<{ c: number }>())?.c ?? 0;
    const userCount = (await db.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>())?.c ?? 0;
    const classCount = (await db.prepare("SELECT COUNT(*) as c FROM classes").first<{ c: number }>())?.c ?? 0;

    let studentQueryOk = false;
    let studentQueryError: string | null = null;
    let studentsSample: unknown[] = [];

    try {
      const rows = (await db.prepare(
        `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key,
                st.batch_id, COALESCE(b.name, st.batch_name) as batch_name,
                st.father_name, st.father_occupation, st.mother_name, st.mother_occupation,
                st.guardian_name, st.guardian_occupation, st.guardian_relation,
                st.school_name, st.phone, st.address, st.blood_group, st.dob,
                st.hide_photo_from_students,
                c.name as class_name, c.sort_order, u.username
         FROM students st
         JOIN classes c ON c.id = st.class_id
         JOIN users u ON u.id = st.user_id
         LEFT JOIN batches b ON b.id = st.batch_id
         ORDER BY c.sort_order DESC, st.division, st.roll
         LIMIT 5`
      ).all()).results;
      studentQueryOk = true;
      studentsSample = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        roll: r.roll,
        className: r.class_name,
        username: r.username,
        phone: r.phone ? "***" : null,
      }));
    } catch (err) {
      studentQueryError = String((err as Error)?.message ?? err);
    }

    // Check columns on students table
    const studentCols = (await db.prepare("PRAGMA table_info(students)").all<{ name: string }>()).results.map(c => c.name);
    const studentRequestCols = (await db.prepare("PRAGMA table_info(student_requests)").all<{ name: string }>()).results.map(c => c.name);

    return ok({
      status: "running",
      app: APP_TITLE,
      time: new Date().toISOString(),
      database: {
        tables,
        userCount,
        studentCount,
        classCount,
        studentCols,
        studentRequestCols,
        studentQueryOk,
        studentQueryError,
        studentsSample,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
