// src/app/api/admin/fees/sync-fines/route.ts
// Automated Absent & Fail Fine Synchronizer API

import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { syncExamAbsentAndFailFines } from "@/lib/fees/engine";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await req.json().catch(() => ({}));

    const examId = body.examId ? Number(body.examId) : undefined;
    const month = body.month ? Number(body.month) : undefined;
    const year = body.year ? Number(body.year) : undefined;
    const classId = body.classId && body.classId !== "all" ? Number(body.classId) : undefined;

    const result = await syncExamAbsentAndFailFines(db, {
      examId,
      month,
      year,
      classId,
      createdBy: user.id,
    });

    return ok({
      message: `মোট ${result.createdFines}টি জরিমানা সফলভাবে তৈরি ও শিক্ষার্থীদের বকেয়ায় যোগ করা হয়েছে (${result.totalAbsentFines}টি অনুপস্থিতি ও ${result.totalFailFines}টি ফেল জরিমানা)। পূর্ববর্তী ${result.skippedExisting}টি জরিমানা অপরিবর্তিত রাখা হয়েছে।`,
      ...result,
    });
  } catch (err) {
    return handleError(err);
  }
}
