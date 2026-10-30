import { describe, it, expect } from "bun:test";
import { getDb } from "@/lib/db";
import { buildMonthlyReport } from "@/lib/results/reports";

describe("Result Card Fail and Absence Fine Calculation", () => {
  it("accurately calculates fail fines (50৳) and absent fines (20৳) under all conditions", async () => {
    const db = await getDb();

    const month = 11;
    const year = 2026;

    // Clean up test data for student 601
    await db.prepare("DELETE FROM marks WHERE student_id = 601").run();
    await db.prepare("DELETE FROM exams WHERE year = ? AND month = ?").bind(year, month).run();
    await db.prepare("DELETE FROM fee_items WHERE student_id = 601 AND month = ? AND year = ?").bind(month, year).run();

    // Setup subjects: Subject 1 (Compulsory), Subject 2 (Compulsory), Subject 3 (4th Subject)
    await db.prepare("INSERT OR IGNORE INTO subjects (id, class_id, name, is_fourth_subject) VALUES (?, ?, ?, ?)").bind(101, 1, "পদার্থবিজ্ঞান", 0).run();
    await db.prepare("INSERT OR IGNORE INTO subjects (id, class_id, name, is_fourth_subject) VALUES (?, ?, ?, ?)").bind(102, 1, "রসায়ন", 0).run();
    await db.prepare("INSERT OR IGNORE INTO subjects (id, class_id, name, is_fourth_subject) VALUES (?, ?, ?, ?)").bind(103, 1, "উচ্চতর গণিত", 1).run();

    // 1. Exam 1 in Subject 101: Student took it and FAILED (15/100, F)
    const e1 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("পদার্থ পরীক্ষা ১", 1, 101, 100, month, year, "2026-11-05", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e1.meta.last_row_id, 601, 15, "PRESENT").run();

    // 2. Exam 2 in Subject 102: Student was ABSENT (20৳ fine)
    const e2 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("রসায়ন পরীক্ষা ১", 1, 102, 50, month, year, "2026-11-10", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e2.meta.last_row_id, 601, 0, "ABSENT").run();

    // 3. Exam 3 in Subject 102: Student took it and FAILED (10/50 = 20%, F)
    const e3 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("রসায়ন পরীক্ষা ২", 1, 102, 50, month, year, "2026-11-15", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e3.meta.last_row_id, 601, 10, "PRESENT").run();

    // 4. Exam 4 in Subject 103 (4th Subject): Student took it and scored 10/100 (F) -> No fine because it is 4th subject
    const e4 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("উচ্চতর গণিত পরীক্ষা ১", 1, 103, 100, month, year, "2026-11-20", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e4.meta.last_row_id, 601, 10, "PRESENT").run();

    const report = await buildMonthlyReport(db, {
      studentId: 601,
      month,
      year,
      mode: "MONTHLY",
      publishedOnly: true,
    });

    expect(report).not.toBeNull();

    let totalStudentAbsences = 0;
    let totalStudentFails = 0;

    for (const s of report!.subjects) {
      const exams = report?.examRowsBySubject?.get(s.subjectId) ?? [];
      let subAbsences = 0;
      let subFails = 0;

      if (exams.length > 0) {
        for (const e of exams) {
          if (e.attendance === "ABSENT") {
            subAbsences++;
          } else {
            const isFourth = Boolean(s.isFourth || e.subjectIsFourth);
            const isFail = e.grade === "F" || (e.total > 0 && (e.obtained / e.total) * 100 < 33);
            if (isFail && !isFourth) {
              subFails++;
            }
          }
        }
      } else {
        const isFourth = Boolean(s.isFourth);
        if (s.attendance && s.attendance.startsWith("A")) {
          subAbsences += parseInt(s.attendance.substring(1), 10) || 1;
        }
        if (s.grade === "F" && !isFourth) {
          subFails++;
        }
      }

      if (s.grade === "F" && !s.isFourth && subFails === 0 && subAbsences === 0) {
        subFails = 1;
      }

      totalStudentAbsences += subAbsences;
      totalStudentFails += subFails;
    }

    // Expected:
    // Subject 101: 0 absences, 1 fail
    // Subject 102: 1 absence, 1 fail (absence in exam 2 does NOT cancel fail in exam 3!)
    // Subject 103 (4th subject): 0 fails counted
    // Total absences = 1 (20৳)
    // Total fails = 2 (2 * 50 = 100৳)
    // Total fine = 120৳
    expect(totalStudentAbsences).toBe(1);
    expect(totalStudentFails).toBe(2);

    const dynamicFine = (totalStudentAbsences * 20) + (totalStudentFails * 50);
    expect(dynamicFine).toBe(120);

    // Clean up
    await db.prepare("DELETE FROM marks WHERE student_id = 601").run();
    await db.prepare("DELETE FROM exams WHERE year = ? AND month = ?").bind(year, month).run();
  });
});
