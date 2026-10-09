// DB prep for the medium-fix smoke tests (local dev SQLite).
// Usage: bun scripts/prepare_medium_smoke.ts
import { getDb } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

const db = await getDb();

// 1) Publish current-month exams of class 10 SCIENCE so result-card / merit
//    list / GPA-consistency smoke tests have real data.
const now = new Date();
const curMonth = now.getMonth() + 1;
const curYear = now.getFullYear();

// 0) Restore the demo fixture credentials (a previous session's tests may
//    have reset some of these passwords). These are LOCAL DEV demo accounts
//    only — production never seeds them (SEED_DEMO_DATA gate).
const demoAccounts: Array<[string, string]> = [
  ["rakibul", "0092"],
  ["mehedi", "2732"],
];
for (const [username, password] of demoAccounts) {
  const hash0 = await hashPassword(password);
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE username = ? AND role = 'TEACHER'")
    .bind(hash0, username)
    .run();
}
const demoStudentHash = await hashPassword("1234");
const r0 = await db
  .prepare("UPDATE users SET password_hash = ? WHERE username GLOB 'student[0-9][0-9]' AND role = 'STUDENT'")
  .bind(demoStudentHash)
  .run();
console.log("demo student passwords reset:", r0.meta.changes);
await db
  .prepare("UPDATE students SET raw_password = '1234' WHERE user_id IN (SELECT id FROM users WHERE username GLOB 'student[0-9][0-9]')")
  .run()
  .catch(() => null);

const r1 = await db
  .prepare(
    `UPDATE exams SET is_published = 1
     WHERE id IN (
       SELECT e.id FROM exams e
       JOIN subjects s ON s.id = e.subject_id
       JOIN classes c ON c.id = e.class_id
       WHERE c.name = '10' AND e.month = ? AND e.year = ? AND COALESCE(e.division,'') = 'SCIENCE'
     )`
  )
  .bind(curMonth, curYear)
  .run();
console.log("published class-10 SCIENCE exams this month:", r1.meta.changes);

// 2) Active OTP reset rows: admin (123456) and the throwaway student
//    smokebadphone (654321) so the smoke test can exercise the wrong-OTP
//    attempt limiter WITHOUT locking the admin.
await db.prepare("DELETE FROM password_resets WHERE user_id = (SELECT id FROM users WHERE username = 'admin')").run().catch(() => null);
await db.prepare("DELETE FROM password_resets WHERE user_id = (SELECT id FROM users WHERE username = 'smokebadphone')").run().catch(() => null);
const admin = await db.prepare("SELECT id FROM users WHERE username = 'admin'").first<{ id: number }>();
if (admin) {
  const otpHash = await hashPassword("123456");
  await db
    .prepare(
      `INSERT INTO password_resets (user_id, otp_hash, email, expires_at, used)
       VALUES (?, ?, 'admin@local.test', datetime('now', '+10 minutes'), 0)`
    )
    .bind(admin.id, otpHash)
    .run();
  console.log("password_resets row inserted for admin (otp=123456)");
}

// 3) A student with a deliberately invalid phone (legacy data) so the SMS
//    route's skipped-number reporting can be verified. Create it if missing.
const bad = await db.prepare("SELECT id FROM students WHERE username IS NULL AND roll = 888").first().catch(() => null);
void bad;
const badUser = await db.prepare("SELECT id FROM users WHERE username = 'smokebadphone'").first<{ id: number }>().catch(() => null);
if (!badUser) {
  const c7 = await db.prepare("SELECT id FROM classes WHERE name = '7'").first<{ id: number }>();
  if (c7) {
    const hash = await hashPassword("test1234");
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES ('স্মোক ব্যাডফোন', 'smokebadphone', ?, 'STUDENT')")
      .bind(hash)
      .run();
    const uid = Number(res.meta.last_row_id ?? 0);
    await db
      .prepare("INSERT INTO students (user_id, name, class_id, roll, phone, raw_password) VALUES (?, 'স্মোক ব্যাডফোন', ?, 888, '12345', 'test1234')")
      .bind(uid, c7.id)
      .run();
    console.log("student smokebadphone created with invalid phone 12345");
  }
} else {
  await db.prepare("UPDATE students SET phone = '12345' WHERE user_id = ?").bind(badUser.id).run();
  console.log("student smokebadphone phone reset to 12345");
}
const badUserRow = await db.prepare("SELECT id FROM users WHERE username = 'smokebadphone'").first<{ id: number }>().catch(() => null);
if (badUserRow) {
  const otpHash2 = await hashPassword("654321");
  await db
    .prepare(
      `INSERT INTO password_resets (user_id, otp_hash, email, expires_at, used)
       VALUES (?, ?, 'bad@local.test', datetime('now', '+10 minutes'), 0)`
    )
    .bind(badUserRow.id, otpHash2)
    .run();
  console.log("password_resets row inserted for smokebadphone (otp=654321)");
}

// 3b) Write the demo-tracking settings as the NEW seeder would (this DB was
// seeded by the old code without tracking). All current students matching
// the demo username pattern and ALL current exams are demo-seeded rows.
const demoStudentIds = (await db.prepare("SELECT id FROM users WHERE username GLOB 'student[0-9][0-9]'").all<{ id: number }>()).results.map((r) => r.id);
const demoExamIds = (await db.prepare("SELECT id FROM exams").all<{ id: number }>()).results.map((r) => r.id);
await db
  .prepare("INSERT INTO settings (key, value) VALUES ('demo_student_user_ids', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  .bind(JSON.stringify(demoStudentIds))
  .run();
await db
  .prepare("INSERT INTO settings (key, value) VALUES ('demo_exam_ids', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  .bind(JSON.stringify(demoExamIds))
  .run();
console.log("demo tracking settings written (students:", demoStudentIds.length, "exams:", demoExamIds.length, ")");

// 4) Clean login_attempts leftovers from unit tests
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'test:%'").run().catch(() => null);
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'login:%bruteforce%'").run().catch(() => null);
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'login:%brutetest%'").run().catch(() => null);
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'otp:%'").run().catch(() => null);
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'reveal:%'").run().catch(() => null);
await db.prepare("DELETE FROM login_attempts WHERE key LIKE 'forgotpw:%'").run().catch(() => null);

console.log("DB prep done. month =", curMonth, "year =", curYear);
