import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError } from "@/lib/api";
import { todayISODateDhaka } from "@/lib/constants";
import {
  ClassHoliday,
  holidayMatchesTarget,
  isValidIsoDate,
} from "@/lib/holiday-utils";
import { notifyClassHolidayDeclared } from "@/lib/push-events";

export const dynamic = "force-dynamic";

const ALLOWED_DIVISIONS = new Set(["SCIENCE", "HUMANITIES"]);

function sanitizeDivision(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned || cleaned === "ALL" || cleaned === "NONE") return null;
  return ALLOWED_DIVISIONS.has(cleaned) ? cleaned : null;
}

// GET /api/holidays
export async function GET(req: NextRequest) {
  try {
    const { user, db } = await requireApiUser();
    const { searchParams } = new URL(req.url);
    const todayDate = todayISODateDhaka();
    const includePast = searchParams.get("includePast") === "1";
    const dateFilter = searchParams.get("date");
    const classFilter = searchParams.get("class");

    if (dateFilter && !isValidIsoDate(dateFilter)) {
      return NextResponse.json(
        { ok: false, error: "সঠিক তারিখ (YYYY-MM-DD) দিন।" },
        { status: 400 }
      );
    }

    let sql = `SELECT * FROM class_holidays WHERE is_active = 1`;
    const params: (string | number)[] = [];

    if (dateFilter) {
      sql += ` AND start_date <= ? AND end_date >= ?`;
      params.push(dateFilter, dateFilter);
    } else if (!includePast) {
      sql += ` AND end_date >= ?`;
      params.push(todayDate);
    }

    if (
      (user.role === "ADMIN" || user.role === "DIRECTOR") &&
      classFilter &&
      classFilter !== "all"
    ) {
      sql += ` AND (class_name = 'ALL' OR TRIM(class_name) = TRIM(?))`;
      params.push(classFilter);
    }

    sql += ` ORDER BY start_date ASC, end_date ASC, id DESC`;

    const stmt = db.prepare(sql);
    const rows =
      (params.length > 0
        ? (await stmt.bind(...params).all<ClassHoliday>()).results
        : (await stmt.all<ClassHoliday>()).results) || [];

    // Strict student scoping: only return holidays applicable to this student
    if (user.role === "STUDENT") {
      let st = await db
        .prepare(
          `SELECT COALESCE(c.name, CAST(s.class_id AS TEXT)) as class_name,
                  s.division,
                  COALESCE(s.batch_id, b.id) as batch_id,
                  COALESCE(b.name, s.batch_name) as batch_name
           FROM students s
           LEFT JOIN classes c ON c.id = s.class_id
           LEFT JOIN batches b ON (
             (s.batch_id IS NOT NULL AND s.batch_id > 0 AND b.id = s.batch_id)
             OR ((s.batch_id IS NULL OR s.batch_id = 0) AND s.batch_name IS NOT NULL AND TRIM(s.batch_name) != '' AND b.class_id = s.class_id AND TRIM(b.name) = TRIM(s.batch_name))
           )
           WHERE s.user_id = ?`
        )
        .bind(user.id)
        .first<{
          class_name: string | null;
          division: string | null;
          batch_id: number | null;
          batch_name: string | null;
        }>()
        .catch(() => null);

      if (!st && user.studentId) {
        st = await db
          .prepare(
            `SELECT COALESCE(c.name, CAST(s.class_id AS TEXT)) as class_name,
                    s.division,
                    COALESCE(s.batch_id, b.id) as batch_id,
                    COALESCE(b.name, s.batch_name) as batch_name
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             LEFT JOIN batches b ON (
               (s.batch_id IS NOT NULL AND s.batch_id > 0 AND b.id = s.batch_id)
               OR ((s.batch_id IS NULL OR s.batch_id = 0) AND s.batch_name IS NOT NULL AND TRIM(s.batch_name) != '' AND b.class_id = s.class_id AND TRIM(b.name) = TRIM(s.batch_name))
             )
             WHERE s.id = ?`
          )
          .bind(user.studentId)
          .first<{
            class_name: string | null;
            division: string | null;
            batch_id: number | null;
            batch_name: string | null;
          }>()
          .catch(() => null);
      }

      const studentHolidays = rows.filter((h) =>
        holidayMatchesTarget(h, {
          className: st?.class_name ?? null,
          division: st?.division ?? null,
          batchId: st?.batch_id ?? null,
          batchName: st?.batch_name ?? null,
        })
      );

      return NextResponse.json({
        ok: true,
        holidays: studentHolidays,
        todayDate,
      });
    }

    return NextResponse.json({
      ok: true,
      holidays: rows,
      todayDate,
    });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/holidays (ADMIN / DIRECTOR only)
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "অবৈধ অনুরোধ।" },
        { status: 400 }
      );
    }

    const startDate = String(body.startDate || body.start_date || "").trim();
    const endDate = String(body.endDate || body.end_date || startDate).trim();
    const reason = String(body.reason || "").trim();

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      return NextResponse.json(
        { ok: false, error: "সঠিক শুরুর ও শেষের তারিখ নির্বাচন করুন।" },
        { status: 400 }
      );
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { ok: false, error: "শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।" },
        { status: 400 }
      );
    }
    if (!reason || reason.length > 200) {
      return NextResponse.json(
        { ok: false, error: "ছুটির কারণ লিখুন (সর্বোচ্চ ২০০ অক্ষর)।" },
        { status: 400 }
      );
    }

    // Accept either `classNames: string[]` or single `className: string`
    let rawClassNames: string[] = [];
    if (Array.isArray(body.classNames) && body.classNames.length > 0) {
      rawClassNames = body.classNames
        .map((c: unknown) => String(c ?? "").trim())
        .filter(Boolean);
    } else if (body.className || body.class_name) {
      rawClassNames = [String(body.className || body.class_name).trim()].filter(Boolean);
    }

    if (rawClassNames.length === 0) {
      return NextResponse.json(
        { ok: false, error: "অন্তত একটি শ্রেণি অথবা 'সকল শ্রেণি' নির্বাচন করুন।" },
        { status: 400 }
      );
    }

    // If 'ALL' is included, collapse to a single 'ALL' entry
    const normalizedClasses = rawClassNames.some((c) => c.toUpperCase() === "ALL")
      ? ["ALL"]
      : Array.from(new Set(rawClassNames)).slice(0, 30);

    const isSingleSpecificClass =
      normalizedClasses.length === 1 && normalizedClasses[0] !== "ALL";

    const division = isSingleSpecificClass ? sanitizeDivision(body.division) : null;

    let batchId: number | null = null;
    let batchName: string | null = null;
    if (isSingleSpecificClass && body.batchId && body.batchId !== "all") {
      const parsedBid = parseInt(String(body.batchId), 10);
      if (!isNaN(parsedBid) && parsedBid > 0) {
        const batchRow = await db
          .prepare("SELECT id, name FROM batches WHERE id = ?")
          .bind(parsedBid)
          .first<{ id: number; name: string }>()
          .catch(() => null);
        if (batchRow) {
          batchId = batchRow.id;
          batchName = batchRow.name;
        }
      }
    }

    const createdIds: number[] = [];

    for (const clsName of normalizedClasses) {
      // Avoid exact duplicate active entry for same class/division/batch/date range
      const existing = await db
        .prepare(
          `SELECT id FROM class_holidays
           WHERE is_active = 1
             AND class_name = ?
             AND COALESCE(division, '') = COALESCE(?, '')
             AND COALESCE(batch_id, 0) = COALESCE(?, 0)
             AND start_date = ?
             AND end_date = ?`
        )
        .bind(clsName, division, batchId, startDate, endDate)
        .first<{ id: number }>()
        .catch(() => null);

      if (existing) {
        await db
          .prepare(
            `UPDATE class_holidays
             SET reason = ?, created_by = ?, created_by_name = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(reason, user.id, user.name, existing.id)
          .run();
        createdIds.push(existing.id);
      } else {
        const res = await db
          .prepare(
            `INSERT INTO class_holidays
              (class_name, division, batch_id, batch_name, start_date, end_date, reason, created_by, created_by_name, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
          )
          .bind(
            clsName,
            division,
            batchId,
            batchName,
            startDate,
            endDate,
            reason,
            user.id,
            user.name
          )
          .run();
        const newId = Number(res.meta?.last_row_id || 0);
        if (newId > 0) createdIds.push(newId);
      }

      // Fail-safe push notification to affected students
      await notifyClassHolidayDeclared(db, {
        className: clsName,
        batchName,
        startDate,
        endDate,
        reason,
        eventId: `${clsName}:${batchId ?? 0}:${startDate}:${endDate}:${Date.now()}`,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      createdIds,
      message: "ছুটি সফলভাবে ঘোষণা করা হয়েছে।",
    });
  } catch (err) {
    return handleError(err);
  }
}

