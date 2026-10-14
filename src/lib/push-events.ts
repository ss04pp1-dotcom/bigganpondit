// src/lib/push-events.ts — server-side event → push-notification bridges.
//
// Every helper is fail-safe: a notification problem must NEVER break the
// primary operation (notice save, routine save, result publish). All calls
// use idempotency keys derived from the event identity so retries and
// double-clicks cannot produce duplicate pushes.
import { enqueueNotification } from "@/lib/push-service";
import type { D1Database } from "@/lib/db/types";
import { classLabel } from "@/lib/constants";

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
