import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/api";
import { DAYS_OF_WEEK, getDayNameBn, getBangladeshDayOfWeek } from "@/lib/constants";

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
  teacher_photo_key?: string | null;
  teacher_short_name?: string | null;
  period?: string | null;
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

    // SECURITY: Strictly require authentication - no unauthenticated visitors can view routines
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "রুটিন দেখতে লগইন করা আবশ্যক।" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const dayParam = searchParams.get("day");
    const todayOnly = searchParams.get("todayOnly") === "1" || searchParams.get("todayOnly") === "true";

    const todayDayOfWeek = getBangladeshDayOfWeek(); // 0-6 in Asia/Dhaka

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
    let studentSection: string | null = null;
    let studentRoll: number | null = null;
    let teacherId: number | null = null;
    let teacherShortName: string | null = null;

    if (user.role === "STUDENT") {
      const st = await db
        .prepare(
          `SELECT s.id, c.name as class_name, s.division, s.section, s.roll
           FROM students s
           JOIN classes c ON c.id = s.class_id
           WHERE s.user_id = ?`
        )
        .bind(user.id)
        .first<{ id: number; class_name: string; division: string | null; section: string | null; roll: number | null }>()
        .catch(() => null);

      if (st) {
        studentClass = st.class_name;
        studentDivision = st.division;
        studentSection = st.section;
        studentRoll = st.roll;
      } else {
        // Student has no assigned class: return empty routine
        return NextResponse.json({
          ok: true,
          routines: [],
          todayDayOfWeek,
          todayDayName: getDayNameBn(todayDayOfWeek),
          userContext: {
            role: user.role,
            userName: user.name,
            studentClass: null,
            studentDivision: null,
            studentSection: null,
            studentRoll: null,
          },
          teachers: [],
          subjects: [],
        });
      }
    } else if (user.role === "TEACHER") {
      const t = await db
        .prepare(`SELECT id, short_name FROM teachers WHERE user_id = ?`)
        .bind(user.id)
        .first<{ id: number; short_name: string }>()
        .catch(() => null);

      if (t) {
        teacherId = t.id;
        teacherShortName = t.short_name;
      } else {
        // Teacher has no profile: return empty routine
        return NextResponse.json({
          ok: true,
          routines: [],
          todayDayOfWeek,
          todayDayName: getDayNameBn(todayDayOfWeek),
          userContext: {
            role: user.role,
            userName: user.name,
            teacherId: null,
            teacherShortName: null,
          },
          teachers: [],
          subjects: [],
        });
      }
    }

    // Build SQL query
    let sql = `SELECT r.*,
                      t.photo_key as teacher_photo_key,
                      t.short_name as teacher_short_name
               FROM routines r
               LEFT JOIN teachers t ON (t.id = r.teacher_id OR (r.teacher_id IS NULL AND t.short_name = r.teacher_name))
               LEFT JOIN classes c ON c.name = r.class_name
               WHERE r.is_active = 1 AND COALESCE(c.is_active, 1) = 1`;
    const params: (string | number)[] = [];

    // Filter by day
    if (targetDay !== null) {
      sql += ` AND r.day_of_week = ?`;
      params.push(targetDay);
    }

    // STRICT ROLE SCOPING:
    // 1. Student can NEVER see other students/classes routines
    if (user.role === "STUDENT") {
      sql += ` AND r.class_name = ?`;
      params.push(studentClass!);

      if (studentDivision) {
        sql += ` AND (r.division IS NULL OR r.division = '' OR r.division = ?)`;
        params.push(studentDivision);
      }
      if (studentSection) {
        sql += ` AND (r.section IS NULL OR r.section = '' OR r.section = ?)`;
        params.push(studentSection);
      }
    }
    // 2. Teacher can NEVER see other teachers' routines
    else if (user.role === "TEACHER") {
      sql += ` AND (
        r.teacher_id = ?
        OR r.teacher_name LIKE ?
        OR r.teacher_name LIKE ?
        ${teacherShortName ? "OR (t.short_name IS NOT NULL AND t.short_name = ?) OR r.teacher_name = ?" : ""}
      )`;
      params.push(teacherId!, `%${user.name}%`, `%${user.name.split(" ")[0]}%`);
      if (teacherShortName) {
        params.push(teacherShortName, teacherShortName);
      }
    }
    // 3. Admin & Director have institutional oversight
    else if (user.role === "ADMIN" || user.role === "DIRECTOR") {
      const classParam = searchParams.get("class");
      const divisionParam = searchParams.get("division");
      const teacherIdParam = searchParams.get("teacherId");

      if (classParam && classParam !== "all") {
        sql += ` AND r.class_name = ?`;
        params.push(classParam);
        if (divisionParam && divisionParam !== "all") {
          sql += ` AND (r.division IS NULL OR r.division = '' OR r.division = ?)`;
          params.push(divisionParam);
        }
      }

      if (teacherIdParam && teacherIdParam !== "all") {
        const tid = parseInt(teacherIdParam, 10);
        if (!isNaN(tid)) {
          sql += ` AND r.teacher_id = ?`;
          params.push(tid);
        }
      }
    } else {
      return NextResponse.json({ ok: false, error: "অননুমোদিত অ্যাক্সেস।" }, { status: 403 });
    }

    sql += ` ORDER BY r.day_of_week ASC, r.start_time ASC, r.class_name ASC`;

    const stmt = db.prepare(sql);
    const rows = params.length > 0
      ? (await stmt.bind(...params).all<RoutineRow>()).results
      : (await stmt.all<RoutineRow>()).results;

    // Teachers & subjects directory
    let teachersList: any[] = [];
    let subjectsList: any[] = [];

    if (user.role === "ADMIN" || user.role === "DIRECTOR") {
      teachersList = (
        await db
          .prepare(
            `SELECT t.id, t.user_id, u.name, t.short_name, t.photo_key
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             ORDER BY u.name ASC`
          )
          .all<{ id: number; user_id: number; name: string; short_name: string; photo_key: string | null }>()
          .catch(() => ({ results: [] }))
      ).results;

      subjectsList = (
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
    } else if (user.role === "TEACHER" && teacherId) {
      teachersList = [
        {
          id: teacherId,
          name: user.name,
          short_name: teacherShortName || "",
          photo_key: null,
        },
      ];
    }

    return NextResponse.json({
      ok: true,
      routines: rows || [],
      todayDayOfWeek,
      todayDayName: getDayNameBn(todayDayOfWeek),
      userContext: {
        role: user.role,
        userName: user.name,
        studentClass,
        studentDivision,
        studentSection,
        studentRoll,
        teacherId,
        teacherShortName,
      },
      teachers: teachersList || [],
      subjects: subjectsList || [],
    });
  } catch (err: any) {
    console.error("GET /api/routines error:", err);
    return NextResponse.json({ ok: false, error: "রুটিন লোড করা যায়নি।" }, { status: 500 });
  }
}