// PUT /api/holidays (ADMIN / DIRECTOR only)
export async function PUT(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "অবৈধ অনুরোধ।" },
        { status: 400 }
      );
    }

    const id = parseInt(String(body.id || ""), 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, error: "সঠিক ছুটির আইডি দিন।" },
        { status: 400 }
      );
    }

    const startDate = String(body.startDate || body.start_date || "").trim();
    const endDate = String(body.endDate || body.end_date || startDate).trim();
    const reason = String(body.reason || "").trim();
    const className = String(body.className || body.class_name || "").trim();

    if (!className) {
      return NextResponse.json(
        { ok: false, error: "শ্রেণি নির্বাচন করুন।" },
        { status: 400 }
      );
    }
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      return NextResponse.json(
        { ok: false, error: "সঠিক তারিখ দিন।" },
        { status: 400 }
      );
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { ok: false, error: "শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।" },
        { status: 400 }
      );
    }
    if (!reason || reason.length > 200) {
      return NextResponse.json(
        { ok: false, error: "ছুটির কারণ লিখুন (সর্বোচ্চ ২০০ অক্ষর)।" },
        { status: 400 }
      );
    }

    const normalizedClass = className.toUpperCase() === "ALL" ? "ALL" : className;
    const division = normalizedClass === "ALL" ? null : sanitizeDivision(body.division);

    let batchId: number | null = null;
    let batchName: string | null = null;
    if (normalizedClass !== "ALL" && body.batchId && body.batchId !== "all") {
      const parsedBid = parseInt(String(body.batchId), 10);
      if (!isNaN(parsedBid) && parsedBid > 0) {
        const batchRow = await db
          .prepare("SELECT id, name FROM batches WHERE id = ?")
          .bind(parsedBid)
          .first<{ id: number; name: string }>()
          .catch(() => null);
        if (batchRow) {
          batchId = batchRow.id;
          batchName = batchRow.name;
        }
      }
    }

    await db
      .prepare(
        `UPDATE class_holidays
         SET class_name = ?, division = ?, batch_id = ?, batch_name = ?,
             start_date = ?, end_date = ?, reason = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        normalizedClass,
        division,
        batchId,
        batchName,
        startDate,
        endDate,
        reason,
        id
      )
      .run();

    return NextResponse.json({
      ok: true,
      message: "ছুটির তথ্য হালনাগাদ করা হয়েছে।",
    });
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/holidays?id=... (ADMIN / DIRECTOR only)
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, error: "সঠিক ছুটির আইডি প্রয়োজন।" },
        { status: 400 }
      );
    }

    await db.prepare("DELETE FROM class_holidays WHERE id = ?").bind(id).run();

    return NextResponse.json({
      ok: true,
      message: "ছুটি বাতিল করা হয়েছে।",
    });
  } catch (err) {
    return handleError(err);
  }
}
