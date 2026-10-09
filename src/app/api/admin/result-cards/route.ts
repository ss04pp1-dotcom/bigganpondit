// /api/admin/result-cards — Official result card data for Admin & Director printing
import { getDb, getSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";
import {
  DEFAULT_ACADEMY_NAME,
  SETTING_ACADEMY_LOGO,
  SETTING_ACADEMY_NAME,
  cleanCardBgUrl,
} from "@/lib/constants";
import {
  buildMonthlyClassSummary,
  buildMonthlyReport,
  buildStudentAnnualReport,
  getAllDirectorsList,
  getSubjectTeachersMap,
} from "@/lib/results/reports";
import { gradeFromPercentage } from "@/lib/constants";

// ---------------------------------------------------------------- helpers
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function toBanglaNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Proper Bangla ordinal: ১ম, ২য়, ৩য়, ৪র্থ, ৫ম, ৬ষ্ঠ, ১০ম, ১১শ, ২০তম … */
function banglaOrdinal(n: number | undefined | null): string {
  if (!Number.isInteger(n as number) || (n as number) <= 0) return "—";
  const v = n as number;
  const last = v % 10;
  const lastTwo = v % 100;
  let suffix: string;
  if (lastTwo >= 11 && lastTwo <= 19) suffix = "শ";
  else if (v === 10) suffix = "ম";
  else if (last === 0) suffix = "তম";
  else if (last === 2 || last === 3) suffix = "য়";
  else if (last === 4) suffix = "র্থ";
  else if (last === 6) suffix = "ষ্ঠ";
  else suffix = "ম";
  return toBanglaNumber(v) + suffix;
}

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR"]);
    const db = await getDb();
    const url = new URL(req.url);

    const rawMode = url.searchParams.get("mode")?.toUpperCase();
    const mode = (rawMode === "ANNUAL" ? "ANNUAL" : rawMode === "MODEL" ? "MODEL" : "MONTHLY") as "MONTHLY" | "ANNUAL" | "MODEL";
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
    const cardBgKey =
      (await getSetting("card_cover_bg_url", "")) || (await getSetting("card_bg_image_key", ""));
    const cardBgUrl = cleanCardBgUrl(cardBgKey);
    const publicationName = await getSetting("publication_name", "বিজ্ঞান পণ্ডিত প্রকাশনী");
    const publicationLogoKey = await getSetting("publication_logo_key", "");
    const publicationLogoUrl = publicationLogoKey ? `/api/files/${publicationLogoKey}` : null;
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
    // FIX: official printed cards must only ever be built from PUBLISHED marks.
    let monthlySummary: any = null;
    if ((mode === "MONTHLY" || mode === "MODEL") && classId) {
      monthlySummary = await buildMonthlyClassSummary(db, {
        classId,
        division,
        month,
        year,
        subjectIds: null,
        mode,
        publishedOnly: true,
      }).catch(() => null);
    }

    const cards: Array<Record<string, unknown>> = [];

    // ---------------------------- ANNUAL precomputation (once) ----------------------------
    // FIX (was `ORDER BY s.sort_order` — the subjects table has no sort_order
    // column, so the query always threw and the .catch swallowed it, printing
    // annual cards with an EMPTY subject table).
    // One grouped query (published exams only, whole class) gives us:
    // per-student per-subject aggregates, real class-highest per subject and
    // a real class ranking for the annual position.
    const byStudent = new Map<number, Map<number, { name: string; isFourth: boolean; total: number; obtained: number }>>();
    const classHighestBySubject = new Map<number, number>();
    const annualPosition = new Map<number, number>();

    if (mode === "ANNUAL" && classId) {
      const annualRows = (
        await db
          .prepare(
            `SELECT m.student_id, e.subject_id, s.name as subject_name, s.is_fourth_subject,
                    SUM(e.total_marks) as total_marks, SUM(m.obtained_marks) as obtained_marks
             FROM marks m
             JOIN exams e ON e.id = m.exam_id
             JOIN subjects s ON s.id = e.subject_id
             JOIN students st ON st.id = m.student_id
             WHERE st.class_id = ? AND e.year = ? AND COALESCE(e.is_published, 0) = 1
             GROUP BY m.student_id, e.subject_id`
          )
          .bind(classId, year)
          .all<{
            student_id: number;
            subject_id: number;
            subject_name: string;
            is_fourth_subject: number;
            total_marks: number;
            obtained_marks: number;
          }>()
          .catch(() => null)
      )?.results ?? [];

      const cohortIds = new Set(students.map((s) => s.id));

      for (const r of annualRows) {
        if (!cohortIds.has(r.student_id)) continue;
        let subjMap = byStudent.get(r.student_id);
        if (!subjMap) {
          subjMap = new Map();
          byStudent.set(r.student_id, subjMap);
        }
        subjMap.set(r.subject_id, {
          name: r.subject_name,
          isFourth: r.is_fourth_subject === 1,
          total: Number(r.total_marks) || 0,
          obtained: Number(r.obtained_marks) || 0,
        });

        const cur = classHighestBySubject.get(r.subject_id) ?? -1;
        const obtained = Number(r.obtained_marks) || 0;
        if (obtained > cur) classHighestBySubject.set(r.subject_id, obtained);
      }

      // annual ranking across the whole class (percentage desc, obtained desc, roll asc)
      const rankInput = students.map((s) => {
        const subjMap = byStudent.get(s.id);
        let total = 0;
        let obtained = 0;
        if (subjMap) {
          for (const v of subjMap.values()) {
            total += v.total;
            obtained += v.obtained;
          }
        }
        return { id: s.id, roll: s.roll, total, obtained, pct: total > 0 ? obtained / total : 0 };
      });
      const rankOrder = [...rankInput].sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.obtained !== a.obtained) return b.obtained - a.obtained;
        return a.roll - b.roll;
      });
      rankOrder.forEach((r, idx) => annualPosition.set(r.id, idx + 1));
    }

    for (const st of studentsToProcess) {
      if (mode === "MONTHLY" || mode === "MODEL") {
        const report = await buildMonthlyReport(db, {
          studentId: st.id,
          month,
          year,
          subjectIds: null,
          mode,
          publishedOnly: true,
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
          // FIX: real position with proper Bangla ordinals — never a fake "১ম"
          position: banglaOrdinal(position),
          fine: `${calculatedFine}.00৳`,
          topStudent,
          teacherComments: {
            comment1: "আরো ভালো করা উচিত ছিল",
            comment2: "পরীক্ষায় অনুপস্থিত থাকা অন্যায়",
            guardianComment: "",
          },
        });
      } else {
        // ---------------------------- ANNUAL mode ----------------------------
        // Uses the precomputed byStudent / classHighestBySubject /
        // annualPosition maps (published exams only, whole class).
        // Pre-compute the per-student report (published only, consistent with rows)
        const rep = await buildStudentAnnualReport(db, {
          studentId: st.id,
          year,
          subjectIds: null,
        }).catch(() => null);

        const subjMap = byStudent.get(st.id) ?? new Map<number, { name: string; isFourth: boolean; total: number; obtained: number }>();
        // stable subject order: Bangla name, same as the monthly engine
        const subjectEntries = Array.from(subjMap.entries()).sort((a, b) =>
          a[1].name.localeCompare(b[1].name, "bn")
        );

        const officialSubjects = subjectEntries.map(([sid, val]) => {
          const t = teacherMap.get(sid);
          const pct = val.total > 0 ? (val.obtained / val.total) * 100 : 0;
          const g = gradeFromPercentage(pct);

          return {
            subjectId: sid,
            subjectName: val.name,
            teacherName: t?.name,
            teacherShortName: t?.shortName,
            totalMarks: val.total,
            // FIX: real class highest (was: full marks, fabricated)
            classHighest: classHighestBySubject.get(sid) ?? val.obtained,
            obtained: val.obtained,
            grade: g.grade,
            gpa: g.gpa,
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
            classHighestTotal: 0,
            obtained: obtainedSum,
            grade: overallGrade,
            gpa: overallGpa,
            percentage: totalMarksSum > 0 ? Math.round((obtainedSum / totalMarksSum) * 100) : 0,
          },
          // FIX: real computed annual position (was: hardcoded "১ম" for everyone)
          position: banglaOrdinal(annualPosition.get(st.id)),
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
      publicationLogoUrl,
      publicationName,
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
