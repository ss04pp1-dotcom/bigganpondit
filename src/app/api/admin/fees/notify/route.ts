// src/app/api/admin/fees/notify/route.ts
// Send Due Reminders and Monthly Notifications to Students

import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { sendDueReminderNotifications } from "@/lib/fees/engine";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await req.json().catch(() => ({}));

    const classId = body.classId && body.classId !== "all" ? Number(body.classId) : undefined;
    const batchId = body.batchId && body.batchId !== "all" ? Number(body.batchId) : undefined;
    const studentId = body.studentId ? Number(body.studentId) : undefined;
    const customMessage = body.customMessage?.trim() || undefined;

    const res = await sendDueReminderNotifications(db, {
      classId,
      batchId,
      studentId,
      customMessage,
      sentBy: user.id,
    });

    return ok({
      message: `${res.notifiedStudents} জন বকেয়া থাকা শিক্ষার্থীর কাছে স্বয়ংক্রিয় তাগিদ নোটিফিকেশন পাঠানো হয়েছে। সর্বমোট বকেয়া: ${res.totalOutstanding} ৳`,
      ...res,
    });
  } catch (err) {
    return handleError(err);
  }
}
