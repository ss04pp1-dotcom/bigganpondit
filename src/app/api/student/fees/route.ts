// src/app/api/student/fees/route.ts
// Student API for Viewing Fees, Dues Breakdown, Invoices and Notifications

import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { getStudentFeeSummary, FEE_CATEGORY_LABELS } from "@/lib/fees/engine";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser(["STUDENT"]);
    if (!user.studentId) {
      return fail(400, "শিক্ষার্থী আইডি পাওয়া যায়নি।");
    }

    const summary = await getStudentFeeSummary(db, user.studentId);

    // Also get student basic details
    const student = await db
      .prepare(
        `SELECT s.id, s.name, s.roll, s.division, s.section, c.name as class_name, b.name as batch_name
         FROM students s
         JOIN classes c ON c.id = s.class_id
         LEFT JOIN batches b ON b.id = s.batch_id
         WHERE s.id = ?`
      )
      .bind(user.studentId)
      .first<any>()
      .catch(() => null);

    return ok({
      student,
      summary,
      categories: FEE_CATEGORY_LABELS,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["STUDENT"]);
    if (!user.studentId) return fail(400, "শিক্ষার্থী আইডি পাওয়া যায়নি।");

    const body = await req.json().catch(() => ({}));
    const notificationId = body.notificationId;

    if (notificationId) {
      await db
        .prepare(`UPDATE fee_notifications SET is_read = 1 WHERE id = ? AND student_id = ?`)
        .bind(notificationId, user.studentId)
        .run();
    } else {
      // Mark all as read
      await db
        .prepare(`UPDATE fee_notifications SET is_read = 1 WHERE student_id = ?`)
        .bind(user.studentId)
        .run();
    }

    return ok({ message: "নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে।" });
  } catch (err) {
    return handleError(err);
  }
}
