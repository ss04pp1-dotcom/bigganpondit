import { describe, it, expect } from "bun:test";
import { getLocalD1 } from "../src/lib/db/local";

describe("Multiple exams for same subject on same day or month", () => {
  it("allows entering marks for a new exam even when another exam of the same subject is published", async () => {
    const db = await getLocalD1();

    // 1. Setup Class, Subject, Teacher, Student
    let cls = await db.prepare("SELECT id FROM classes WHERE name = '8'").first<{ id: number }>();
    if (!cls) {
      await db.prepare("INSERT INTO classes (name, sort_order) VALUES ('8', 8)").run();
      cls = await db.prepare("SELECT id FROM classes WHERE name = '8'").first<{ id: number }>();
    }

    let subj = await db.prepare("SELECT id FROM subjects WHERE name = 'ইংরেজি' AND class_id = ?").bind(cls!.id).first<{ id: number }>();
    if (!subj) {
      await db.prepare("INSERT INTO subjects (name, class_id) VALUES ('ইংরেজি', ?)").bind(cls!.id).run();
      subj = await db.prepare("SELECT id FROM subjects WHERE name = 'ইংরেজি' AND class_id = ?").bind(cls!.id).first<{ id: number }>();
    }

    let teacherUser = await db.prepare("SELECT id FROM users WHERE username = 'test_teacher_eng'").first<{ id: number }>();
    if (!teacherUser) {
      await db.prepare("INSERT INTO users (username, password_hash, role, name) VALUES ('test_teacher_eng', 'hash', 'TEACHER', 'Teacher Eng')").run();
      teacherUser = await db.prepare("SELECT id FROM users WHERE username = 'test_teacher_eng'").first<{ id: number }>();
    }
    let teacher = await db.prepare("SELECT id FROM teachers WHERE user_id = ?").bind(teacherUser!.id).first<{ id: number }>();
    if (!teacher) {
      await db.prepare("INSERT INTO teachers (user_id) VALUES (?)").bind(teacherUser!.id).run();
      teacher = await db.prepare("SELECT id FROM teachers WHERE user_id = ?").bind(teacherUser!.id).first<{ id: number }>();
    }
    // link teacher to subject
    await db.prepare("INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)").bind(teacher!.id, subj!.id).run();

    let studentUser = await db.prepare("SELECT id FROM users WHERE username = 'test_student_morium'").first<{ id: number }>();
    if (!studentUser) {
      await db.prepare("INSERT INTO users (username, password_hash, role, name) VALUES ('test_student_morium', 'hash', 'STUDENT', 'Morium')").run();
      studentUser = await db.prepare("SELECT id FROM users WHERE username = 'test_student_morium'").first<{ id: number }>();
    }
    let student = await db.prepare("SELECT id FROM students WHERE user_id = ?").bind(studentUser!.id).first<{ id: number }>();
    if (!student) {
      await db.prepare("INSERT INTO students (user_id, name, class_id, roll) VALUES (?, 'Morium', ?, 3)").bind(studentUser!.id, cls!.id).run();
      student = await db.prepare("SELECT id FROM students WHERE user_id = ?").bind(studentUser!.id).first<{ id: number }>();
    }

    // 2. Insert published exam: "ক্লাস টেস্ট ১" (published this morning)
    const pubExam = await db.prepare(`
      INSERT INTO exams (class_id, subject_id, month, year, exam_date, title, total_marks, is_published, created_by, exam_type)
      VALUES (?, ?, 11, 2026, '2026-11-03', 'ক্লাস টেস্ট ১', 10, 1, ?, 'MONTHLY')
      RETURNING id, is_published, title
    `).bind(cls!.id, subj!.id, teacherUser!.id).first<{ id: number; is_published: number; title: string }>();

    expect(pubExam!.is_published).toBe(1);

    // 3. Simulate teacher attempting to enter marks for "অধ্যায় টেস্ট"
    // Even if client sent pubExam.id as examId (stale ID from previously selected exam)
    const body = {
      examId: pubExam!.id,
      classId: cls!.id,
      subjectId: subj!.id,
      month: 11,
      year: 2026,
      examDate: "2026-11-03",
      title: "অধ্যায় টেস্ট",
      totalMarks: 10,
      examType: "MONTHLY",
    };

    // The backend verification logic:
    let matchedExam: { id: number; is_published: number } | null = null;
    if (body.examId) {
      const existingById = await db
        .prepare("SELECT id, total_marks, class_id, subject_id, title, month, year, COALESCE(is_published, 0) as is_published FROM exams WHERE id = ?")
        .bind(body.examId)
        .first<{ id: number; total_marks: number; class_id: number; subject_id: number; title: string; month: number; year: number; is_published: number }>();

      // With our fix, title mismatch ('অধ্যায় টেস্ট' !== 'ক্লাস টেস্ট ১') prevents binding to pubExam!
      if (
        existingById &&
        existingById.class_id === body.classId &&
        existingById.subject_id === body.subjectId &&
        existingById.title.trim().toLowerCase() === body.title.trim().toLowerCase() &&
        existingById.month === body.month &&
        existingById.year === body.year
      ) {
        matchedExam = { id: existingById.id, is_published: existingById.is_published };
      }
    }

    // Stale examId must be rejected
    expect(matchedExam).toBeNull();

    // Fallback: look for 'অধ্যায় টেস্ট'
    if (!matchedExam) {
      matchedExam = await db
        .prepare(
          `SELECT id, total_marks, COALESCE(is_published, 0) as is_published FROM exams
           WHERE class_id = ? AND subject_id = ? AND month = ? AND year = ? AND title = ?`
        )
        .bind(body.classId, body.subjectId, body.month, body.year, body.title)
        .first<{ id: number; total_marks: number; is_published: number }>();
    }

    // Since 'অধ্যায় টেস্ট' doesn't exist yet, it creates a new exam
    if (!matchedExam) {
      const created = await db
        .prepare(
          `INSERT INTO exams (class_id, subject_id, month, year, exam_date, title, total_marks, created_by, exam_type, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
           RETURNING id, is_published`
        )
        .bind(body.classId, body.subjectId, body.month, body.year, body.examDate, body.title, body.totalMarks, teacherUser!.id, "MONTHLY")
        .first<{ id: number; is_published: number }>();
      matchedExam = created;
    }

    // New exam is created with is_published = 0, NOT blocked by the morning's published exam!
    expect(matchedExam).not.toBeNull();
    expect(matchedExam!.is_published).toBe(0);
    expect(matchedExam!.id).not.toBe(pubExam!.id);

    // Teacher can now insert mark for student into new exam without any error
    const markInsert = await db.prepare(`
      INSERT INTO marks (exam_id, student_id, attendance, obtained_marks)
      VALUES (?, ?, 'PRESENT', 8.5)
      RETURNING id, obtained_marks
    `).bind(matchedExam!.id, student!.id).first<{ id: number; obtained_marks: number }>();

    expect(markInsert!.obtained_marks).toBe(8.5);
  });

  it("allows entering and updating marks for Class 8 exams even if already marked published", async () => {
    const db = await getLocalD1();

    const cls = await db.prepare("SELECT id FROM classes WHERE name = '8'").first<{ id: number }>();
    const subj = await db.prepare("SELECT id FROM subjects WHERE name = 'ইংরেজি' AND class_id = ?").bind(cls!.id).first<{ id: number }>();
    const teacherUser = await db.prepare("SELECT id FROM users WHERE username = 'test_teacher_eng'").first<{ id: number }>();
    const student = await db.prepare("SELECT id FROM students WHERE class_id = ? AND roll = 3").bind(cls!.id).first<{ id: number }>();

    // Exam is published
    const pubExam = await db.prepare("SELECT id, is_published FROM exams WHERE class_id = ? AND subject_id = ? AND title = 'ক্লাস টেস্ট ১'").bind(cls!.id, subj!.id).first<{ id: number; is_published: number }>();
    expect(pubExam).not.toBeNull();
    expect(pubExam!.is_published).toBe(1);

    // Save mark into published exam (both insert and update)
    await db.prepare(`
      INSERT INTO marks (exam_id, student_id, attendance, obtained_marks)
      VALUES (?, ?, 'PRESENT', 9.0)
      ON CONFLICT(exam_id, student_id) DO UPDATE SET
        attendance = excluded.attendance,
        obtained_marks = excluded.obtained_marks,
        updated_at = datetime('now')
    `).bind(pubExam!.id, student!.id).run();

    const saved = await db.prepare("SELECT obtained_marks, attendance FROM marks WHERE exam_id = ? AND student_id = ?").bind(pubExam!.id, student!.id).first<{ obtained_marks: number; attendance: string }>();
    expect(saved).not.toBeNull();
    expect(saved!.obtained_marks).toBe(9.0);
    expect(saved!.attendance).toBe("PRESENT");
  });
});