// POST /api/routines (ADMIN and DIRECTOR)
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);

    const body = await req.json();
    const {
      dayOfWeek,
      daysOfWeek,
      className,
      division = null,
      section = null,
      subjectId = null,
      subjectName,
      teacherId = null,
      teacherName,
      period = null,
      startTime,
      endTime,
      roomNo = null,
      note = null,
      isActive = 1,
    } = body;

    // Resolve target days: either from daysOfWeek array or single dayOfWeek
    let targetDays: number[] = [];
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      targetDays = Array.from(new Set(daysOfWeek.map((d: any) => Number(d)).filter((d: number) => !isNaN(d) && d >= 0 && d <= 6)));
    } else if (dayOfWeek !== undefined && dayOfWeek !== null && !isNaN(Number(dayOfWeek))) {
      targetDays = [Number(dayOfWeek)];
    }

    if (targetDays.length === 0) {
      return NextResponse.json({ ok: false, error: "অন্তত একটি দিন নির্বাচন করুন।" }, { status: 400 });
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

    const targetClass = await db
      .prepare("SELECT id, name, COALESCE(is_active, 1) as is_active FROM classes WHERE name = ?")
      .bind(String(className))
      .first<{ id: number; name: string; is_active: number }>()
      .catch(() => null);
    if (targetClass && targetClass.is_active === 0) {
      return NextResponse.json(
        { ok: false, error: `'${targetClass.name}' শ্রেণিটি বর্তমানে নিষ্ক্রিয় রয়েছে — নিষ্ক্রিয় শ্রেণির রুটিন তৈরি করা যাবে না।` },
        { status: 400 }
      );
    }

    let finalTeacherId = teacherId ? Number(teacherId) : null;
    if (!finalTeacherId && teacherName) {
      const matchT = await db
        .prepare(
          "SELECT t.id, u.name FROM teachers t JOIN users u ON u.id = t.user_id WHERE u.name = ? OR t.short_name = ? LIMIT 1"
        )
        .bind(teacherName.trim(), teacherName.trim())
        .first<{ id: number; name: string }>()
        .catch(() => null);
      if (matchT) {
        finalTeacherId = matchT.id;
      }
    }

    const insertStmt = db.prepare(
      `INSERT INTO routines 
       (day_of_week, class_name, division, section, subject_id, subject_name, teacher_id, teacher_name, period, start_time, end_time, room_no, note, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let firstInsertId = 0;
    for (const d of targetDays) {
      const res = await insertStmt
        .bind(
          Number(d),
          String(className),
          division || null,
          section || null,
          subjectId ? Number(subjectId) : null,
          subjectName.trim(),
          finalTeacherId,
          teacherName.trim(),
          period ? String(period).trim() : null,
          startTime.trim(),
          endTime.trim(),
          roomNo?.trim() || null,
          note?.trim() || null,
          isActive ? 1 : 0
        )
        .run();
      if (!firstInsertId) {
        firstInsertId = Number(res?.meta?.last_row_id ?? (res as any)?.lastInsertRowid ?? 0);
      }
    }

    return NextResponse.json({
      ok: true,
      id: firstInsertId,
      count: targetDays.length,
      message: targetDays.length > 1 
        ? `${targetDays.length}টি দিনে ক্লাস রুটিন সফলভাবে যুক্ত করা হয়েছে।` 
        : "ক্লাস রুটিন সফলভাবে যুক্ত করা হয়েছে।",
    });
  } catch (err: any) {
    console.error("POST /api/routines error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "রুটিন যুক্ত করা যায়নি।" }, { status: 500 });
  }
}

// PUT /api/routines (ADMIN and DIRECTOR)
export async function PUT(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);

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
      period = null,
      startTime,
      endTime,
      roomNo = null,
      note = null,
      isActive = 1,
    } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "আইডি প্রয়োজন।" }, { status: 400 });
    }

    let finalTeacherId = teacherId ? Number(teacherId) : null;
    if (!finalTeacherId && teacherName) {
      const matchT = await db
        .prepare(
          "SELECT t.id, u.name FROM teachers t JOIN users u ON u.id = t.user_id WHERE u.name = ? OR t.short_name = ? LIMIT 1"
        )
        .bind(teacherName.trim(), teacherName.trim())
        .first<{ id: number; name: string }>()
        .catch(() => null);
      if (matchT) {
        finalTeacherId = matchT.id;
      }
    }

    await db
      .prepare(
        `UPDATE routines
         SET day_of_week = ?, class_name = ?, division = ?, section = ?,
             subject_id = ?, subject_name = ?, teacher_id = ?, teacher_name = ?,
             period = ?, start_time = ?, end_time = ?, room_no = ?, note = ?, is_active = ?,
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
        finalTeacherId,
        teacherName.trim(),
        period ? String(period).trim() : null,
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

// DELETE /api/routines (ADMIN and DIRECTOR)
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);

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
