import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/api";
import { todayISODateDhaka } from "@/lib/constants";
import { notifyRoutineDailyTopicSaved } from "@/lib/push-events";

export const dynamic = "force-dynamic";

interface RoutineDbRow {
  id: number;
  day_of_week: number;
  class_name: string;
  division: string | null;
  section: string | null;
  batch_id: number | null;
  batch_name: string | null;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  start_time: string;
  end_time: string;
}

// POST /api/routines/topic
// Allows teachers/admins to set what they will teach on one or multiple selected class days (Chapter & Topic).
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["TEACHER", "ADMIN", "DIRECTOR"]);

    const body = await req.json();
    const {
      routineId,
      date,
      chapterName,
      topicName,
      objectives,
      action,
    } = body;

    const rId = Number(routineId);
    if (!rId || isNaN(rId)) {
      return NextResponse.json(
        { ok: false, error: "ক্লাস রুটিন আইডি প্রদান করা আবশ্যক।" },
        { status: 400 }
      );
    }

    const targetDate = (date && typeof date === "string" && date.trim())
      ? date.trim()
      : todayISODateDhaka();

    // 1. Fetch routine details including day_of_week
    const routine = await db
      .prepare(
        `SELECT id, day_of_week, class_name, division, section, batch_id, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time
         FROM routines
         WHERE id = ?`
      )
      .bind(rId)
      .first<RoutineDbRow>();

    if (!routine) {
      return NextResponse.json(
        { ok: false, error: "রুটিন স্লটটি পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    let teacherRecordId: number | null = null;
    let authorTeacherName = user.name;

    // 2. Strict Role & Ownership verification
    if (user.role === "TEACHER") {
      const teacher = await db
        .prepare("SELECT id, short_name FROM teachers WHERE user_id = ?")
        .bind(user.id)
        .first<{ id: number; short_name: string }>()
        .catch(() => null);

      if (!teacher) {
        return NextResponse.json(
          { ok: false, error: "শিক্ষক প্রোফাইল খুঁজে পাওয়া যায়নি।" },
          { status: 403 }
        );
      }

      teacherRecordId = teacher.id;

      const matchesId = routine.teacher_id !== null && Number(routine.teacher_id) === Number(teacher.id);
      const matchesName = routine.teacher_name && (
        routine.teacher_name.trim().toLowerCase().includes(user.name.trim().toLowerCase()) ||
        user.name.trim().toLowerCase().includes(routine.teacher_name.trim().toLowerCase()) ||
        (teacher.short_name && routine.teacher_name.trim().toLowerCase() === teacher.short_name.trim().toLowerCase())
      );

      if (!matchesId && !matchesName) {
        return NextResponse.json(
          {
            ok: false,
            error: "অননুমোদিত: আপনি কেবলমাত্র আপনার নিজের নির্ধারিত ক্লাসের পাঠ ও টপিক আপডেট করতে পারেন।",
          },
          { status: 403 }
        );
      }
    } else {
      teacherRecordId = routine.teacher_id;
      authorTeacherName = routine.teacher_name || user.name;
    }

    // 3. Handle Delete / Clear action
    if (action === "delete" || (!topicName?.trim() && !chapterName?.trim())) {
      await db
        .prepare("DELETE FROM routine_daily_topics WHERE routine_id = ?")
        .bind(rId)
        .run();

      return NextResponse.json({
        ok: true,
        message: "আজকের পাঠ/টপিক সফলভাবে মুছে ফেলা হয়েছে।",
      });
    }

    // 4. Validate lesson content
    const cleanChapter = chapterName && typeof chapterName === "string" ? chapterName.trim() : null;
    const cleanTopic = topicName && typeof topicName === "string" ? topicName.trim() : "";
    const cleanObjectives = objectives && typeof objectives === "string" ? objectives.trim() : null;

    if (!cleanTopic && !cleanChapter) {
      return NextResponse.json(
        { ok: false, error: "অধ্যায় বা টপিকের নাম উল্লেখ করা আবশ্যক।" },
        { status: 400 }
      );
    }

    // 5. Upsert into routine_daily_topics for all selected class days
    const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
      ? Array.from(new Set(body.daysOfWeek.map(Number).filter((n: number) => !isNaN(n) && n >= 0 && n <= 6)))
      : [];

    // Helper to calculate target date for a given day of week (0 = Sunday .. 6 = Saturday)
    const computeDateForDayOfWeek = (baseDateStr: string, targetDay: number): string => {
      try {
        const base = new Date(`${baseDateStr}T00:00:00`);
        if (isNaN(base.getTime())) return baseDateStr;
        const curDay = base.getDay();
        let diff = targetDay - curDay;
        if (diff < 0) diff += 7;
        const res = new Date(base);
        res.setDate(res.getDate() + diff);
        return res.toISOString().slice(0, 10);
      } catch {
        return baseDateStr;
      }
    };

    const targetRoutinesMap = new Map<number, { id: number; day_of_week: number }>();

    // If daysOfWeek is empty OR includes the clicked routine's day_of_week, include primary routine
    if (daysOfWeek.length === 0 || daysOfWeek.includes(Number(routine.day_of_week))) {
      targetRoutinesMap.set(rId, { id: rId, day_of_week: Number(routine.day_of_week) });
    }

    // Also find all matching routine slots for the selected daysOfWeek
    if (daysOfWeek.length > 0) {
      const placeholders = daysOfWeek.map(() => "?").join(",");
      const matchingRoutines = (
        await db
          .prepare(
            `SELECT id, day_of_week, teacher_id, teacher_name, batch_id
             FROM routines
             WHERE is_active = 1
               AND class_name = ?
               AND subject_name = ?
               AND day_of_week IN (${placeholders})`
          )
          .bind(routine.class_name, routine.subject_name, ...daysOfWeek)
          .all<{ id: number; day_of_week: number; teacher_id: number | null; teacher_name: string | null; batch_id: number | null }>()
          .catch(() => null)
      )?.results || [];

      for (const mr of matchingRoutines) {
        // If routine has a specific teacher_id, prefer routines of the same teacher or unassigned teacher
        if (
          routine.teacher_id &&
          mr.teacher_id &&
          Number(mr.teacher_id) !== Number(routine.teacher_id)
        ) {
          continue;
        }
        targetRoutinesMap.set(mr.id, { id: mr.id, day_of_week: Number(mr.day_of_week) });
      }
    }

    if (targetRoutinesMap.size === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "নির্বাচিত দিনগুলোর মধ্যে কোনো সক্রিয় ক্লাসের রুটিন পাওয়া যায়নি। বন্ধের দিনে রুটিন পাঠ নির্ধারণ করা যাবে না।",
        },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    const updatedRoutineIds: number[] = [];

    for (const targetSlot of targetRoutinesMap.values()) {
      const slotDate =
        daysOfWeek.length <= 1 && targetSlot.id === rId
          ? targetDate
          : computeDateForDayOfWeek(targetDate, targetSlot.day_of_week);

      // Clear older topic entries for this routine slot so the newly saved topic is always the active one
      await db
        .prepare(`DELETE FROM routine_daily_topics WHERE routine_id = ? AND date != ?`)
        .bind(targetSlot.id, slotDate)
        .run()
        .catch(() => null);

      await db
        .prepare(
          `INSERT INTO routine_daily_topics (
             routine_id, date, chapter_name, topic_name, objectives, teacher_id, teacher_name, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(routine_id, date) DO UPDATE SET
             chapter_name = excluded.chapter_name,
             topic_name = excluded.topic_name,
             objectives = excluded.objectives,
             teacher_id = excluded.teacher_id,
             teacher_name = excluded.teacher_name,
             updated_at = datetime('now')`
        )
        .bind(
          targetSlot.id,
          slotDate,
          cleanChapter,
          cleanTopic || cleanChapter,
          cleanObjectives,
          teacherRecordId,
          authorTeacherName
        )
        .run();

      updatedCount++;
      updatedRoutineIds.push(targetSlot.id);
    }

    // Trigger push notification to students of this class
    await notifyRoutineDailyTopicSaved(db, {
      routineId: rId,
      className: routine.class_name,
      subjectName: routine.subject_name,
      teacherName: authorTeacherName,
      chapterName: cleanChapter,
      topicName: cleanTopic || cleanChapter || "",
      objectives: cleanObjectives,
      date: targetDate,
    }).catch((err) => {
      console.error("[routines/topic] topic notification dispatch caught:", err);
    });

    return NextResponse.json({
      ok: true,
      message: updatedCount > 1
        ? `নির্বাচিত ${updatedCount}টি ক্লাসের দিনে পাঠ ও টপিক সফলভাবে সংরক্ষিত হয়েছে।`
        : "ক্লাসের পাঠ ও টপিক সফলভাবে সংরক্ষিত হয়েছে। শিক্ষার্থীরা রুটিনে এটি দেখতে পাবে।",
      updatedCount,
      updatedRoutineIds,
      data: {
        routineId: rId,
        updatedRoutineIds,
        date: targetDate,
        chapterName: cleanChapter,
        topicName: cleanTopic || cleanChapter,
        objectives: cleanObjectives,
      },
    });
  } catch (err: any) {
    console.error("POST /api/routines/topic error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "টপিক সংরক্ষণ করা যায়নি।" },
      { status: 500 }
    );
  }
}

// DELETE /api/routines/topic
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["TEACHER", "ADMIN", "DIRECTOR"]);

    const { searchParams } = new URL(req.url);
    const routineId = searchParams.get("routineId");

    const rId = Number(routineId);
    if (!rId) {
      return NextResponse.json({ ok: false, error: "রুটিন আইডি প্রয়োজন।" }, { status: 400 });
    }

    if (user.role === "TEACHER") {
      const teacher = await db
        .prepare("SELECT id, short_name FROM teachers WHERE user_id = ?")
        .bind(user.id)
        .first<{ id: number; short_name: string }>()
        .catch(() => null);

      if (!teacher) {
        return NextResponse.json({ ok: false, error: "শিক্ষক প্রোফাইল নেই।" }, { status: 403 });
      }

      const routine = await db
        .prepare("SELECT teacher_id, teacher_name FROM routines WHERE id = ?")
        .bind(rId)
        .first<{ teacher_id: number | null; teacher_name: string }>();

      if (!routine) {
        return NextResponse.json({ ok: false, error: "রুটিন পাওয়া যায়নি।" }, { status: 404 });
      }

      const isOwner =
        (routine.teacher_id && routine.teacher_id === teacher.id) ||
        routine.teacher_name === user.name ||
        (teacher.short_name && routine.teacher_name === teacher.short_name);

      if (!isOwner) {
        return NextResponse.json({ ok: false, error: "অননুমোদিত অ্যাক্সেস।" }, { status: 403 });
      }
    }

    await db
      .prepare("DELETE FROM routine_daily_topics WHERE routine_id = ?")
      .bind(rId)
      .run();

    return NextResponse.json({
      ok: true,
      message: "পাঠ/টপিক মুছে ফেলা হয়েছে।",
    });
  } catch (err: any) {
    console.error("DELETE /api/routines/topic error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "মুছে ফেলা যায়নি।" }, { status: 500 });
  }
}
