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
