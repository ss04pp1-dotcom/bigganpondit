// POST /api/admin/clear-demo-data — Clean mock/demo data and ensure fresh database state
import { getDb, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok, ApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();

    const body = (await req.json().catch(() => ({}))) as {
      scope?: "students_and_marks" | "all_demo";
    };

    const scope = body.scope ?? "all_demo";

    // 1. Clear marks
    await db.prepare("DELETE FROM marks").run();

    // 2. Clear exams
    await db.prepare("DELETE FROM exams").run();

    // 3. Clear student requests
    await db.prepare("DELETE FROM student_requests").run();

    // 4. Clear students
    await db.prepare("DELETE FROM students").run();

    // 5. Clear student user accounts
    await db.prepare("DELETE FROM users WHERE role = 'STUDENT'").run();

    // 6. Permanently disable demo student re-seeding
    await setSetting("demo_data_seeded", "disabled");

    let teacherMsg = "";
    if (scope === "all_demo") {
      // Clear demo teachers ('rakibul' and 'mehedi')
      await db
        .prepare(
          `DELETE FROM teacher_subjects
           WHERE teacher_id IN (
             SELECT id FROM teachers WHERE user_id IN (SELECT id FROM users WHERE username IN ('rakibul', 'mehedi'))
           )`
        )
        .run();
      await db
        .prepare(
          `DELETE FROM teachers
           WHERE user_id IN (SELECT id FROM users WHERE username IN ('rakibul', 'mehedi'))`
        )
        .run();
      await db
        .prepare("DELETE FROM users WHERE username IN ('rakibul', 'mehedi')")
        .run();

      await setSetting("demo_teachers_seeded", "disabled");
      teacherMsg = " ও ডেমো শিক্ষক একাউন্ট";
    }

    return ok({
      message: `সব ডেমো শিক্ষার্থী, পরীক্ষা, নম্বর${teacherMsg} সফলভাবে মুছে ফেলা হয়েছে। সিস্টেম এখন সম্পূর্ণ ফ্রেশ ও প্রস্তুত।`,
      fresh: true,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
