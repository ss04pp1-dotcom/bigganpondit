import { getDb } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { getTeacherClasses, getTeacherSubjects } from "../src/lib/permissions";
import { buildMonthlyClassSummary } from "../src/lib/results/reports";
import { calculateGPA, calculateGrade, calculatePercentage } from "../src/lib/results/engine";
import { bn, classLabel, divisionLabel, MONTHS_BN, fmtPct, fmtNum } from "../src/lib/constants";

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail: string = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name} ${detail ? `(${detail})` : ""}`);
  }
}

async function runAudit() {
  console.log("==================================================");
  console.log("   BIGGAN PONDIT — DEEP SYSTEM AUDIT & FLOW TEST   ");
  console.log("==================================================");

  const db = await getDb();

  // ------------------------------------------------------------------
  // 1. DATABASE TABLES & SCHEMA INTEGRITY
  // ------------------------------------------------------------------
  console.log("\n[1] Testing Schema & Tables Integrity...");
  const expectedTables = [
    "users",
    "teachers",
    "classes",
    "students",
    "subjects",
    "teacher_subjects",
    "exams",
    "marks",
    "settings",
    "sessions",
    "storage_files",
    "webauthn_credentials",
    "webauthn_challenges",
    "student_requests",
  ];

  for (const t of expectedTables) {
    const r = await db.prepare(`SELECT count(*) as c FROM ${t}`).first<{ c: number }>().catch(() => null);
    assert(r !== null, `Table exists: ${t}`, `Count query failed for ${t}`);
  }

  // ------------------------------------------------------------------
  // 2. AUTH & PASSWORD CRYPTOGRAPHY
  // ------------------------------------------------------------------
  console.log("\n[2] Testing Authentication & Password Hashing...");
  const pwd = "TestPassword@123";
  const hash = await hashPassword(pwd);
  assert(hash.startsWith("pbkdf2$") && hash.split("$").length === 4, "Password hash format is pbkdf2$<iter>$<salt>$<hash>");
  const valid = await verifyPassword(pwd, hash);
  assert(valid === true, "Password verification succeeds with correct password");
  const invalid = await verifyPassword("WrongPassword", hash);
  assert(invalid === false, "Password verification fails with incorrect password");

  // ------------------------------------------------------------------
  // 3. TEACHER DASHBOARD & STUDENT COUNT CALCULATIONS
  // ------------------------------------------------------------------
  console.log("\n[3] Testing Teacher Dashboard & Class Calculations...");
  // Find or create a test teacher in db
  let teachers = (await db.prepare("SELECT t.id, t.user_id, u.name, u.username FROM teachers t JOIN users u ON u.id = t.user_id").all<{ id: number; user_id: number; name: string; username: string }>()?.catch(() => null))?.results ?? [];
  let isCreatedTestTeacher = false;
  if (teachers.length === 0) {
    const tHash = await hashPassword("test1234");
    const ures = await db.prepare("INSERT INTO users (name, username, password_hash, role) VALUES ('টেস্ট শিক্ষক', 'test_teacher_audit', ?, 'TEACHER')").bind(tHash).run();
    const uid = Number(ures.meta.last_row_id ?? 0);
    const tres = await db.prepare("INSERT INTO teachers (user_id, short_name) VALUES (?, 'TT')").bind(uid).run();
    const tid = Number(tres.meta.last_row_id ?? 0);
    // Assign one subject from class 10
    const s10 = await db.prepare("SELECT id FROM subjects WHERE class_id = (SELECT id FROM classes WHERE name = '10') LIMIT 1").first<{ id: number }>();
    if (s10?.id) {
      await db.prepare("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)").bind(tid, s10.id).run();
    }
    teachers = [{ id: tid, user_id: uid, name: "টেস্ট শিক্ষক", username: "test_teacher_audit" }];
    isCreatedTestTeacher = true;
  }
  assert(teachers.length > 0, `Teachers available for testing (found/created ${teachers.length})`);

  const t1 = teachers[0];
  const allowedClasses = await getTeacherClasses(db, t1.id);
  console.log(`    Teacher ${t1.name} (id: ${t1.id}) allowed classes: ${JSON.stringify(allowedClasses)}`);
  assert(Array.isArray(allowedClasses), "getTeacherClasses returns array");

  // Test with undefined/null teacherId (guards against crashes)
  const emptyClasses = await getTeacherClasses(db, undefined);
  assert(Array.isArray(emptyClasses) && emptyClasses.length === 0, "getTeacherClasses safely handles undefined teacherId");

  const emptySubjects = await getTeacherSubjects(db, null);
  assert(Array.isArray(emptySubjects) && emptySubjects.length === 0, "getTeacherSubjects safely handles null teacherId");

  // Query total student count as done in TeacherDashboard
  let dashTotalStudents = 0;
  if (allowedClasses.length > 0) {
    const r = await db
      .prepare(
        `SELECT COUNT(DISTINCT st.id) as c FROM students st WHERE st.class_id IN (
           SELECT s.class_id FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?
         )`
      )
      .bind(t1.id)
      .first<{ c: number }>()
      .catch(() => null);
    dashTotalStudents = Number(r?.c ?? 0);
  } else {
    const r = await db.prepare("SELECT COUNT(*) as c FROM students").first<{ c: number }>().catch(() => null);
    dashTotalStudents = Number(r?.c ?? 0);
  }
  assert(dashTotalStudents >= 0 && !isNaN(dashTotalStudents), `Dashboard total students calculation returns valid number: ${dashTotalStudents}`);

  // Test Bengali numeral conversion
  assert(bn(0) === "০", "Bengali numeral bn(0) is '০'");
  assert(bn(42) === "৪২", "Bengali numeral bn(42) is '৪২'");
  assert(bn("100") === "১০০", "Bengali numeral bn('100') is '১০০'");

  // ------------------------------------------------------------------
  // 4. STUDENT REGISTRATION & APPROVAL WORKFLOW (TEACHER -> ADMIN)
  // ------------------------------------------------------------------
  console.log("\n[4] Testing Teacher Student Request -> Admin Approval Workflow...");

  // Find class 10
  const cls10 = await db.prepare("SELECT id FROM classes WHERE name = '10'").first<{ id: number }>();
  assert(!!cls10?.id, "Class 10 exists in database");

  // Clean any leftover test records
  const testUsername = "audit_student_flow_" + Date.now();
  const testRoll = 9999;
  await db.prepare("DELETE FROM student_requests WHERE username = ? OR (class_id = ? AND roll = ?)").bind(testUsername, cls10!.id, testRoll).run();
  await db.prepare("DELETE FROM students WHERE class_id = ? AND roll = ?").bind(cls10!.id, testRoll).run();
  await db.prepare("DELETE FROM users WHERE username = ?").bind(testUsername).run();

  // STEP A: Teacher creates request
  const testPwdHash = await hashPassword("student123");
  const reqInsertRes = await db
    .prepare(
      `INSERT INTO student_requests (
        teacher_id, name, class_id, division, section, roll, username, password_hash,
        father_name, mother_name, school_name, phone, address, blood_group, dob, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`
    )
    .bind(
      t1.id,
      "অডিট শিক্ষার্থী রহিম",
      cls10!.id,
      "SCIENCE",
      "ক",
      testRoll,
      testUsername,
      testPwdHash,
      "মো: করিম",
      "রহিমা বেগম",
      "ঢাকা আইডিয়াল স্কুল",
      "01711000000",
      "মিরপুর, ঢাকা",
      "B+",
      "2010-05-15"
    )
    .run();

  const reqId = Number(reqInsertRes.meta.last_row_id ?? 0);
  assert(reqId > 0, `Teacher successfully created student request (id: ${reqId})`);

  // Verify pending status and fields
  const reqRecord = await db.prepare("SELECT * FROM student_requests WHERE id = ?").bind(reqId).first<any>();
  assert(reqRecord?.status === "PENDING", "Request status is 'PENDING'");
  assert(reqRecord?.teacher_id === t1.id, "Request teacher_id is correctly associated");
  assert(reqRecord?.roll === testRoll, "Request roll is preserved");
  assert(reqRecord?.father_name === "মো: করিম", "Request parent profile is preserved");

  // Verify that the student is NOT YET in the active students table
  const notYetInStudents = await db.prepare("SELECT id FROM students WHERE roll = ? AND class_id = ?").bind(testRoll, cls10!.id).first();
  assert(notYetInStudents === null, "Student is NOT yet in active students table prior to approval");

  // STEP B: Admin approves the request
  const adminUser = await db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").first<{ id: number }>();
  assert(!!adminUser?.id, "Admin user exists");

  // Admin approves:
  // 1) Creates user
  const userRes = await db
    .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'STUDENT')")
    .bind(reqRecord.name, reqRecord.username, reqRecord.password_hash)
    .run();
  const newUserId = Number(userRes.meta.last_row_id ?? 0);
  assert(newUserId > 0, `User account created on approval (user_id: ${newUserId})`);

  // 2) Creates student
  const studentRes = await db
    .prepare(
      `INSERT INTO students (
        user_id, name, class_id, division, section, roll, photo_key,
        father_name, mother_name, school_name, phone, address, blood_group, dob
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newUserId,
      reqRecord.name,
      reqRecord.class_id,
      reqRecord.division,
      reqRecord.section,
      reqRecord.roll,
      reqRecord.photo_key,
      reqRecord.father_name,
      reqRecord.mother_name,
      reqRecord.school_name,
      reqRecord.phone,
      reqRecord.address,
      reqRecord.blood_group,
      reqRecord.dob
    )
    .run();
  const newStudentId = Number(studentRes.meta.last_row_id ?? 0);
  assert(newStudentId > 0, `Student record created on approval (student_id: ${newStudentId})`);

  // 3) Updates request status to APPROVED
  await db
    .prepare(
      `UPDATE student_requests
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(adminUser!.id, reqId)
    .run();

  const approvedReq = await db.prepare("SELECT * FROM student_requests WHERE id = ?").bind(reqId).first<any>();
  assert(approvedReq?.status === "APPROVED", "Request status updated to 'APPROVED'");
  assert(approvedReq?.reviewed_by === adminUser!.id, "Reviewed by admin is recorded");

  // 4) Verify active student profile is complete
  const activeStudent = await db.prepare("SELECT * FROM students WHERE id = ?").bind(newStudentId).first<any>();
  assert(activeStudent?.name === "অডিট শিক্ষার্থী রহিম", "Active student name matches");
  assert(activeStudent?.father_name === "মো: করিম", "Active student father name matches");
  assert(activeStudent?.school_name === "ঢাকা আইডিয়াল স্কুল", "Active student school matches");
  assert(activeStudent?.blood_group === "B+", "Active student blood group matches");

  // Clean up test student
  await db.prepare("DELETE FROM students WHERE id = ?").bind(newStudentId).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(newUserId).run();
  await db.prepare("DELETE FROM student_requests WHERE id = ?").bind(reqId).run();

  // STEP C: Test rejection flow
  const rejectUsername = "audit_reject_" + Date.now();
  const rejInsertRes = await db
    .prepare(
      `INSERT INTO student_requests (
        teacher_id, name, class_id, division, roll, username, password_hash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`
    )
    .bind(t1.id, "বাতিল শিক্ষার্থী", cls10!.id, "SCIENCE", 9998, rejectUsername, testPwdHash)
    .run();
  const rejReqId = Number(rejInsertRes.meta.last_row_id ?? 0);

  // Admin rejects:
  const rejectNote = "তথ্যে অসম্পূর্ণতা রয়েছে";
  await db
    .prepare(
      `UPDATE student_requests
       SET status = 'REJECTED', admin_notes = ?, reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(rejectNote, adminUser!.id, rejReqId)
    .run();

  const rejectedReq = await db.prepare("SELECT * FROM student_requests WHERE id = ?").bind(rejReqId).first<any>();
  assert(rejectedReq?.status === "REJECTED", "Rejection flow marks status as 'REJECTED'");
  assert(rejectedReq?.admin_notes === rejectNote, "Admin rejection note is preserved");

  // Clean up rejection test
  await db.prepare("DELETE FROM student_requests WHERE id = ?").bind(rejReqId).run();

  // ------------------------------------------------------------------
  // 5. MARKS, GRADING & RESULTS CALCULATIONS
  // ------------------------------------------------------------------
  console.log("\n[5] Testing Grading & GPA Engine Calculations...");
  const grades = [
    { pct: 85, expectedGrade: "A+", expectedGpa: 5.0 },
    { pct: 75, expectedGrade: "A", expectedGpa: 4.0 },
    { pct: 65, expectedGrade: "A-", expectedGpa: 3.5 },
    { pct: 55, expectedGrade: "B", expectedGpa: 3.0 },
    { pct: 45, expectedGrade: "C", expectedGpa: 2.0 },
    { pct: 35, expectedGrade: "D", expectedGpa: 1.0 },
    { pct: 30, expectedGrade: "F", expectedGpa: 0.0 },
  ];

  for (const g of grades) {
    const calcGrade = calculateGrade(g.pct).grade;
    const calcGpa = calculateGPA(g.pct);
    assert(calcGrade === g.expectedGrade, `Grade for ${g.pct}% is ${g.expectedGrade} (got ${calcGrade})`);
    assert(Math.abs(calcGpa - g.expectedGpa) < 0.01, `GPA for ${g.pct}% is ${g.expectedGpa} (got ${calcGpa})`);
  }

  // Percentage calculations
  assert(calculatePercentage(19.5, 20) === 97.5, "Percentage for 19.5/20 is 97.5%");
  assert(calculatePercentage(0, 100) === 0, "Percentage for 0/100 is 0%");

  // ------------------------------------------------------------------
  // 6. MONTHLY SUMMARY REPORT
  // ------------------------------------------------------------------
  console.log("\n[6] Testing Monthly Summary Report Generation...");
  const summary = await buildMonthlyClassSummary(db, {
    classId: cls10!.id,
    division: "SCIENCE",
    month: 11,
    year: 2026,
    subjectIds: null,
  });
  assert(Array.isArray(summary.entries), "buildMonthlyClassSummary returns entries array");
  console.log(`    Found ${summary.entries.length} ranked entries in Class 10 Science for Nov 2026`);

  // Verify rank ordering
  let strictlyOrdered = true;
  for (let i = 1; i < summary.entries.length; i++) {
    if (summary.entries[i].position < summary.entries[i - 1].position) {
      strictlyOrdered = false;
      break;
    }
  }
  assert(strictlyOrdered, "Merit list entries are monotonically ordered by rank position");

  // Clean up dynamic test teacher if created
  if (isCreatedTestTeacher) {
    await db.prepare("DELETE FROM teacher_subjects WHERE teacher_id = ?").bind(teachers[0].id).run();
    await db.prepare("DELETE FROM teachers WHERE id = ?").bind(teachers[0].id).run();
    await db.prepare("DELETE FROM users WHERE id = ?").bind(teachers[0].user_id).run();
  }

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
