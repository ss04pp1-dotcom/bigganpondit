import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireApiUser } from "@/lib/auth/guards";
import { DAYS_OF_WEEK, getDayNameBn } from "@/lib/constants";

export const dynamic = "force-dynamic";

export interface RoutineRow {
  id: number;
  day_of_week: number;
  class_name: string;
  division: string | null;
  section: string | null;
  subject_id: number | null;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  start_time: string;
  end_time: string;
  room_no: string | null;
  note: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// GET /api/routines
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(db);
    const { searchParams } = new URL(req.url);

    const dayParam = searchParams.get("day");
    const classParam = searchParams.get("class");
    const divisionParam = searchParams.get("division");
    const teacherIdParam = searchParams.get("teacherId");
    const todayOnly = searchParams.get("todayOnly") === "1" || searchParams.get("todayOnly") === "true";
    const myOnly = searchParams.get("myOnly") === "1" || searchParams.get("myOnly") === "true";

    const todayDayOfWeek = new Date().getDay(); // 0-6

    let targetDay: number | null = null;
    if (dayParam === "today" || todayOnly) {
      targetDay = todayDayOfWeek;
    } else if (dayParam !== null && dayParam !== "" && dayParam !== "all") {
      const parsed = parseInt(dayParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
        targetDay = parsed;
      }
    }

    let studentClass: string | null = null;
    let studentDivision: string | null = null;
    let teacherId: number | null = null;

    if (user?.role === "STUDENT") {
      const st = await db
        .prepare(
          `SELECT s.id, c.name as class_name, s.division, s.section
           FROM students s
           JOIN classes c ON c.id = s.class_id
           WHERE s.user_id = ?`
        )
        .bind(user.id)
        .first<{ id: number; class_name: string; division: string | null; section: string | null }>()
        .catch(() => null);

      if (st) {
        studentClass = st.class_name;
        studentDivision = st.division;
      }
    } else if (user?.role === "TEACHER") {
      const t = await db
        .prepare(`SELECT id FROM teachers WHERE user_id = ?`)
        .bind(user.id)
        .first<{ id: number }>()
        .catch(() => null);

      if (t) {
        teacherId = t.id;
      }
    }

    // Build SQL query
    let sql = `SELECT * FROM routines WHERE is_active = 1`;
    const params: (string | number)[] = [];

    // Filter by day
    if (targetDay !== null) {
      sql += ` AND day_of_week = ?`;
      params.push(targetDay);
    }

    // Scoping for student
    if (user?.role === "STUDENT" && studentClass) {
      sql += ` AND class_name = ?`;
      params.push(studentClass);
      if (studentDivision) {
        sql += ` AND (division IS NULL OR division = '' OR division = ?)`;
        params.push(studentDivision);
      }
    } else if (classParam && classParam !== "all") {
      sql += ` AND class_name = ?`;
      params.push(classParam);
      if (divisionParam && divisionParam !== "all") {
        sql += ` AND (division IS NULL OR division = '' OR division = ?)`;
        params.push(divisionParam);
      }
    }

    // Scoping for teacher
    if (user?.role === "TEACHER" && (myOnly || !teacherIdParam)) {
      if (teacherId) {
        sql += ` AND teacher_id = ?`;
        params.push(teacherId);
      }
    } else if (teacherIdParam && teacherIdParam !== "all") {
      const tid = parseInt(teacherIdParam, 10);
      if (!isNaN(tid)) {
        sql += ` AND teacher_id = ?`;
        params.push(tid);
      }
    }

    sql += ` ORDER BY day_of_week ASC, start_time ASC, class_name ASC`;

    const stmt = db.prepare(sql);
    const rows = params.length > 0 ? (await stmt.bind(...params).all<RoutineRow>()).results : (await stmt.all<RoutineRow>()).results;

    // Fetch teachers list for dropdowns
    const teachersList = (
      await db
        .prepare(
          `SELECT t.id, u.name, t.short_name
           FROM teachers t
           JOIN users u ON u.id = t.user_id
           ORDER BY u.name ASC`
        )
        .all<{ id: number; name: string; short_name: string }>()
        .catch(() => ({ results: [] }))
    ).results;

    // Fetch subjects list
    const subjectsList = (
      await db
        .prepare(
          `SELECT s.id, s.name, c.name as class_name, s.division
           FROM subjects s
           JOIN classes c ON c.id = s.class_id
           ORDER BY c.sort_order ASC, s.name ASC`
        )
        .all<{ id: number; name: string; class_name: string; division: string | null }>()
        .catch(() => ({ results: [] }))
    ).results;

