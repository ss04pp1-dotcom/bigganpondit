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
      const isPrivileged = user.role === "ADMIN" || user.role === "TEACHER" || user.role === "DIRECTOR";
      const rows = await getStudentExamRows(db, {
        studentId,
        subjectIds: subjectId !== null ? [subjectId] : teacherSubjectIds,
        month: month ?? null,
        year,
        publishedOnly: !isPrivileged,
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
      const subjectId = num(url.searchParams.get("subjectId"));
      const examId = num(url.searchParams.get("examId"));

      // 1. Fetch available subjects for the selected class/division (with published results)
      let subjectsList: Array<{ id: number; name: string; hasResults: boolean; markCount: number }> = [];
      if (className && className !== "ALL") {
        const subRows = (
          await db
            .prepare(
              `SELECT s.id, s.name, COUNT(m.id) as mark_count
               FROM subjects s
               JOIN classes c ON c.id = s.class_id
               LEFT JOIN exams e ON e.subject_id = s.id AND COALESCE(e.is_published, 0) = 1
               LEFT JOIN marks m ON m.exam_id = e.id
               WHERE c.name = ?
                 AND (s.division IS NULL OR s.division = ? OR ? IS NULL)
               GROUP BY s.id
               ORDER BY s.id ASC`
            )
            .bind(className, division ?? null, division ?? null)
            .all<any>()
            .catch(() => null)
        )?.results ?? [];

        subjectsList = subRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          hasResults: Number(r.mark_count) > 0,
          markCount: Number(r.mark_count) || 0,
        }));
      }

      // 2. Build the query to find the target / most recently published exam
      let examQuery = `
        SELECT e.id, e.title, e.exam_date, e.month, e.year, e.total_marks,
               c.id as class_id, c.name as class_name, e.division,
               s.id as subject_id, s.name as subject_name,
               COALESCE(e.is_published, 0) as is_published,
               e.created_by,
               t_creator.id as creator_teacher_id,
               u_creator.name as creator_name,
               u_creator.username as creator_username,
               t_creator.photo_key as creator_photo_key,
               t_subj.id as subj_teacher_id,
               u_subj.name as subj_teacher_name,
               u_subj.username as subj_teacher_username,
               t_subj.photo_key as subj_photo_key,
               COUNT(m.id) as mark_count,
               MAX(m.obtained_marks) as highest_mark,
               MAX(COALESCE(m.updated_at, m.created_at, e.updated_at, e.exam_date)) as last_activity
        FROM exams e
        JOIN classes c ON c.id = e.class_id
        JOIN subjects s ON s.id = e.subject_id
        LEFT JOIN users u_creator ON u_creator.id = e.created_by
        LEFT JOIN teachers t_creator ON t_creator.user_id = u_creator.id
        LEFT JOIN teacher_subjects ts ON ts.subject_id = e.subject_id
        LEFT JOIN teachers t_subj ON t_subj.id = ts.teacher_id
        LEFT JOIN users u_subj ON u_subj.id = t_subj.user_id
        LEFT JOIN marks m ON m.exam_id = e.id
      `;
      const examParams: any[] = [];
      const examWhere: string[] = ["COALESCE(e.is_published, 0) = 1"];

      if (examId) {
        examWhere.push("e.id = ?");
        examParams.push(examId);
      } else {
        if (className && className !== "ALL") {
          examWhere.push("c.name = ?");
          examParams.push(className);
        }
        if (division && (className === "9" || className === "10")) {
          examWhere.push("(e.division IS NULL OR e.division = ?)");
          examParams.push(division);
        }
        if (subjectId) {
          examWhere.push("s.id = ?");
          examParams.push(subjectId);
        }
      }

      if (examWhere.length > 0) {
        examQuery += ` WHERE ${examWhere.join(" AND ")}`;
      }

      // Priority 1: Pick exam that actually has published marks (mark_count > 0)
      // Ordered by latest mark insertion/update activity first, then exam date, then ID
      const queryWithMarks =
        examQuery +
        ` GROUP BY e.id HAVING COUNT(m.id) > 0 ORDER BY last_activity DESC, e.exam_date DESC, e.id DESC LIMIT 1`;

      let latestExam =
        examParams.length > 0
          ? await db
              .prepare(queryWithMarks)
              .bind(...examParams)
              .first<any>(undefined as never)
              .catch(() => null)
          : await db
              .prepare(queryWithMarks)
              .first<any>(undefined as never)
              .catch(() => null);

      // Priority 2: Fallback to any exam if no exam with marks exists
      if (!latestExam) {
        const queryAny =
          examQuery + ` GROUP BY e.id ORDER BY e.exam_date DESC, e.id DESC LIMIT 1`;
        latestExam =
          examParams.length > 0
            ? await db
                .prepare(queryAny)
                .bind(...examParams)
                .first<any>(undefined as never)
                .catch(() => null)
            : await db
                .prepare(queryAny)
                .first<any>(undefined as never)
                .catch(() => null);
      }

      // 3. Fetch available exams list for the subject so user can switch exams if multiple exist
      let availableExams: Array<{ id: number; title: string; examDate: string; markCount: number }> = [];
      const targetSubjectId = subjectId || latestExam?.subject_id;
      if (targetSubjectId) {
        const exRows = (
          await db
            .prepare(
              `SELECT e.id, e.title, e.exam_date, COUNT(m.id) as mark_count
               FROM exams e
               LEFT JOIN marks m ON m.exam_id = e.id
               WHERE e.subject_id = ? AND COALESCE(e.is_published, 0) = 1
               GROUP BY e.id
               HAVING COUNT(m.id) > 0
               ORDER BY e.exam_date DESC, e.id DESC
               LIMIT 8`
            )
            .bind(targetSubjectId)
            .all<any>()
            .catch(() => null)
        )?.results ?? [];

        availableExams = exRows.map((r: any) => ({
          id: r.id,
          title: r.title,
          examDate: r.exam_date,
          markCount: Number(r.mark_count) || 0,
        }));
      }

      if (!latestExam) {
        return ok({
          exam: null,
          subjects: subjectsList,
          exams: [],
          top3: [],
          results: [],
          myResult: null,
          isStudentView: user.role === "STUDENT",
        });
      }

      // 4. Fetch all marks for this exam with student info and photo privacy flag
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

      // Resolve teacher who took / manages the exam
      const teacherName = latestExam.creator_name || latestExam.subj_teacher_name || null;
      const teacherUsername = latestExam.creator_username || latestExam.subj_teacher_username || null;
      const teacherId = latestExam.creator_teacher_id || latestExam.subj_teacher_id || null;
      const teacherPhotoKey = latestExam.creator_photo_key || latestExam.subj_photo_key || null;

      const teacher = teacherName
        ? {
            id: teacherId,
            name: teacherName,
            username: teacherUsername,
            photoKey: teacherPhotoKey,
            photoUrl: teacherPhotoKey ? `/api/files/${teacherPhotoKey}` : null,
          }
        : null;

      return ok({
        exam: {
          id: latestExam.id,
          title: latestExam.title,
          examDate: latestExam.exam_date,
          month: latestExam.month,
          year: latestExam.year,
          totalMarks: latestExam.total_marks,
          className: latestExam.class_name,
          classId: latestExam.class_id,
          division: latestExam.division,
          subjectId: latestExam.subject_id,
          subjectName: latestExam.subject_name,
          markCount: Number(latestExam.mark_count) || 0,
          highestMark: Number(latestExam.highest_mark) || 0,
          isPublished: Number(latestExam.is_published) === 1,
          teacher,
        },
        subjects: subjectsList,
        exams: availableExams,
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
