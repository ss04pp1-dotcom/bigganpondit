#!/usr/bin/env bun
// scripts/wipe_demo_data.ts — Clean all mock/demo data and prepare fresh system
import { getDb, setSetting } from "../src/lib/db";

async function main() {
  console.log("==================================================");
  console.log("   CLEANING MOCK / DEMO DATA (FRESH PRODUCTION)   ");
  console.log("==================================================");

  const db = await getDb();

  // 1. Delete marks
  const mRes = await db.prepare("DELETE FROM marks").run();
  console.log(`✓ Marks deleted (${mRes.meta.changes} rows)`);

  // 2. Delete exams
  const eRes = await db.prepare("DELETE FROM exams").run();
  console.log(`✓ Exams deleted (${eRes.meta.changes} rows)`);

  // 3. Delete student requests
  const rRes = await db.prepare("DELETE FROM student_requests").run();
  console.log(`✓ Student requests deleted (${rRes.meta.changes} rows)`);

  // 4. Delete students
  const sRes = await db.prepare("DELETE FROM students").run();
  console.log(`✓ Students deleted (${sRes.meta.changes} rows)`);

  // 5. Delete student user logins
  const uRes = await db.prepare("DELETE FROM users WHERE role = 'STUDENT'").run();
  console.log(`✓ Student user accounts deleted (${uRes.meta.changes} rows)`);

  // 6. Delete demo teachers ('rakibul' & 'mehedi')
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
  const tRes = await db.prepare("DELETE FROM users WHERE username IN ('rakibul', 'mehedi')").run();
  console.log(`✓ Demo teachers deleted (${tRes.meta.changes} rows)`);

  // 7. Permanently set settings flags so demo data never re-seeds on boot
  await setSetting("demo_data_seeded", "disabled");
  await setSetting("demo_teachers_seeded", "disabled");
  console.log("✓ Settings flag saved: demo data permanently disabled");

  // Summary counts
  const finalStudents = (await db.prepare("SELECT count(*) as c FROM students").first<{ c: number }>())?.c ?? 0;
  const finalTeachers = (await db.prepare("SELECT count(*) as c FROM teachers").first<{ c: number }>())?.c ?? 0;
  const finalExams = (await db.prepare("SELECT count(*) as c FROM exams").first<{ c: number }>())?.c ?? 0;
  const finalClasses = (await db.prepare("SELECT count(*) as c FROM classes").first<{ c: number }>())?.c ?? 0;
  const finalSubjects = (await db.prepare("SELECT count(*) as c FROM subjects").first<{ c: number }>())?.c ?? 0;
  const finalAdmins = (await db.prepare("SELECT count(*) as c FROM users WHERE role = 'ADMIN'").first<{ c: number }>())?.c ?? 0;

  console.log("\n---------------- CURRENT DATABASE STATE ----------------");
  console.log(`• Admin accounts : ${finalAdmins} (Preserved)`);
  console.log(`• Classes (6-10) : ${finalClasses} (Preserved standard structure)`);
  console.log(`• NCTB Subjects  : ${finalSubjects} (Preserved standard curriculum)`);
  console.log(`• Teachers       : ${finalTeachers} (0 mock teachers)`);
  console.log(`• Students       : ${finalStudents} (0 mock students)`);
  console.log(`• Exams / Marks  : ${finalExams} (0 mock exams)`);
  console.log("--------------------------------------------------------");
  console.log("\nSUCCESS: System is now 100% fresh, clean and ready for real production!");
}

main().catch((err) => {
  console.error("Error wiping demo data:", err);
  process.exit(1);
});
