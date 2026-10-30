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

    // Ensure user 601 and student 601 exist
    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)").bind(601, "টেস্ট ১", "test601", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, roll, class_id) VALUES (?, ?, ?, ?, ?)").bind(601, 601, "টেস্ট শিক্ষার্থী ১", 601, 1).run();

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

      if (s.grade === "F" && !s.isFourth && subFails === 0) {
        if (s.obtained > 0 || subAbsences === 0 || (exams.length > 0 && exams.some((e) => e.attendance !== "ABSENT"))) {
          subFails = 1;
        }
      }

      totalStudentAbsences += subAbsences;
      totalStudentFails += subFails;
    }

    expect(totalStudentAbsences).toBe(1);
    expect(totalStudentFails).toBe(2);

    const dynamicFine = (totalStudentAbsences * 20) + (totalStudentFails * 50);
    expect(dynamicFine).toBe(120);

    // Clean up
    await db.prepare("DELETE FROM marks WHERE student_id = 601").run();
    await db.prepare("DELETE FROM exams WHERE year = ? AND month = ?").bind(year, month).run();
  });

  it("accurately handles Mariam's exact case: 1 absent exam (A1) + 1 passed exam but failed overall subject", async () => {
    const db = await getDb();
    const month = 10;
    const year = 2026;

    await db.prepare("DELETE FROM marks WHERE student_id = 602").run();
    await db.prepare("DELETE FROM exams WHERE year = ? AND month = ? AND subject_id = 104").bind(year, month).run();
    await db.prepare("INSERT OR IGNORE INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)").bind(602, "মোছাঃ মরিয়ম খাতুন (খুশি)", "mariam602", "hash", "STUDENT").run();
    await db.prepare("INSERT OR IGNORE INTO students (id, user_id, name, roll, class_id) VALUES (?, ?, ?, ?, ?)").bind(602, 602, "মোছাঃ মরিয়ম খাতুন (খুশি)", 602, 1).run();
    await db.prepare("INSERT OR IGNORE INTO subjects (id, class_id, name, is_fourth_subject) VALUES (?, ?, ?, ?)").bind(104, 1, "ইংরেজি", 0).run();

    // Exam 1: Total 20, ABSENT
    const e1 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("ইংরেজি পরীক্ষা ১", 1, 104, 20, month, year, "2026-10-05", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e1.meta.last_row_id, 602, 0, "ABSENT").run();

    // Exam 2: Total 48, PRESENT, obtained 16.66 (individually 34.7% >= 33%, but combined 16.66/68 = 24.5% = F)
    const e2 = await db.prepare(
      "INSERT INTO exams (title, class_id, subject_id, total_marks, month, year, exam_date, is_published, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("ইংরেজি পরীক্ষা ২", 1, 104, 48, month, year, "2026-10-15", 1, "MONTHLY").run();
    await db.prepare("INSERT INTO marks (exam_id, student_id, obtained_marks, attendance) VALUES (?, ?, ?, ?)").bind(e2.meta.last_row_id, 602, 16.66, "PRESENT").run();

    const report = await buildMonthlyReport(db, {
      studentId: 602,
      month,
      year,
      mode: "MONTHLY",
      publishedOnly: true,
    });

    expect(report).not.toBeNull();
    const englishSub = report!.subjects.find(s => s.subjectId === 104);
    expect(englishSub).toBeDefined();
    expect(englishSub!.grade).toBe("F");
    expect(englishSub!.obtained).toBeCloseTo(16.66, 1);
    expect(englishSub!.totalMarks).toBe(68);

    const exams = report?.examRowsBySubject?.get(104) ?? [];
    let subAbsences = 0;
    let subFails = 0;

    for (const e of exams) {
      const isFourth = Boolean(englishSub!.isFourth || e.subjectIsFourth);
      const isAbsent = e.attendance === "ABSENT";
      if (isAbsent) {
        subAbsences++;
      }
      if (!isAbsent || e.obtained > 0) {
        const isFail = e.grade === "F" || (e.total > 0 && (e.obtained / e.total) * 100 < 33);
        if (isFail && !isFourth) {
          subFails++;
        }
      }
    }

    if (englishSub!.grade === "F" && !englishSub!.isFourth && subFails === 0) {
      if (englishSub!.obtained > 0 || subAbsences === 0 || (exams.length > 0 && exams.some((e) => e.attendance !== "ABSENT"))) {
        subFails = 1;
      }
    }

    expect(subAbsences).toBe(1);
    expect(subFails).toBe(1);

    const totalFine = (subAbsences * 20) + (subFails * 50);
    expect(totalFine).toBe(70);

    // Clean up
    await db.prepare("DELETE FROM marks WHERE student_id = 602").run();
    await db.prepare("DELETE FROM exams WHERE year = ? AND month = ? AND subject_id = 104").bind(year, month).run();
  });
});
