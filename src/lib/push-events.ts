// src/lib/push-events.ts — server-side event → push-notification bridges.
//
// Every helper is fail-safe: a notification problem must NEVER break the
// primary operation (notice save, routine save, result publish). All calls
// use idempotency keys derived from the event identity so retries and
// double-clicks cannot produce duplicate pushes.
import { enqueueNotification } from "@/lib/push-service";
import type { D1Database } from "@/lib/db/types";
import { classLabel, getBangladeshDayOfWeek, todayISODateDhaka } from "@/lib/constants";
import { parseTimeToMinutes, getCurrentDhakaMinutes } from "@/lib/routine-notifications";

/** Notice became visible (admin created approved, or approved a pending one). */
export async function notifyNoticePublished(
  db: D1Database,
  notice: { id: number; title: string; content: string }
): Promise<void> {
  try {
    const body =
      notice.content.length > 140 ? `${notice.content.slice(0, 140)}…` : notice.content;
    await enqueueNotification(db, {
      title: `📢 নতুন নোটিশ: ${notice.title}`,
      body,
      deepLink: "notices",
      targetType: "ALL",
      kind: "NOTICE",
      idempotencyKey: `notice:${notice.id}:published`,
    });
  } catch (e) {
    console.error("[push-events] notice notification failed:", e);
  }
}

/** A routine entry was created or updated for a class. */
export async function notifyRoutineChanged(
  db: D1Database,
  info: {
    classId: number;
    className: string;
    subjectName: string;
    teacherName?: string | null;
    startTime: string;
    endTime: string;
    dayLabel: string;
    roomNo?: string | null;
    eventId: string; // unique per save (row id + update stamp)
  }
): Promise<void> {
  try {
    const room = info.roomNo ? ` (রুম ${info.roomNo})` : "";
    await enqueueNotification(db, {
      title: `🗓 রুটিন আপডেট: ${classLabel(info.className)} — ${info.subjectName}`,
      body: `${info.dayLabel} • ${info.startTime}–${info.endTime}${room}${
        info.teacherName ? ` • ${info.teacherName}` : ""
      } — আপনার ক্লাস রুটিন হালনাগাদ হয়েছে।`,
      deepLink: "routine",
      targetType: "CLASS",
      targetClassId: info.classId,
      kind: "ROUTINE",
      idempotencyKey: `routine:${info.eventId}`,
    });
  } catch (e) {
    console.error("[push-events] routine notification failed:", e);
  }
}

/** Results were published — notify the affected class. */
export async function notifyResultPublished(
  db: D1Database,
  info: {
    classId: number;
    className?: string;
    label: string; // "জানুয়ারি ২০২৬ — ক্লাস টেস্ট ১" or similar
    eventId: string;
  }
): Promise<void> {
  try {
    let className = info.className;
    if (!className) {
      const c = await db
        .prepare("SELECT name FROM classes WHERE id = ?")
        .bind(info.classId)
        .first<{ name: string }>()
        .catch(() => null);
      className = c?.name ?? "";
    }
    await enqueueNotification(db, {
      title: `🏆 ফলাফল প্রকাশ: ${classLabel(className)} — ${info.label}`,
      body: "আপনার ফলাফল প্রকাশিত হয়েছে। অ্যাপে দেখুন।",
      deepLink: "results",
      targetType: "CLASS",
      targetClassId: info.classId,
      kind: "RESULT",
      idempotencyKey: `result:${info.eventId}:published`,
    });
  } catch (e) {
    console.error("[push-events] result notification failed:", e);
  }
}

/** A teacher set or updated today's lesson topic/chapter for a routine item. */
export async function notifyRoutineDailyTopicSaved(
  db: D1Database,
  info: {
    routineId: number;
    className: string;
    subjectName: string;
    teacherName: string;
    chapterName: string | null;
    topicName: string;
    objectives?: string | null;
    date: string;
  }
): Promise<void> {
  try {
    const classRow = await db
      .prepare("SELECT id FROM classes WHERE name = ?")
      .bind(info.className)
      .first<{ id: number }>()
      .catch(() => null);

    const topicPart = info.topicName
      ? `আজকের পাঠ: ${info.topicName}`
      : (info.chapterName ? `নির্ধারিত অধ্যায়: ${info.chapterName}` : "আজকের পাঠ হালনাগাদ হয়েছে");
    const chapterPrefix = (info.chapterName && info.topicName) ? `অধ্যায়: ${info.chapterName} • ` : "";
    const notePart = info.objectives ? ` (${info.objectives})` : "";

    await enqueueNotification(db, {
      title: `📖 আজকের ক্লাসের পাঠ: ${classLabel(info.className)} — ${info.subjectName}`,
      body: `${info.teacherName}: ${chapterPrefix}${topicPart}${notePart}`,
      deepLink: "routine",
      targetType: classRow?.id ? "CLASS" : "ALL",
      targetClassId: classRow?.id ?? undefined,
      kind: "ROUTINE",
      idempotencyKey: `topic:${info.routineId}:${info.date}:${Date.now()}`,
    });
  } catch (e) {
    console.error("[push-events] topic notification failed:", e);
  }
}

