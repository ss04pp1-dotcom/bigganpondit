// /api/admin/student-requests/[id] — Approve or Reject a student registration request
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import type { StudentRequestRow } from "@/lib/db/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN"]);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, MSG.invalidNumber);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "APPROVE" | "REJECT";
      notes?: string;
    };

    if (body.action !== "APPROVE" && body.action !== "REJECT") {
      throw new ApiError(400, "কার্যক্রম নির্বাচন করুন (APPROVE অথবা REJECT)।");
    }

    const item = await db
      .prepare("SELECT * FROM student_requests WHERE id = ?")
      .bind(id)
      .first<StudentRequestRow>()
      .catch(() => null);

    if (!item) throw new ApiError(404, "অনুরোধটি পাওয়া যায়নি।");
    if (item.status !== "PENDING") {
      throw new ApiError(400, `অনুরোধটি ইতোমধ্যেই ${item.status === "APPROVED" ? "অনুমোদিত" : "বাতিল"} করা হয়েছে।`);
    }

    if (body.action === "REJECT") {
      await db
        .prepare(
          `UPDATE student_requests
           SET status = 'REJECTED', admin_notes = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(body.notes?.trim() || "প্রশাসন কর্তৃক বাতিল করা হয়েছে।", user.id, id)
        .run();

      return ok({ message: "অনুরোধটি সফলভাবে বাতিল করা হয়েছে।" });
    }

    // APPROVE flow:
    // 1) Double check username conflict
    const dupUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(item.username)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupUser) throw new ApiError(400, `ইউজারনেম '${item.username}' ইতোমধ্যে ব্যবহৃত হয়েছে। অন্য ইউজারনেম দিয়ে নতুন অনুরোধ করতে বলুন।`);

    // 2) Double check roll conflict
    const dupRoll = await db
      .prepare(
        "SELECT id FROM students WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '') AND roll = ?"
      )
      .bind(item.class_id, item.division ?? null, item.roll)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupRoll) throw new ApiError(400, `রোল নম্বর '${item.roll}' ইতোমধ্যে এই শ্রেণিতে ব্যবহৃত হয়েছে।`);

    // 3) Create user row
    const userRes = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'STUDENT')")
      .bind(item.name, item.username, item.password_hash)
      .run();
    const userId = Number(userRes.meta.last_row_id ?? 0);
    if (!userId) throw new ApiError(500, "শিক্ষার্থী ইউজার তৈরি করা যায়নি।");

    // 4) Create student record
    const studentRes = await db
      .prepare(
        `INSERT INTO students (
          user_id, name, class_id, batch_id, batch_name, division, section, roll, photo_key,
          father_name, father_occupation, mother_name, mother_occupation,
          guardian_name, guardian_occupation, guardian_relation,
          school_name, phone, address, blood_group, dob, raw_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        item.name,
        item.class_id,
        item.batch_id ?? null,
        item.batch_name ?? null,
        item.division ?? null,
        item.section ?? null,
        item.roll,
        item.photo_key ?? null,
        item.father_name ?? null,
        item.father_occupation ?? null,
        item.mother_name ?? null,
        item.mother_occupation ?? null,
        item.guardian_name ?? null,
        item.guardian_occupation ?? null,
        item.guardian_relation ?? null,
        item.school_name ?? null,
        item.phone ?? null,
        item.address ?? null,
        item.blood_group ?? null,
        item.dob ?? null,
        item.raw_password ?? "1234"
      )
      .run();
    const studentId = Number(studentRes.meta.last_row_id ?? 0);

    // 5) Mark request as approved
    await db
      .prepare(
        `UPDATE student_requests
         SET status = 'APPROVED', admin_notes = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(body.notes?.trim() || null, user.id, id)
      .run();

    return ok({
      message: `শিক্ষার্থী '${item.name}' সফলভাবে অনুমোদন ও সিস্টেমে যুক্ত করা হয়েছে।`,
      studentId,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
