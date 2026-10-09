// /api/admin/students/promotion — Batch class promotion / upgrade at year end
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const url = new URL(req.url);
    const className = url.searchParams.get("class");
    const division = url.searchParams.get("division");
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

    // 1. All classes list
    const classes = (
      await db
        .prepare("SELECT id, name, sort_order FROM classes ORDER BY sort_order ASC")
        .all<{ id: number; name: string; sort_order: number }>()
        .catch(() => null)
    )?.results ?? [];

    if (!className) {
      return ok({ classes, students: [] });
    }

    const currentClass = classes.find((c) => c.name === className);
    if (!currentClass) {
      throw new ApiError(404, "উৎস শ্রেণি খুঁজে পাওয়া যায়নি।");
    }

    // 2. Load students of this class
    let studentQuery = `
      SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key, st.phone, u.username
      FROM students st
      JOIN users u ON u.id = st.user_id
      WHERE st.class_id = ?
    `;
    const params: unknown[] = [currentClass.id];

    if (division === "SCIENCE" || division === "HUMANITIES") {
      studentQuery += " AND st.division = ?";
      params.push(division);
    }

    studentQuery += " ORDER BY st.roll ASC";

    const studentRows = (
      await db
        .prepare(studentQuery)
        .bind(...params)
        .all<{
          id: number;
          name: string;
          roll: number;
          division: string | null;
          section: string | null;
          photo_key: string | null;
          phone: string | null;
          username: string;
        }>()
        .catch(() => null)
    )?.results ?? [];

    // 3. Calculate annual exam performance for this academic year to calculate merit rank
    const perfQuery = `
      SELECT m.student_id,
             SUM(e.total_marks) as total_marks,
             SUM(m.obtained_marks) as obtained_marks
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      JOIN students st ON st.id = m.student_id
      WHERE st.class_id = ? AND e.year = ? AND m.attendance = 'PRESENT'
      GROUP BY m.student_id
    `;
    const perfRows = (
      await db
        .prepare(perfQuery)
        .bind(currentClass.id, year)
        .all<{
          student_id: number;
          total_marks: number;
          obtained_marks: number;
        }>()
        .catch(() => null)
    )?.results ?? [];

    const perfMap = new Map<number, { totalMarks: number; obtainedMarks: number; percentage: number }>();
    for (const p of perfRows) {
      const total = Number(p.total_marks) || 0;
      const obtained = Number(p.obtained_marks) || 0;
      const pct = total > 0 ? (obtained / total) * 100 : 0;
      perfMap.set(p.student_id, { totalMarks: total, obtainedMarks: obtained, percentage: pct });
    }

    // Sort students by percentage descending to compute merit rank
    const sortedForMerit = [...studentRows].sort((a, b) => {
      const pa = perfMap.get(a.id)?.percentage ?? -1;
      const pb = perfMap.get(b.id)?.percentage ?? -1;
      if (pb !== pa) return pb - pa;
      return a.roll - b.roll;
    });

    const rankMap = new Map<number, number>();
    sortedForMerit.forEach((st, idx) => {
      rankMap.set(st.id, idx + 1);
    });

    const enrichedStudents = studentRows.map((st) => {
      const perf = perfMap.get(st.id);
      return {
        id: st.id,
        name: st.name,
        roll: st.roll,
        division: st.division,
        section: st.section,
        photo_key: st.photo_key,
        phone: st.phone,
        username: st.username,
        annualTotalMarks: perf?.totalMarks ?? 0,
        annualTotalObtained: perf?.obtainedMarks ?? 0,
        annualPercentage: perf ? Number(perf.percentage.toFixed(2)) : null,
        meritRank: rankMap.get(st.id) ?? st.roll,
      };
    });

    return ok({
      classes,
      students: enrichedStudents,
      meritYear: year,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();

    const body = (await req.json().catch(() => ({}))) as {
      fromClassName?: string;
      fromDivision?: string | null;
      targetClassName?: string;
      targetDivision?: string | null;
      promotions?: Array<{
        studentId: number;
        newRoll: number;
        newSection?: string | null;
        newDivision?: string | null;
      }>;
    };

    const targetClassName = body.targetClassName?.trim();
    if (!targetClassName) {
      throw new ApiError(400, "টার্গেট শ্রেণি নির্বাচন করুন।");
    }

    const promotions = body.promotions;
    if (!Array.isArray(promotions) || promotions.length === 0) {
      throw new ApiError(400, "অন্তত একজন শিক্ষার্থীকে প্রমোশনের জন্য নির্বাচন করুন।");
    }

    // 1. Ensure target class exists in classes table
    let targetClassRow = await db
      .prepare("SELECT id, name FROM classes WHERE name = ?")
      .bind(targetClassName)
      .first<{ id: number; name: string }>(undefined as never)
      .catch(() => null);

    if (!targetClassRow) {
      if (targetClassName === "ALUMNI" || targetClassName === "উত্তীর্ণ") {
        await db
          .prepare("INSERT INTO classes (name, sort_order) VALUES (?, 99)")
          .bind(targetClassName)
          .run();
        targetClassRow = await db
          .prepare("SELECT id, name FROM classes WHERE name = ?")
          .bind(targetClassName)
          .first<{ id: number; name: string }>(undefined as never)
          .catch(() => null);
      }
    }

    if (!targetClassRow) {
      throw new ApiError(400, `টার্গেট শ্রেণি '${targetClassName}' ডাটাবেজে পাওয়া যায়নি।`);
    }

    const targetClassId = targetClassRow.id;
    const isTarget9or10 = targetClassName === "9" || targetClassName === "10";

    // 2. Validate rolls and divisions
    const seenRolls = new Set<string>();
    for (const p of promotions) {
      const rollNum = Number(p.newRoll);
      if (!Number.isInteger(rollNum) || rollNum <= 0) {
        throw new ApiError(400, `অবৈধ রোল নম্বর (${p.newRoll})। রোল ধনাত্মক সংখ্যা হতে হবে।`);
      }
      const div = p.newDivision ?? body.targetDivision ?? null;
      if (isTarget9or10 && !div) {
        throw new ApiError(400, "৯ম ও ১০ম শ্রেণির জন্য বিভাগ (বিজ্ঞান / মানবিক) নির্বাচন করা আবশ্যক।");
      }
      const key = `${div || "NO_DIV"}:${rollNum}`;
      if (seenRolls.has(key)) {
        throw new ApiError(400, `একই বিভাগ ও শ্রেণিতে একাধিক শিক্ষার্থীকে ডুপ্লিকেট রোল (${rollNum}) দেওয়া যাবে না।`);
      }
      seenRolls.add(key);
    }

    // 2b. PRE-CHECK against students ALREADY in the target class.
    // Without this, the db.batch UPDATE below hits the
    // idx_students_class_div_roll UNIQUE index and dies with a generic 500.
    const promotedIds = promotions.map((p) => p.studentId);
    const existingStudents = (
      await db
        .prepare(
          `SELECT id, roll, COALESCE(division, '') as d
           FROM students WHERE class_id = ? AND id NOT IN (${promotedIds.map(() => "?").join(",")})`
        )
        .bind(targetClassId, ...promotedIds)
        .all<{ id: number; roll: number; d: string }>()
        .catch(() => null)
    )?.results ?? [];
    const existingKeys = new Set(existingStudents.map((s) => `${s.d || "NO_DIV"}:${s.roll}`));
    const conflicts = promotions.filter((p) => {
      const div = (p.newDivision !== undefined ? p.newDivision : body.targetDivision ?? null) || null;
      const targetDiv = isTarget9or10 ? div : null;
      return existingKeys.has(`${targetDiv || "NO_DIV"}:${Number(p.newRoll)}`);
    });
    if (conflicts.length > 0) {
      const rollList = conflicts.map((c) => c.newRoll).join(", ");
      throw new ApiError(
        409,
        `টার্গেট শ্রেণিতে এই রোল নম্বরগুলো ইতোমধ্যে বিদ্যমান: ${rollList}। প্রমোশনের আগে রোল পরিবর্তন করুন বা পুরনো শিক্ষার্থীকে সরান।`
      );
    }

    // 3. Batch update the promoted students
    const stmts: import("@/lib/db/types").D1PreparedStatement[] = [];
    for (const p of promotions) {
      const targetDiv = p.newDivision !== undefined ? p.newDivision : (body.targetDivision ?? null);
      const targetSec = p.newSection !== undefined ? p.newSection : null;
      const targetRoll = Number(p.newRoll);

      stmts.push(
        db
          .prepare(
            `UPDATE students
             SET class_id = ?, division = ?, section = ?, roll = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(
            targetClassId,
            isTarget9or10 ? targetDiv : null,
            targetSec,
            targetRoll,
            p.studentId
          )
      );
    }

    if (stmts.length > 0) {
      await db.batch(stmts);
    }

    return ok({
      success: true,
      count: promotions.length,
      targetClassName,
      message: `সফলভাবে ${promotions.length} জন শিক্ষার্থীকে শ্রেণি '${targetClassName}'-এ প্রমোশন দেওয়া হয়েছে।`,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
