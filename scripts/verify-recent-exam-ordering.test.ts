import { describe, it, expect, beforeEach } from "bun:test";
import { getLocalD1 } from "../src/lib/db/local";

describe("Recent Result Box Exam Ordering and Filter Count", () => {
  it("strictly picks the true latest exam by exam_date DESC, id DESC, even if older exams have newer updated_at", async () => {
    const db = await getLocalD1();

    // 1. Ensure Class 8 exists
    let cls = await db.prepare("SELECT id FROM classes WHERE name = '8'").first<{ id: number }>();
    if (!cls) {
      await db.prepare("INSERT INTO classes (name, sort_order) VALUES ('8', 8)").run();
      cls = await db.prepare("SELECT id FROM classes WHERE name = '8'").first<{ id: number }>();
    }

    // 2. Ensure Subject 'ইংরেজি' exists for Class 8
    let subj = await db.prepare("SELECT id FROM subjects WHERE name = 'ইংরেজি' AND class_id = ?").bind(cls!.id).first<{ id: number }>();
    if (!subj) {
      await db.prepare("INSERT INTO subjects (name, class_id) VALUES ('ইংরেজি', ?)").bind(cls!.id).run();
      subj = await db.prepare("SELECT id FROM subjects WHERE name = 'ইংরেজি' AND class_id = ?").bind(cls!.id).first<{ id: number }>();
    }

    // 3. Ensure a student exists
    let user = await db.prepare("SELECT id FROM users WHERE username = 'test_student_8'").first<{ id: number }>();
    if (!user) {
      await db.prepare("INSERT INTO users (username, password_hash, role, name) VALUES ('test_student_8', 'hash', 'STUDENT', 'Test Student 8')").run();
      user = await db.prepare("SELECT id FROM users WHERE username = 'test_student_8'").first<{ id: number }>();
    }
    let student = await db.prepare("SELECT id FROM students WHERE user_id = ?").bind(user!.id).first<{ id: number }>();
    if (!student) {
      await db.prepare("INSERT INTO students (user_id, name, class_id, roll) VALUES (?, 'Test Student 8', ?, 1)").bind(user!.id, cls!.id).run();
      student = await db.prepare("SELECT id FROM students WHERE user_id = ?").bind(user!.id).first<{ id: number }>();
    }

    // 4. Create Exam 1 (Older date: 2026-10-04, but modified/updated recently: 2026-10-31)
    await db.prepare("DELETE FROM marks WHERE student_id = ?").bind(student!.id).run();
    await db.prepare("DELETE FROM exams WHERE class_id = ? AND subject_id = ?").bind(cls!.id, subj!.id).run();

    const ex1 = await db.prepare(`
      INSERT INTO exams (class_id, subject_id, month, year, exam_date, title, total_marks, is_published, created_at, updated_at)
      VALUES (?, ?, 10, 2026, '2026-10-04', 'ক্লাস টেস্ট ই-০১', 10, 1, '2026-10-04 10:00:00', '2026-10-31 20:00:00')
      RETURNING id
    `).bind(cls!.id, subj!.id).first<{ id: number }>();

    // Mark for ex1 has a very fresh updated_at (simulating someone editing test 1 today)
    await db.prepare(`
      INSERT INTO marks (exam_id, student_id, attendance, obtained_marks, created_at, updated_at)
      VALUES (?, ?, 'PRESENT', 9, '2026-10-04 10:00:00', '2026-10-31 21:00:00')
    `).bind(ex1!.id, student!.id).run();

    // 5. Create Exam 6 (True latest date: 2026-10-27)
    const ex6 = await db.prepare(`
      INSERT INTO exams (class_id, subject_id, month, year, exam_date, title, total_marks, is_published, created_at, updated_at)
      VALUES (?, ?, 10, 2026, '2026-10-27', 'ক্লাস টেস্ট 6', 10, 1, '2026-10-27 10:00:00', '2026-10-27 10:00:00')
      RETURNING id
    `).bind(cls!.id, subj!.id).first<{ id: number }>();

    await db.prepare(`
      INSERT INTO marks (exam_id, student_id, attendance, obtained_marks, created_at, updated_at)
      VALUES (?, ?, 'PRESENT', 8, '2026-10-27 10:00:00', '2026-10-27 10:00:00')
    `).bind(ex6!.id, student!.id).run();

    // Query mimicking the updated recent endpoint
    const query = `
      SELECT e.id, e.title, e.exam_date
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      JOIN subjects s ON s.id = e.subject_id
      LEFT JOIN marks m ON m.exam_id = e.id
      WHERE COALESCE(e.is_published, 0) = 1 AND c.name = '8'
      GROUP BY e.id
      HAVING COUNT(m.id) > 0
      ORDER BY e.exam_date DESC, e.id DESC
      LIMIT 1
    `;

    const result = await db.prepare(query).first<{ id: number; title: string; exam_date: string }>();

    expect(result).not.toBeNull();
    // Must be Exam 6 ('ক্লাস টেস্ট 6'), NOT Exam 1 ('ক্লাস টেস্ট ই-০১')
    expect(result!.id).toBe(ex6!.id);
    expect(result!.title).toBe("ক্লাস টেস্ট 6");
    expect(result!.exam_date).toBe("2026-10-27");
  });
});
