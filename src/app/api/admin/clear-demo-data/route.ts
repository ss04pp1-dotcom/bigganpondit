// POST /api/admin/clear-demo-data — remove ONLY the accounts/data created by
// the demo seeder (SEED_DEMO_DATA=1). Previously this endpoint wiped ALL
// marks, ALL exams, ALL student_requests and EVERY student user — real
// production data included — despite the "demo" name.
import { getDb, getSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();

    const body = (await req.json().catch(() => ({}))) as {
      scope?: "students_and_marks" | "all_demo";
    };
    const scope = body.scope ?? "all_demo";

    // ---- identify demo rows --------------------------------------------
    // 1) New-style tracking: the seeder records exactly which user/exam ids
    //    it created (settings: demo_student_user_ids / demo_exam_ids).
    const trackedStudentIds = parseIds(await getSetting("demo_student_user_ids", ""));
    const trackedExamIds = parseIds(await getSetting("demo_exam_ids", ""));

    // 2) Legacy fallback for databases seeded before tracking existed:
    //    student usernames follow the seeder pattern student01..studentNN,
    //    and demo exams were created by the demo teacher accounts.
    const legacyStudents = (
      (await db
        .prepare("SELECT id FROM users WHERE username GLOB 'student[0-9][0-9]'")
        .all<{ id: number }>()
        .catch(() => null))?.results ?? []
    ).map((r) => r.id);
    const studentIds = Array.from(new Set([...trackedStudentIds, ...legacyStudents]));

    const demoTeacherUsers = (
      (await db
        .prepare("SELECT id FROM users WHERE username IN ('rakibul', 'mehedi')")
        .all<{ id: number }>()
        .catch(() => null))?.results ?? []
    ).map((r) => r.id);

    const legacyExamIds: number[] = [];
    if (demoTeacherUsers.length > 0) {
      const rows = (
        (await db
          .prepare(
            `SELECT id FROM exams WHERE created_by IN (${demoTeacherUsers.map(() => "?").join(",")})`
          )
          .bind(...demoTeacherUsers)
          .all<{ id: number }>()
          .catch(() => null))?.results ?? []
      );
      legacyExamIds.push(...rows.map((r) => r.id));
    }
    const examIds = Array.from(new Set([...trackedExamIds, ...legacyExamIds]));

    if (studentIds.length === 0 && examIds.length === 0 && demoTeacherUsers.length === 0) {
      return ok({
        message: "কোনো ডেমো ডেটা পাওয়া যায়নি — কিছুই মুছা হয়নি।",
        deleted: { students: 0, exams: 0, marks: 0, teachers: 0 },
      });
    }

    // ---- delete ONLY those rows, in one atomic batch -------------------
    const stmts: import("@/lib/db/types").D1PreparedStatement[] = [];
    if (examIds.length > 0) {
      const ex = examIds.map(() => "?").join(",");
      stmts.push(db.prepare(`DELETE FROM marks WHERE exam_id IN (${ex})`).bind(...examIds));
      stmts.push(db.prepare(`DELETE FROM exams WHERE id IN (${ex})`).bind(...examIds));
    }
    if (studentIds.length > 0) {
      const su = studentIds.map(() => "?").join(",");
      stmts.push(db.prepare(`DELETE FROM students WHERE user_id IN (${su})`).bind(...studentIds));
      stmts.push(db.prepare(`DELETE FROM sessions WHERE user_id IN (${su})`).bind(...studentIds));
      stmts.push(db.prepare(`DELETE FROM users WHERE id IN (${su}) AND role = 'STUDENT'`).bind(...studentIds));
    }

    let teacherMsg = "";
    let teacherCount = 0;
    if (scope === "all_demo" && demoTeacherUsers.length > 0) {
      const tu = demoTeacherUsers.map(() => "?").join(",");
      stmts.push(
        db.prepare(
          `DELETE FROM teacher_subjects WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id IN (${tu}))`
        ).bind(...demoTeacherUsers)
      );
      stmts.push(db.prepare(`DELETE FROM teachers WHERE user_id IN (${tu})`).bind(...demoTeacherUsers));
      stmts.push(db.prepare(`DELETE FROM sessions WHERE user_id IN (${tu})`).bind(...demoTeacherUsers));
      stmts.push(db.prepare(`DELETE FROM users WHERE id IN (${tu}) AND role = 'TEACHER'`).bind(...demoTeacherUsers));
      teacherCount = demoTeacherUsers.length;
      teacherMsg = " ও ডেমো শিক্ষক একাউন্ট";
    }

    // Permanently disable demo re-seeding.
    stmts.push(db.prepare("INSERT INTO settings (key, value) VALUES ('demo_data_seeded', 'disabled') ON CONFLICT(key) DO UPDATE SET value = 'disabled'"));
    if (scope === "all_demo") {
      stmts.push(db.prepare("INSERT INTO settings (key, value) VALUES ('demo_teachers_seeded', 'disabled') ON CONFLICT(key) DO UPDATE SET value = 'disabled'"));
    }
    // Clear the tracking settings (rows are gone now).
    stmts.push(db.prepare("INSERT INTO settings (key, value) VALUES ('demo_student_user_ids', '[]') ON CONFLICT(key) DO UPDATE SET value = '[]'"));
    stmts.push(db.prepare("INSERT INTO settings (key, value) VALUES ('demo_exam_ids', '[]') ON CONFLICT(key) DO UPDATE SET value = '[]'"));

    await db.batch(stmts);

    return ok({
      message: `শুধুমাত্র ডেমো ডেটা মুছে ফেলা হয়েছে (${studentIds.length} ডেমো শিক্ষার্থী, ${examIds.length} ডেমো পরীক্ষা${teacherMsg})। আসল তথ্য অক্ষত আছে। সিস্টেম এখন প্রস্তুত।`,
      fresh: true,
      deleted: {
        students: studentIds.length,
        exams: examIds.length,
        teachers: teacherCount,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