    return NextResponse.json({
      ok: true,
      routines: rows || [],
      todayDayOfWeek,
      todayDayName: getDayNameBn(todayDayOfWeek),
      userContext: {
        role: user?.role || "GUEST",
        userName: user?.name,
        studentClass,
        studentDivision,
        teacherId,
      },
      teachers: teachersList || [],
      subjects: subjectsList || [],
    });
  } catch (err: any) {
    console.error("GET /api/routines error:", err);
    return NextResponse.json({ ok: false, error: "রুটিন লোড করা যায়নি।" }, { status: 500 });
  }
}

// POST /api/routines (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const { db } = await requireApiUser(["ADMIN"]);

    const body = await req.json();
    const {
      dayOfWeek,
      className,
      division = null,
      section = null,
      subjectId = null,
      subjectName,
      teacherId = null,
      teacherName,
      startTime,
      endTime,
      roomNo = null,
      note = null,
      isActive = 1,
    } = body;

    if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ ok: false, error: "সঠিক দিন নির্বাচন করুন।" }, { status: 400 });
    }
    if (!className) {
      return NextResponse.json({ ok: false, error: "শ্রেণী নির্বাচন করুন।" }, { status: 400 });
    }
    if (!subjectName || !subjectName.trim()) {
      return NextResponse.json({ ok: false, error: "বিষয়ের নাম আবশ্যক।" }, { status: 400 });
    }
    if (!teacherName || !teacherName.trim()) {
      return NextResponse.json({ ok: false, error: "শিক্ষকের নাম আবশ্যক।" }, { status: 400 });
    }
    if (!startTime || !startTime.trim()) {
      return NextResponse.json({ ok: false, error: "ক্লাস শুরুর সময় আবশ্যক।" }, { status: 400 });
    }
    if (!endTime || !endTime.trim()) {
      return NextResponse.json({ ok: false, error: "ক্লাস শেষের সময় আবশ্যক।" }, { status: 400 });
    }

    const res = await db
      .prepare(
        `INSERT INTO routines
         (day_of_week, class_name, division, section, subject_id, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        Number(dayOfWeek),
        String(className),
        division || null,
        section || null,
        subjectId ? Number(subjectId) : null,
        subjectName.trim(),
        teacherId ? Number(teacherId) : null,
        teacherName.trim(),
        startTime.trim(),
        endTime.trim(),
        roomNo?.trim() || null,
        note?.trim() || null,
        isActive ? 1 : 0
      )
      .run();

    const insertId = Number(res.meta.last_row_id ?? 0);

    return NextResponse.json({
      ok: true,
      id: insertId,
      message: "ক্লাস রুটিন সফলভাবে যুক্ত করা হয়েছে।",
    });
  } catch (err: any) {
    console.error("POST /api/routines error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "রুটিন যুক্ত করা যায়নি।" }, { status: 500 });
  }
}

// PUT /api/routines (ADMIN only)
export async function PUT(req: NextRequest) {
  try {
    const { db } = await requireApiUser(["ADMIN"]);

    const body = await req.json();
    const {
      id,
      dayOfWeek,
      className,
      division = null,
      section = null,
      subjectId = null,
      subjectName,
      teacherId = null,
      teacherName,
      startTime,
      endTime,
      roomNo = null,
      note = null,
      isActive = 1,
    } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "আইডি প্রয়োজন।" }, { status: 400 });
    }

    await db
      .prepare(
        `UPDATE routines
         SET day_of_week = ?, class_name = ?, division = ?, section = ?,
             subject_id = ?, subject_name = ?, teacher_id = ?, teacher_name = ?,
             start_time = ?, end_time = ?, room_no = ?, note = ?, is_active = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        Number(dayOfWeek),
        String(className),
        division || null,
        section || null,
        subjectId ? Number(subjectId) : null,
        subjectName.trim(),
        teacherId ? Number(teacherId) : null,
        teacherName.trim(),
        startTime.trim(),
        endTime.trim(),
        roomNo?.trim() || null,
        note?.trim() || null,
        isActive ? 1 : 0,
        Number(id)
      )
      .run();

    return NextResponse.json({
      ok: true,
      message: "ক্লাস রুটিন সফলভাবে আপডেট করা হয়েছে।",
    });
  } catch (err: any) {
    console.error("PUT /api/routines error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "রুটিন আপডেট করা যায়নি।" }, { status: 500 });
  }
}

// DELETE /api/routines (ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await requireApiUser(["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "আইডি প্রয়োজন।" }, { status: 400 });
    }

    await db.prepare(`DELETE FROM routines WHERE id = ?`).bind(Number(id)).run();

    return NextResponse.json({
      ok: true,
      message: "ক্লাস রুটিন সফলভাবে মুছে ফেলা হয়েছে।",
    });
  } catch (err: any) {
    console.error("DELETE /api/routines error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "রুটিন মোছা যায়নি।" }, { status: 500 });
  }
}