/**
 * Automatically scans today's active routines and enqueues push notifications
 * for upcoming classes (10-minute warning and class start).
 * Runs on cron ticks every 5 minutes.
 * Duplicate-protected by deterministic idempotency keys per routine per date.
 */
export async function enqueueUpcomingClassPushReminders(
  db: D1Database
): Promise<number> {
  try {
    const todayDayOfWeek = getBangladeshDayOfWeek(); // 1..7 (Sat=1, Sun=2, ...)
    const todayDate = todayISODateDhaka();
    const nowDhakaMin = getCurrentDhakaMinutes();

    const routines = (
      await db
        .prepare(
          `SELECT r.id, r.class_name, r.subject_name, r.teacher_name, r.start_time, r.end_time, r.room_no,
                  c.id as class_id,
                  rdt.chapter_name, rdt.topic_name
           FROM routines r
           LEFT JOIN classes c ON c.name = r.class_name
           LEFT JOIN routine_daily_topics rdt ON (rdt.routine_id = r.id AND rdt.date = ?)
           WHERE r.day_of_week = ? AND r.is_active = 1`
        )
        .bind(todayDate, todayDayOfWeek)
        .all<{
          id: number;
          class_name: string;
          subject_name: string;
          teacher_name: string | null;
          start_time: string;
          end_time: string;
          room_no: string | null;
          class_id: number | null;
          chapter_name: string | null;
          topic_name: string | null;
        }>()
    ).results || [];

    let count = 0;
    for (const r of routines) {
      const startMin = parseTimeToMinutes(r.start_time);
      if (startMin === null) continue;

      const diff = startMin - nowDhakaMin;
      const room = r.room_no ? ` (রুম ${r.room_no})` : "";
      const teacher = r.teacher_name ? ` • শিক্ষক: ${r.teacher_name}` : "";
      const topicPart = r.topic_name
        ? ` • আজকের পাঠ: ${r.chapter_name ? `${r.chapter_name}: ` : ""}${r.topic_name}`
        : "";

      // 1. 10-minute alert: window 5 to 15 minutes before class
      if (diff >= 5 && diff <= 15) {
        const res = await enqueueNotification(db, {
          title: `🔔 ১০ মিনিট পর ক্লাস শুরু: ${classLabel(r.class_name)} — ${r.subject_name}`,
          body: `${r.start_time}-এ ক্লাস শুরু${room}${teacher}${topicPart}`,
          deepLink: "routine",
          targetType: r.class_id ? "CLASS" : "ALL",
          targetClassId: r.class_id ?? undefined,
          kind: "ROUTINE",
          idempotencyKey: `class-push-10min:${r.id}:${todayDate}`,
        });
        if (res.created) count++;
      }

      // 2. Class starting alert: window -2 to +6 minutes from start time
      if (diff >= -2 && diff <= 6) {
        const res = await enqueueNotification(db, {
          title: `🟢 ক্লাস শুরু হয়েছে: ${classLabel(r.class_name)} — ${r.subject_name}`,
          body: `এখন ${r.subject_name} ক্লাস শুরু হয়েছে${room}${teacher}${topicPart}`,
          deepLink: "routine",
          targetType: r.class_id ? "CLASS" : "ALL",
          targetClassId: r.class_id ?? undefined,
          kind: "ROUTINE",
          idempotencyKey: `class-push-start:${r.id}:${todayDate}`,
        });
        if (res.created) count++;
      }
    }
    return count;
  } catch (err) {
    console.error("[push-events] enqueueUpcomingClassPushReminders error:", err);
    return 0;
  }
}
