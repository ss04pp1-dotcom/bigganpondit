import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok, ApiError } from "@/lib/api";
import { getStudentMonthlyComments, saveTeacherMonthlyComment } from "@/lib/results/reports";

export async function GET(req: Request) {
  try {
    const { db } = await requireApiUser(["TEACHER", "ADMIN", "DIRECTOR"]);
    const url = new URL(req.url);

    const studentId = Number(url.searchParams.get("studentId"));
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));
    const mode = url.searchParams.get("mode") || "MONTHLY";

    if (!studentId || !month || !year) {
      return ok({ comments: [] });
    }

    const comments = await getStudentMonthlyComments(db, {
      studentId,
      month,
      year,
      mode,
    });

    return ok({ comments });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await requireApiUser(["TEACHER", "ADMIN", "DIRECTOR"]);
    const body = (await req.json()) as {
      studentId: number;
      teacherId?: number;
      month: number;
      year: number;
      mode?: string;
      comment: string;
    };

    const studentId = Number(body.studentId);
    const month = Number(body.month);
    const year = Number(body.year);
    const comment = String(body.comment || "").trim();

    if (!studentId || isNaN(studentId) || !month || isNaN(month) || !year || isNaN(year) || !comment) {
      throw new ApiError(400, "শিক্ষার্থী, মাস, বছর এবং মন্তব্য প্রদান করা আবশ্যক।");
    }

    // Resolve teacher record specifically for the logged in user (never steal another teacher's ID!)
    let teacherId = user.teacherId;
    if (!teacherId || isNaN(teacherId)) {
      const tRow = await db
        .prepare("SELECT id FROM teachers WHERE user_id = ?")
        .bind(user.id)
        .first<{ id: number }>()
        .catch(() => null);
      if (tRow?.id) {
        teacherId = tRow.id;
      } else {
        const shortName =
          user.role === "ADMIN"
            ? "অ্যাডমিন"
            : user.role === "DIRECTOR"
            ? "পরিচালক"
            : (user.name || "শিক্ষক").slice(0, 6);
        const sigKey = user.signatureKey || null;
        await db
          .prepare("INSERT OR IGNORE INTO teachers (user_id, short_name, signature_key) VALUES (?, ?, ?)")
          .bind(user.id, shortName, sigKey)
          .run()
          .catch(() => null);
        const newTRow = await db
          .prepare("SELECT id FROM teachers WHERE user_id = ?")
          .bind(user.id)
          .first<{ id: number }>()
          .catch(() => null);
        teacherId = newTRow?.id;
      }
    }

    if (!teacherId) {
      throw new ApiError(400, "শিক্ষক প্রোফাইল সনাক্ত করা যায়নি।");
    }

    await saveTeacherMonthlyComment(db, {
      studentId,
      teacherId: Number(teacherId),
      month,
      year,
      comment,
      mode: body.mode || "MONTHLY",
    });

    const updatedComments = await getStudentMonthlyComments(db, {
      studentId,
      month,
      year,
      mode: body.mode || "MONTHLY",
    });

    return ok({ comments: updatedComments, message: "মন্তব্য সফলভাবে সংরক্ষিত হয়েছে।" });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, db } = await requireApiUser(["TEACHER", "ADMIN", "DIRECTOR"]);
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));

    if (!id || isNaN(id)) {
      throw new ApiError(400, "মন্তব্য আইডি প্রদান করা আবশ্যক।");
    }

    if (user.role === "TEACHER" && user.teacherId) {
      await db
        .prepare("DELETE FROM student_monthly_comments WHERE id = ? AND teacher_id = ?")
        .bind(id, user.teacherId)
        .run();
    } else {
      await db
        .prepare("DELETE FROM student_monthly_comments WHERE id = ?")
        .bind(id)
        .run();
    }

    return ok({ message: "মন্তব্য মুছে ফেলা হয়েছে।" });
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
