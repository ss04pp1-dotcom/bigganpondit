import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/api";
import { todayISODateDhaka } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface RoutineDbRow {
  id: number;
  class_name: string;
  division: string | null;
  section: string | null;
  batch_name: string | null;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  start_time: string;
  end_time: string;
}

// POST /api/routines/topic
// Allows teachers to set what they will teach today (Chapter & Topic).
// STRICT SECURITY: A teacher can ONLY update the topic/chapter of their own assigned classes!
// Teachers cannot alter class times, subjects, teachers, or routine slots.
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

    // 1. Fetch routine details
    const routine = await db
      .prepare(
        `SELECT id, class_name, division, section, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time
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

      // Teachers are strictly restricted to their own classes:
      const matchesId = routine.teacher_id !== null && routine.teacher_id === teacher.id;
      const matchesName = routine.teacher_name && (
        routine.teacher_name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
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
        .prepare("DELETE FROM routine_daily_topics WHERE routine_id = ? AND date = ?")
        .bind(rId, targetDate)
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

    // 5. Upsert into routine_daily_topics
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
        rId,
        targetDate,
        cleanChapter,
        cleanTopic || cleanChapter,
        cleanObjectives,
        teacherRecordId,
        authorTeacherName
      )
      .run();

    return NextResponse.json({
      ok: true,
      message: "আজকের ক্লাসের পাঠ ও টপিক সফলভাবে সংরক্ষিত হয়েছে। শিক্ষার্থীরা রুটিনে এটি দেখতে পাবে।",
      data: {
        routineId: rId,
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
    const date = searchParams.get("date") || todayISODateDhaka();

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
      .prepare("DELETE FROM routine_daily_topics WHERE routine_id = ? AND date = ?")
      .bind(rId, date)
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
