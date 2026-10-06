// /api/marks
// POST — fast marks entry with duplicate prevention + server-enforced rules:
//        * teacher must be authorized for the subject (re-checked server-side)
//        * ABSENT => obtainedMarks = 0 (forced here, never trusted from client)
//        * 0 <= obtained <= total (validated here)
//        * percentage/grade/GPA/highest are ALWAYS computed server-side
// GET  — exam list / exam marks (admin results management)

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { markSaveSchema, num, parseJson } from "@/lib/validation";
import { teacherSubjectAllowed } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const body = await parseJson(req, markSaveSchema);

    // ---- resolve subject + permission ----
    const subject = await db
      .prepare("SELECT s.*, c.name as class_name FROM subjects s JOIN classes c ON c.id = s.class_id WHERE s.id = ?")
      .bind(body.subjectId)
      .first<{ id: number; class_id: number; name: string; division: string | null; class_name: string }>(undefined as never)
      .catch(() => null);
    if (!subject) throw new ApiError(404, "বিষয় পাওয়া যায়নি।");

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherSubjectAllowed(db, user.teacherId, body.subjectId);
      if (!allowed) throw new ApiError(403, MSG.noPermissionSubject);
    }

    // subject must belong to the chosen class
    if (subject.class_id !== body.classId) {
      throw new ApiError(400, "বিষয়টি এই শ্রেণির নয়।");
    }

    const requiresDivision = subject.class_name === "9" || subject.class_name === "10";
    if (requiresDivision && !body.division) {
      throw new ApiError(400, "বিভাগ নির্বাচন করুন।");
    }

    // ---- student must belong to the chosen class + division ----
    const student = await db
      .prepare("SELECT id, class_id, division FROM students WHERE id = ?")
      .bind(body.studentId)
      .first<{ id: number; class_id: number; division: string | null }>(undefined as never)
      .catch(() => null);
    if (!student) throw new ApiError(404, "শিক্ষার্থী পাওয়া যায়নি।");
    if (student.class_id !== body.classId || (student.division ?? "") !== (body.division ?? "")) {
      throw new ApiError(400, "শিক্ষার্থীটি এই শ্রেণি/বিভাগের নয়।");
    }

    // ---- server-side rule enforcement ----
    if (body.attendance === "ABSENT") {
      body.obtainedMarks = 0; // spec 22: absent => 0 (server enforced)
    }
    if (body.obtainedMarks > body.totalMarks) {
      throw new ApiError(400, `প্রাপ্ত নম্বর ${body.totalMarks}-এর বেশি হতে পারে না।`);
    }
    const obtained = Math.round(body.obtainedMarks * 100) / 100;

    // ---- find or create the exam (natural key) ----
    let exam = await db
      .prepare(
        `SELECT id, total_marks FROM exams
         WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '')
           AND subject_id = ? AND month = ? AND year = ?
           AND exam_date = ? AND title = ? AND total_marks = ?`
      )
      .bind(body.classId, body.division ?? null, body.subjectId, body.month, body.year, body.examDate, body.title, body.totalMarks)
      .first<{ id: number }>(undefined as never)
      .catch(() => null);

    if (!exam) {
      const res = await db
        .prepare(
          `INSERT INTO exams (class_id, division, subject_id, month, year, exam_date, title, total_marks, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(body.classId, body.division ?? null, body.subjectId, body.month, body.year, body.examDate, body.title, body.totalMarks, user.id)
        .run();
      const examId = Number(res.meta.last_row_id ?? 0);
      if (!examId) throw new ApiError(500, "পরীক্ষা তৈরি করা যায়নি।");
      exam = { id: examId } as { id: number };
    }

    // ---- duplicate prevention (UNIQUE exam_id + student_id) ----
    const existing = await db
      .prepare("SELECT id, obtained_marks, attendance FROM marks WHERE exam_id = ? AND student_id = ?")
      .bind(exam.id, body.studentId)
      .first<{ id: number; obtained_marks: number; attendance: string }>(undefined as never)
      .catch(() => null);

    if (existing && !body.confirmUpdate) {
      return ok({
        duplicate: true,
        message: MSG.duplicateMark,
        existing: { obtained: existing.obtained_marks, attendance: existing.attendance },
      });
    }

    if (existing) {
      await db
        .prepare("UPDATE marks SET attendance = ?, obtained_marks = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(body.attendance, obtained, existing.id)
        .run();
    } else {
      await db
        .prepare("INSERT INTO marks (exam_id, student_id, attendance, obtained_marks) VALUES (?, ?, ?, ?)")
        .bind(exam.id, body.studentId, body.attendance, obtained)
        .run();
    }

    // ---- highest mark for this exam (auto-calculated, server-side) ----
    const highestRow = await db
      .prepare("SELECT MAX(obtained_marks) as h FROM marks WHERE exam_id = ?")
      .bind(exam.id)
      .first<{ h: number }>(undefined as never)
      .catch(() => null);
    const highest = highestRow?.h ?? obtained;

    return ok({
      saved: true,
      updated: !!existing,
      obtained,
      attendance: body.attendance,
      highest,
      examId: exam.id,
      message: existing ? MSG.updated : MSG.saved,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const url = new URL(req.url);

    // /api/marks?examId=X -> marks of one exam (with student info)
    const examId = num(url.searchParams.get("examId"));
    if (examId) {
      const exam = await db
        .prepare(
          `SELECT e.*, s.name as subject_name, c.name as class_name
           FROM exams e JOIN subjects s ON s.id = e.subject_id JOIN classes c ON c.id = e.class_id
           WHERE e.id = ?`
        )
        .bind(examId)
        .first<Record<string, unknown>>(undefined as never)
        .catch(() => null);
      if (!exam) throw new ApiError(404, MSG.notFound);

      if (user.role === "TEACHER" && user.teacherId) {
        const allowed = await teacherSubjectAllowed(db, user.teacherId, (exam as { subject_id: number }).subject_id);
        if (!allowed) throw new ApiError(403, MSG.noPermissionView);
      }

      const marks = (
        await db
          .prepare(
            `SELECT m.id, m.student_id, m.attendance, m.obtained_marks, st.name, st.roll, st.section
             FROM marks m JOIN students st ON st.id = m.student_id
             WHERE m.exam_id = ? ORDER BY st.roll`
          )
          .bind(examId)
          .all<Record<string, unknown>>()
      ).results;
      return ok({ exam, marks });
    }

    // /api/marks?class=&division=&subjectId=&month=&year=&q= -> exam list
    const className = url.searchParams.get("class");
    const division = url.searchParams.get("division");
    const subjectId = num(url.searchParams.get("subjectId"));
    const month = num(url.searchParams.get("month"));
    const year = num(url.searchParams.get("year"));
    const limit = Math.min(num(url.searchParams.get("limit"), 50) ?? 50, 200);

    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];
    if (className && /^(6|7|8|9|10)$/.test(className)) {
      clauses.push("c.name = ?");
      params.push(className);
    }
    if (division === "SCIENCE" || division === "HUMANITIES") {
      clauses.push("COALESCE(e.division,'') = ?");
      params.push(division);
    }
    if (subjectId) {
      clauses.push("e.subject_id = ?");
      params.push(subjectId);
    }
    if (month) {
      clauses.push("e.month = ?");
      params.push(month);
    }
    if (year) {
      clauses.push("e.year = ?");
      params.push(year);
    }

    let subjectFilterSql = "";
    if (user.role === "TEACHER" && user.teacherId) {
      // teachers only see exams of their authorized subjects
      subjectFilterSql = ` AND e.subject_id IN (SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?)`;
      params.push(user.teacherId);
    }

    const exams = (
      await db
        .prepare(
          `SELECT e.id, e.title, e.exam_date, e.month, e.year, e.total_marks, e.division,
                  s.name as subject_name, c.name as class_name,
                  (SELECT COUNT(*) FROM marks m WHERE m.exam_id = e.id) as mark_count,
                  (SELECT MAX(m2.obtained_marks) FROM marks m2 WHERE m2.exam_id = e.id) as highest
           FROM exams e
           JOIN subjects s ON s.id = e.subject_id
           JOIN classes c ON c.id = e.class_id
           WHERE ${clauses.join(" AND ")}${subjectFilterSql}
           ORDER BY e.exam_date DESC, e.id DESC LIMIT ?`
        )
        .bind(...params, limit)
        .all<Record<string, unknown>>()
    ).results;

    return ok({ exams });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
void fail;
