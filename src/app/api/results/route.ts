// /api/results — unified results endpoint.
// ?type=search|monthly|annual|merit
// All authorization is enforced server-side:
//  * STUDENT: only their own data (IDOR protection)
//  * TEACHER: only authorized subjects / classes
//  * ADMIN: everything

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { num } from "@/lib/validation";
import { getTeacherSubjects, teacherClassAllowed } from "@/lib/permissions";
import {
  buildMonthlyClassSummary,
  buildMonthlyReport,
  buildStudentAnnualReport,
  getStudentExamRows,
  getStudentInfo,
} from "@/lib/results/reports";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "search";

    // ---- teacher scope ----
    let teacherSubjectIds: number[] | null = null;
    if (user.role === "TEACHER" && user.teacherId) {
      const subs = await getTeacherSubjects(db, user.teacherId);
      teacherSubjectIds = subs.map((s) => s.id);
    }

    // ---- student scope: force own id (IDOR) ----
    const rawStudentId = num(url.searchParams.get("studentId"));
    let studentId: number | null = rawStudentId;
    if (user.role === "STUDENT") {
      if (!user.studentId) throw new ApiError(403, MSG.noPermissionView);
      if (rawStudentId && rawStudentId !== user.studentId) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      studentId = user.studentId;
    }

    if (type === "search") {
      if (!studentId) throw new ApiError(400, "শিক্ষার্থী নির্বাচন করুন।");
      if (user.role === "TEACHER" && user.teacherId) {
        const info = await getStudentInfo(db, studentId);
        if (!info) throw new ApiError(404, MSG.notFound);
        const cls = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(info.className).first<{ id: number }>(undefined as never).catch(() => null);
        if (!cls || !(await teacherClassAllowed(db, user.teacherId, cls.id))) {
          throw new ApiError(403, MSG.noPermissionView);
        }
      }
      const subjectId = num(url.searchParams.get("subjectId"));
      if (user.role === "TEACHER" && subjectId !== null && !teacherSubjectIds?.includes(subjectId)) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      const month = num(url.searchParams.get("month"));
      const year = num(url.searchParams.get("year"), new Date().getFullYear()) ?? new Date().getFullYear();
      const rows = await getStudentExamRows(db, {
        studentId,
        subjectIds: subjectId !== null ? [subjectId] : teacherSubjectIds,
        month: month ?? null,
        year,
      });
      return ok({ rows });
    }

    if (type === "monthly") {
      const month = num(url.searchParams.get("month"), new Date().getMonth() + 1) ?? new Date().getMonth() + 1;
      const year = num(url.searchParams.get("year"), new Date().getFullYear()) ?? new Date().getFullYear();

      if (studentId) {
        // individual monthly report (student, or teacher/admin viewing one student)
        if (user.role === "TEACHER" && user.teacherId) {
          const info = await getStudentInfo(db, studentId);
          if (!info) throw new ApiError(404, MSG.notFound);
          const cls = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(info.className).first<{ id: number }>(undefined as never).catch(() => null);
          if (!cls || !(await teacherClassAllowed(db, user.teacherId, cls.id))) {
            throw new ApiError(403, MSG.noPermissionView);
          }
        }
        const report = await buildMonthlyReport(db, { studentId, month, year, subjectIds: teacherSubjectIds });
        if (!report) throw new ApiError(404, MSG.notFound);
        return ok({ report });
      }

      // class summary (teacher/admin)
      if (user.role === "STUDENT") throw new ApiError(403, MSG.noPermissionView);
      const className = url.searchParams.get("class") ?? "10";
      const division = url.searchParams.get("division");
      const classRow = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(className).first<{ id: number }>(undefined as never).catch(() => null);
      if (!classRow) throw new ApiError(404, "শ্রেণি পাওয়া যায়নি।");
      if (user.role === "TEACHER" && user.teacherId && !(await teacherClassAllowed(db, user.teacherId, classRow.id))) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      const summary = await buildMonthlyClassSummary(db, {
        classId: classRow.id,
        division: division === "SCIENCE" || division === "HUMANITIES" ? division : null,
        month,
        year,
        subjectIds: teacherSubjectIds,
      });
      return ok({ summary });
    }

    if (type === "annual") {
      if (!studentId) throw new ApiError(400, "শিক্ষার্থী নির্বাচন করুন।");
      const year = num(url.searchParams.get("year"), new Date().getFullYear()) ?? new Date().getFullYear();
      if (user.role === "TEACHER" && user.teacherId) {
        const info = await getStudentInfo(db, studentId);
        if (!info) throw new ApiError(404, MSG.notFound);
        const cls = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(info.className).first<{ id: number }>(undefined as never).catch(() => null);
        if (!cls || !(await teacherClassAllowed(db, user.teacherId, cls.id))) {
          throw new ApiError(403, MSG.noPermissionView);
        }
      }
      const rep = await buildStudentAnnualReport(db, { studentId, year, subjectIds: teacherSubjectIds });
      if (!rep) throw new ApiError(404, MSG.notFound);
      return ok({ annual: rep.annual, student: rep.student });
    }

    if (type === "recent") {
      const className = url.searchParams.get("class");
      const division = url.searchParams.get("division");

      // Find the most recently conducted/graded exam
      let examQuery = `
        SELECT e.id, e.title, e.exam_date, e.month, e.year, e.total_marks,
               c.id as class_id, c.name as class_name, c.division,
               s.id as subject_id, s.name as subject_name,
               COUNT(m.id) as mark_count,
               MAX(m.obtained_marks) as highest_mark
        FROM exams e
        JOIN classes c ON c.id = e.class_id
        JOIN subjects s ON s.id = e.subject_id
        LEFT JOIN marks m ON m.exam_id = e.id
      `;
      const examParams: any[] = [];
      const examWhere: string[] = [];

      if (className) {
        examWhere.push("c.name = ?");
        examParams.push(className);
      }
      if (division) {
        examWhere.push("c.division = ?");
        examParams.push(division);
      }

      if (examWhere.length > 0) {
        examQuery += ` WHERE ${examWhere.join(" AND ")}`;
      }

      examQuery += " GROUP BY e.id ORDER BY e.exam_date DESC, e.id DESC LIMIT 1";

      const examStmt = db.prepare(examQuery);
      const latestExam = examParams.length > 0
        ? await examStmt.bind(...examParams).first<any>(undefined as never).catch(() => null)
        : await examStmt.first<any>(undefined as never).catch(() => null);

      if (!latestExam) {
        return ok({ exam: null, top3: [], results: [], myResult: null });
      }

      // Fetch all marks for this exam with student info and photo privacy flag
      const marksRows = (
        await db
          .prepare(
            `SELECT m.id as mark_id, m.obtained_marks, m.attendance,
                    st.id as student_id, st.name as student_name, st.roll, st.section,
                    st.photo_key, st.hide_photo_from_students
             FROM marks m
             JOIN students st ON st.id = m.student_id
             WHERE m.exam_id = ?
             ORDER BY m.obtained_marks DESC, st.roll ASC`
          )
          .bind(latestExam.id)
          .all<any>()
          .catch(() => null)
      )?.results ?? [];

      const totalMarks = Number(latestExam.total_marks) || 100;

      // Compute rank, percentage, grade
      let currentRank = 1;
      const allRanked = marksRows.map((row: any, idx: number) => {
        const obtained = Number(row.obtained_marks) || 0;
        const pct = Math.round((obtained / totalMarks) * 100);
        const isPresent = row.attendance !== "ABSENT";
        const position = isPresent ? idx + 1 : 999;

        // Privacy rule for photos
        let photoKey = row.photo_key;
        if (
          user.role === "STUDENT" &&
          row.hide_photo_from_students === 1 &&
          row.student_id !== user.studentId
        ) {
          photoKey = null;
        }

        return {
          studentId: row.student_id,
          name: row.student_name,
          roll: row.roll,
          section: row.section,
          photoKey,
          obtainedMarks: obtained,
          totalMarks,
          percentage: pct,
          position,
          attendance: row.attendance,
          hidePhoto: row.hide_photo_from_students === 1,
        };
      });

      // Top 3 present students
      const top3 = allRanked
        .filter((r: any) => r.attendance !== "ABSENT")
        .slice(0, 3)
        .map((r: any, i: number) => ({
          studentId: r.studentId,
          name: r.name,
          roll: r.roll,
          photoKey: r.photoKey,
          percentage: r.percentage,
          position: i + 1,
        }));

      // If viewing user is student: strictly hide other classmates' scores
      let resultsToReturn = allRanked;
      let myResult = null;

      if (user.role === "STUDENT") {
        myResult = allRanked.find((r: any) => r.studentId === user.studentId) ?? null;
        resultsToReturn = myResult ? [myResult] : [];
      }

      return ok({
        exam: {
          id: latestExam.id,
          title: latestExam.title,
          examDate: latestExam.exam_date,
          month: latestExam.month,
          year: latestExam.year,
          totalMarks: latestExam.total_marks,
          className: latestExam.class_name,
          division: latestExam.division,
          subjectName: latestExam.subject_name,
          markCount: latestExam.mark_count,
        },
        top3,
        results: resultsToReturn,
        myResult,
        isStudentView: user.role === "STUDENT",
      });
    }

    if (type === "merit") {
      if (user.role === "STUDENT") throw new ApiError(403, MSG.noPermissionView);
      const month = num(url.searchParams.get("month"), new Date().getMonth() + 1) ?? new Date().getMonth() + 1;
      const year = num(url.searchParams.get("year"), new Date().getFullYear()) ?? new Date().getFullYear();
      const className = url.searchParams.get("class") ?? "10";
      const division = url.searchParams.get("division");
      const classRow = await db.prepare("SELECT id FROM classes WHERE name = ?").bind(className).first<{ id: number }>(undefined as never).catch(() => null);
      if (!classRow) throw new ApiError(404, "শ্রেণি পাওয়া যায়নি।");
      if (user.role === "TEACHER" && user.teacherId && !(await teacherClassAllowed(db, user.teacherId, classRow.id))) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      const summary = await buildMonthlyClassSummary(db, {
        classId: classRow.id,
        division: division === "SCIENCE" || division === "HUMANITIES" ? division : null,
        month,
        year,
        subjectIds: teacherSubjectIds,
      });
      return ok({ merit: summary.entries.slice(0, 10), subjectNames: [...summary.subjectNames.entries()].map(([id, v]) => ({ id, ...v })) });
    }

    throw new ApiError(400, "অজানা রিজাল্ট ধরন।");
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
