import { describe, it, expect } from "bun:test";
import { getDb } from "@/lib/db";
import {
  ensureStudentMonthlyCommentsTable,
  getStudentMonthlyComments,
  saveTeacherMonthlyComment,
} from "@/lib/results/reports";

describe("Result Card Teacher Remarks Placement", () => {
  it("places teacher comments onto student's result card accurately", async () => {
    const db = await getDb();
    await ensureStudentMonthlyCommentsTable(db);

    const month = 10;
    const year = 2026;
    const mode = "MONTHLY";

    // Setup 2 mock teachers
    await db
      .prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(301, "মোশাররফ হোসেন", "teacher_mh", "hash", "TEACHER")
      .run();
    await db
      .prepare("INSERT OR IGNORE INTO teachers (id, user_id, short_name, signature_key) VALUES (?, ?, ?, ?)")
      .bind(401, 301, "MH", "sig_mh_123")
      .run();

    await db
      .prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(302, "রাশিদুল ইসলাম", "teacher_ri", "hash", "TEACHER")
      .run();
    await db
      .prepare("INSERT OR IGNORE INTO teachers (id, user_id, short_name, signature_key) VALUES (?, ?, ?, ?)")
      .bind(402, 302, "RI", "sig_ri_456")
      .run();

    // Setup class and 2 students
    await db.prepare("INSERT OR IGNORE INTO classes (id, name, sort_order) VALUES (?, ?, ?)").bind(1, "10", 10).run();

    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(601, "সাকিব হাসান", "sakib601", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, class_id, roll) VALUES (?, ?, ?, ?, ?)")
      .bind(601, 601, "সাকিব হাসান", 1, 601).run();

    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(602, "তামিম ইকবাল", "tamim602", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, class_id, roll) VALUES (?, ?, ?, ?, ?)")
      .bind(602, 602, "তামিম ইকবাল", 1, 602).run();

    const studentSakib = 601;
    const studentTamim = 602;

    // Clean previous comments for these test students
    await db.prepare("DELETE FROM student_monthly_comments WHERE student_id IN (?, ?)").bind(studentSakib, studentTamim).run();

    // 1. Teacher MH enters comment for Sakib
    await saveTeacherMonthlyComment(db, {
      studentId: studentSakib,
      teacherId: 401,
      month,
      year,
      mode,
      comment: "পদার্থবিজ্ঞানে মনোযোগ আরো বাড়াতে হবে। নিয়মিত অনুশীলন জরুরি।",
    });

    // 2. Teacher RI enters comment for Sakib
    await saveTeacherMonthlyComment(db, {
      studentId: studentSakib,
      teacherId: 402,
      month,
      year,
      mode,
      comment: "গণিতে ফলাফল সন্তোষজনক, তবে আরও নিখুঁত হওয়া সম্ভব।",
    });

    // Verify Sakib's remarks are fetched correctly for his result card
    const sakibRemarks = await getStudentMonthlyComments(db, {
      studentId: studentSakib,
      month,
      year,
      mode,
    });

    expect(sakibRemarks.length).toBe(2);

    // Box 1 Teacher MH
    expect(sakibRemarks[0].teacherShortName).toBe("MH");
    expect(sakibRemarks[0].teacherName).toBe("মোশাররফ হোসেন");
    expect(sakibRemarks[0].signatureUrl).toBe("/api/files/sig_mh_123");
    expect(sakibRemarks[0].comment).toBe("পদার্থবিজ্ঞানে মনোযোগ আরো বাড়াতে হবে। নিয়মিত অনুশীলন জরুরি।");
    expect(sakibRemarks[0].date).toBeDefined();

    // Box 2 Teacher RI
    expect(sakibRemarks[1].teacherShortName).toBe("RI");
    expect(sakibRemarks[1].teacherName).toBe("রাশিদুল ইসলাম");
    expect(sakibRemarks[1].signatureUrl).toBe("/api/files/sig_ri_456");
    expect(sakibRemarks[1].comment).toBe("গণিতে ফলাফল সন্তোষজনক, তবে আরও নিখুঁত হওয়া সম্ভব।");

    // Verify Tamim's result card has 0 comments (clean dotted lines)
    const tamimRemarks = await getStudentMonthlyComments(db, {
      studentId: studentTamim,
      month,
      year,
      mode,
    });
    expect(tamimRemarks.length).toBe(0);

    // Clean up
    await db.prepare("DELETE FROM student_monthly_comments WHERE student_id IN (?, ?)").bind(studentSakib, studentTamim).run();
  });
});
