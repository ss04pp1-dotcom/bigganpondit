// /api/admin/result-cards — Official result card data for Admin & Director printing
import { getDb, getSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";
import {
  DEFAULT_ACADEMY_NAME,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
} from "@/lib/constants";
import {
  buildMonthlyClassSummary,
  buildMonthlyReport,
  buildStudentAnnualReport,
  getAllDirectorsList,
  getSubjectTeachersMap,
} from "@/lib/results/reports";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR"]);
    const db = await getDb();
    const url = new URL(req.url);

    const mode = (url.searchParams.get("mode")?.toUpperCase() === "ANNUAL" ? "ANNUAL" : "MONTHLY") as "MONTHLY" | "ANNUAL";
    const className = url.searchParams.get("class") || "10";
    const requiresDiv = className === "9" || className === "10";
    const rawDiv = url.searchParams.get("division");
    const division = requiresDiv ? (rawDiv === "HUMANITIES" ? "HUMANITIES" : "SCIENCE") : null;
    
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const month = Number(url.searchParams.get("month")) || curMonth;
    const year = Number(url.searchParams.get("year")) || curYear;
    const rawStudentId = url.searchParams.get("studentId");
    const isAll = !rawStudentId || rawStudentId === "all";
    const targetStudentId = !isAll ? Number(rawStudentId) : null;

    // Academy Settings & Directors
    const academyName = await getSetting(SETTING_ACADEMY_NAME, DEFAULT_ACADEMY_NAME);
    const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");
    const logoUrl = logoKey ? `/api/files/${logoKey}` : null;
    const cardBgKey = await getSetting("card_bg_image_key", "");
    const cardBgUrl = cardBgKey
      ? cardBgKey.startsWith("http") || cardBgKey.startsWith("data:") || cardBgKey.startsWith("/card")
        ? cardBgKey
        : `/api/files/${cardBgKey}`
      : null;
    const availableDirectors = await getAllDirectorsList(db);
    const teacherMap = await getSubjectTeachersMap(db);

    // Class row
    const classRow = await db
      .prepare("SELECT id FROM classes WHERE name = ?")
      .bind(className)
      .first<{ id: number }>()
      .catch(() => null);
    const classId = classRow?.id ?? 0;

    // Fetch students of this class
    const studentsRes = await db
      .prepare(
        `SELECT st.id, st.name, st.roll, st.division, st.section
         FROM students st
         JOIN classes c ON c.id = st.class_id
         WHERE c.name = ? AND COALESCE(st.division, '') = COALESCE(?, '')
         ORDER BY st.roll ASC`
      )
      .bind(className, division)
      .all<{ id: number; name: string; roll: number; division: string | null; section: string | null }>()
      .catch(() => null);

    const students = studentsRes?.results ?? [];

    // Filter students if single student is selected
    const studentsToProcess = targetStudentId
      ? students.filter((s) => s.id === targetStudentId)
      : students;

    // Cohort summary for monthly position calculation
    let monthlySummary: any = null;
    if (mode === "MONTHLY" && classId) {
      monthlySummary = await buildMonthlyClassSummary(db, {
        classId,
        division,
        month,
        year,
        subjectIds: null,
      }).catch(() => null);
    }

    const cards = [];

    for (const st of studentsToProcess) {
      if (mode === "MONTHLY") {
        const report = await buildMonthlyReport(db, {
          studentId: st.id,
          month,
          year,
          subjectIds: null,
        }).catch(() => null);

        const topEntry = monthlySummary?.entries?.find((e: any) => e.position === 1) || monthlySummary?.entries?.[0];
        const topStudent = topEntry ? {
          totalMarks: topEntry.totalMarks,
          totalObtained: topEntry.totalObtained,
          grade: topEntry.grade,
          gpa: topEntry.gpa,
        } : undefined;

        let totalStudentAbsences = 0;
        let totalStudentFails = 0;

        const officialSubjects = (report?.subjects ?? []).map((s) => {
          const t = teacherMap.get(s.subjectId);
          const exams = report?.examRowsBySubject?.get(s.subjectId) ?? [];
          const absCount = exams.filter((e) => e.attendance === "ABSENT").length;
          totalStudentAbsences += absCount;
          if (s.grade === "F" && !s.isFourth) {
            totalStudentFails++;
          }
          const attendance = absCount > 0 ? (absCount === 1 ? "A1" : `A${absCount}`) : "P";

          return {
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            teacherName: t?.name,
            teacherShortName: t?.shortName,
            totalMarks: s.totalMarks,
            classHighest: s.classHighest,
            obtained: s.obtained,
            grade: s.grade,
            gpa: s.gpa,
            isFourth: s.isFourth,
            attendance,
          };
        });

        const overall = report?.overall ?? {
          totalMarks: 0,
          classHighestTotal: 0,
          obtained: 0,
          grade: "F",
          gpa: 0,
          percentage: 0,
        };

        const position = monthlySummary
          ? monthlySummary.entries.find((e: any) => e.studentId === st.id)?.position
          : undefined;

        const calculatedFine = (totalStudentAbsences * 20) + (totalStudentFails * 50);

        cards.push({
          student: {
            id: st.id,
            name: st.name,
            roll: st.roll,
            className,
            division: st.division,
            section: st.section,
          },
          subjects: officialSubjects,
          overall,
          position: position ? `${position}ম` : "১ম",
          fine: `${calculatedFine}.00৳`,
          topStudent,
          teacherComments: {
            comment1: "আরো ভালো করা উচিত ছিল",
            comment2: "পরীক্ষায় অনুপস্থিত থাকা অন্যায়",
            guardianComment: "",
          },
        });
      } else {
        // ANNUAL mode
        const rep = await buildStudentAnnualReport(db, {
          studentId: st.id,
          year,
          subjectIds: null,
        }).catch(() => null);

        // Fetch annual subject marks for this student
        const marksRows = (
          await db
            .prepare(
              `SELECT s.id as subject_id, s.name as subject_name, s.is_fourth_subject,
                      e.total_marks, m.obtained_marks
               FROM marks m
               JOIN exams e ON e.id = m.exam_id
               JOIN subjects s ON s.id = e.subject_id
               WHERE m.student_id = ? AND e.year = ?
               ORDER BY s.sort_order ASC, s.id ASC`
            )
            .bind(st.id, year)
            .all<{
              subject_id: number;
              subject_name: string;
              is_fourth_subject: number;
              total_marks: number;
              obtained_marks: number;
            }>()
            .catch(() => null)
        )?.results ?? [];

        // Aggregate by subject
        const subMap = new Map<number, { name: string; isFourth: boolean; total: number; obtained: number }>();
        for (const mr of marksRows) {
          const cur = subMap.get(mr.subject_id) ?? {
            name: mr.subject_name,
            isFourth: mr.is_fourth_subject === 1,
            total: 0,
            obtained: 0,
          };
          cur.total += mr.total_marks;
          cur.obtained += mr.obtained_marks;
          subMap.set(mr.subject_id, cur);
        }

        const officialSubjects = Array.from(subMap.entries()).map(([sid, val]) => {
          const t = teacherMap.get(sid);
          const pct = val.total > 0 ? (val.obtained / val.total) * 100 : 0;
          let grade = "F";
          let gpa = 0;
          if (pct >= 80) { grade = "A+"; gpa = 5.0; }
          else if (pct >= 70) { grade = "A"; gpa = 4.0; }
          else if (pct >= 60) { grade = "A-"; gpa = 3.5; }
          else if (pct >= 50) { grade = "B"; gpa = 3.0; }
          else if (pct >= 40) { grade = "C"; gpa = 2.0; }
          else if (pct >= 33) { grade = "D"; gpa = 1.0; }

          return {
            subjectId: sid,
            subjectName: val.name,
            teacherName: t?.name,
            teacherShortName: t?.shortName,
            totalMarks: val.total,
            classHighest: val.total,
            obtained: val.obtained,
            grade,
            gpa,
            isFourth: val.isFourth,
          };
        });

        const totalMarksSum = officialSubjects.reduce((acc, s) => acc + s.totalMarks, 0);
        const obtainedSum = officialSubjects.reduce((acc, s) => acc + s.obtained, 0);
        const overallGpa = rep?.annual.overall.gpa ?? 0;
        const overallGrade = rep?.annual.overall.grade ?? "—";

        cards.push({
          student: {
            id: st.id,
            name: st.name,
            roll: st.roll,
            className,
            division: st.division,
            section: st.section,
          },
          subjects: officialSubjects,
          overall: {
            totalMarks: totalMarksSum,
            classHighestTotal: totalMarksSum,
            obtained: obtainedSum,
            grade: overallGrade,
            gpa: overallGpa,
            percentage: totalMarksSum > 0 ? Math.round((obtainedSum / totalMarksSum) * 100) : 0,
          },
          position: "১ম",
          fine: "০০/-",
          teacherComments: {
            comment1: "বাৎসরিক মূল্যায়ন চমৎকার, গণিত ও বিজ্ঞানে ধারাবাহিক মনোযোগ বজায় রাখতে হবে।",
            comment2: "নিয়মিত উপস্থিতি ও অধ্যবসায় প্রশংসনীয়।",
            guardianComment: "বাসায় পড়াশোনায় সন্তোষজনক অগ্রগতি রয়েছে।",
          },
        });
      }
    }

    return ok({
      cards,
      studentsList: students.map((s) => ({ id: s.id, name: s.name, roll: s.roll })),
      availableDirectors,
      logoUrl,
      cardBgUrl,
      academyName,
      mode,
      month,
      year,
      className,
      division,
      totalStudents: students.length,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
