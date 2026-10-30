import { describe, it, expect } from "bun:test";
import { getDb } from "@/lib/db";
import {
  ensureStudentMonthlyCommentsTable,
  getStudentMonthlyComments,
  saveTeacherMonthlyComment,
} from "@/lib/results/reports";

describe("Teacher Monthly Comments Isolation", () => {
  it("isolates comments per student and per teacher", async () => {
    const db = await getDb();
    await ensureStudentMonthlyCommentsTable(db);

    const month = 3;
    const year = 2026;
    const mode = "MONTHLY";

    // Setup 2 mock teachers
    await db
      .prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(101, "শিক্ষক ১ (গণিত)", "teacher101", "hash", "TEACHER")
      .run();
    await db
      .prepare("INSERT OR IGNORE INTO teachers (id, user_id, short_name) VALUES (?, ?, ?)")
      .bind(201, 101, "গণিত")
      .run();

    await db
      .prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(102, "শিক্ষক ২ (ইংরেজি)", "teacher102", "hash", "TEACHER")
      .run();
    await db
      .prepare("INSERT OR IGNORE INTO teachers (id, user_id, short_name) VALUES (?, ?, ?)")
      .bind(202, 102, "ইংরেজি")
      .run();

    // Setup Admin user
    await db
      .prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(103, "প্রধান শিক্ষক", "admin103", "hash", "ADMIN")
      .run();
    await db
      .prepare("INSERT OR IGNORE INTO teachers (id, user_id, short_name) VALUES (?, ?, ?)")
      .bind(203, 103, "অ্যাডমিন")
      .run();

    // Setup class and mock students to satisfy FOREIGN KEY constraint
    await db.prepare("INSERT OR IGNORE INTO classes (id, name, sort_order) VALUES (?, ?, ?)").bind(1, "10", 10).run();
    
    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(501, "ছাত্র ১", "student501", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, class_id, roll) VALUES (?, ?, ?, ?, ?)")
      .bind(501, 501, "ছাত্র ১", 1, 1).run();

    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .bind(502, "ছাত্র ২", "student502", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, class_id, roll) VALUES (?, ?, ?, ?, ?)")
      .bind(502, 502, "ছাত্র ২", 1, 2).run();

    const studentA = 501;
    const studentB = 502;

    // Clean up test data
    await db.prepare("DELETE FROM student_monthly_comments WHERE student_id IN (?, ?)").bind(studentA, studentB).run();

    // 1. Teacher 1 (201) comments on Student A
    await saveTeacherMonthlyComment(db, {
      studentId: studentA,
      teacherId: 201,
      month,
      year,
      mode,
      comment: "গণিতে বেশ মনোযোগী।",
    });

    // Verify Student A has 1 comment, Student B has 0
    let commentsA = await getStudentMonthlyComments(db, { studentId: studentA, month, year, mode });
    let commentsB = await getStudentMonthlyComments(db, { studentId: studentB, month, year, mode });

    expect(commentsA.length).toBe(1);
    expect(commentsA[0].teacherId).toBe(201);
    expect(commentsA[0].comment).toBe("গণিতে বেশ মনোযোগী।");
    expect(commentsB.length).toBe(0);

    // 2. Teacher 2 (202) comments on Student A
    await saveTeacherMonthlyComment(db, {
      studentId: studentA,
      teacherId: 202,
      month,
      year,
      mode,
      comment: "ইংরেজি ব্যাকরণে আরো উন্নতি প্রয়োজন।",
    });

    // Verify Student A has BOTH comments separated
    commentsA = await getStudentMonthlyComments(db, { studentId: studentA, month, year, mode });
    expect(commentsA.length).toBe(2);
    expect(commentsA.some((c) => c.teacherId === 201 && c.comment === "গণিতে বেশ মনোযোগী।")).toBe(true);
    expect(commentsA.some((c) => c.teacherId === 202 && c.comment === "ইংরেজি ব্যাকরণে আরো উন্নতি প্রয়োজন।")).toBe(true);

    // Student B is still clean!
    commentsB = await getStudentMonthlyComments(db, { studentId: studentB, month, year, mode });
    expect(commentsB.length).toBe(0);

    // 3. Admin (203) comments on Student A
    await saveTeacherMonthlyComment(db, {
      studentId: studentA,
      teacherId: 203,
      month,
      year,
      mode,
      comment: "সামগ্রিক শৃঙ্খলা চমৎকার।",
    });

    commentsA = await getStudentMonthlyComments(db, { studentId: studentA, month, year, mode });
    expect(commentsA.length).toBe(3);
    expect(commentsA.some((c) => c.teacherId === 203 && c.comment === "সামগ্রিক শৃঙ্খলা চমৎকার।")).toBe(true);

    // 4. Teacher 1 comments on Student B
    await saveTeacherMonthlyComment(db, {
      studentId: studentB,
      teacherId: 201,
      month,
      year,
      mode,
      comment: "নিয়মিত পড়ালেখা চালিয়ে যাও।",
    });

    commentsB = await getStudentMonthlyComments(db, { studentId: studentB, month, year, mode });
    expect(commentsB.length).toBe(1);
    expect(commentsB[0].teacherId).toBe(201);
    expect(commentsB[0].comment).toBe("নিয়মিত পড়ালেখা চালিয়ে যাও।");

    // Student A comments are completely intact and not affected by Student B
    commentsA = await getStudentMonthlyComments(db, { studentId: studentA, month, year, mode });
    expect(commentsA.length).toBe(3);

    // 5. Teacher 1 updates their comment for Student A
    await saveTeacherMonthlyComment(db, {
      studentId: studentA,
      teacherId: 201,
      month,
      year,
      mode,
      comment: "গণিতে দারুণ উন্নতি করেছে!",
    });

    commentsA = await getStudentMonthlyComments(db, { studentId: studentA, month, year, mode });
    expect(commentsA.length).toBe(3);
    const updatedT1 = commentsA.find((c) => c.teacherId === 201);
    expect(updatedT1?.comment).toBe("গণিতে দারুণ উন্নতি করেছে!");

    // Teacher 2 and Admin comments on Student A were not changed
    expect(commentsA.find((c) => c.teacherId === 202)?.comment).toBe("ইংরেজি ব্যাকরণে আরো উন্নতি প্রয়োজন।");
    expect(commentsA.find((c) => c.teacherId === 203)?.comment).toBe("সামগ্রিক শৃঙ্খলা চমৎকার।");

    // Clean up
    await db.prepare("DELETE FROM student_monthly_comments WHERE student_id IN (?, ?)").bind(studentA, studentB).run();
  });
});
