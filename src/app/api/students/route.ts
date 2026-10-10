// /api/students — GET (filtered list) + POST (create).
// Teacher access is limited to classes they teach; students only see themselves.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { MSG } from "@/lib/constants";
import { parseJson, studentCreateSchema } from "@/lib/validation";
import { getTeacherClasses, teacherClassAllowed } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser();
    const url = new URL(req.url);
    const className = url.searchParams.get("class"); // class name or null
    const batchIdParam = url.searchParams.get("batch_id");
    const division = url.searchParams.get("division"); // SCIENCE|HUMANITIES|null
    const q = url.searchParams.get("q")?.trim() ?? "";

    // Students can only ever see their own record (IDOR protection).
    if (user.role === "STUDENT") {
      if (!user.studentId) throw new ApiError(403, MSG.noPermissionView);
      const own = await db
        .prepare(
          `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key,
                  st.batch_id, COALESCE(b.name, st.batch_name) as batch_name,
                  st.father_name, st.father_occupation, st.mother_name, st.mother_occupation,
                  st.guardian_name, st.guardian_occupation, st.guardian_relation,
                  st.school_name, st.phone, st.address, st.blood_group, st.dob,
                  c.name as class_name, u.username
           FROM students st
           JOIN classes c ON c.id = st.class_id
           JOIN users u ON u.id = st.user_id
           LEFT JOIN batches b ON b.id = st.batch_id
           WHERE st.id = ?`
        )
        .bind(user.studentId)
        .all<Record<string, unknown>>()
        .catch(() => null);
      return ok({ students: own?.results ?? [] });
    }

    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];

    // Teachers: only students of classes they teach (server-side enforced).
    if (user.role === "TEACHER" && user.teacherId) {
      const allowedClasses = await getTeacherClasses(db, user.teacherId);
      // Fail-closed: a teacher with NO assigned classes must not browse every
      // student's PII (phones, addresses, guardian info) school-wide.
      if (allowedClasses.length === 0) {
        return ok({ students: [] });
      }
      if (className && className !== "ALL" && !allowedClasses.includes(className)) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      clauses.push(`c.name IN (${allowedClasses.map(() => "?").join(",")})`);
      params.push(...allowedClasses);
    }

    if (className && className !== "ALL") {
      clauses.push("c.name = ?");
      params.push(className);
    }
    if (batchIdParam && Number(batchIdParam) > 0) {
      clauses.push("st.batch_id = ?");
      params.push(Number(batchIdParam));
    }
    if (division === "SCIENCE" || division === "HUMANITIES") {
      clauses.push("st.division = ?");
      params.push(division);
    }
    if (q) {
      clauses.push("(st.name LIKE ? OR CAST(st.roll AS TEXT) = ? OR u.username LIKE ? OR st.school_name LIKE ? OR st.phone LIKE ? OR b.name LIKE ?)");
      params.push(`%${q}%`, q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const rows = (
      await db
        .prepare(
          `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key,
                  st.batch_id, COALESCE(b.name, st.batch_name) as batch_name,
                  st.father_name, st.father_occupation, st.mother_name, st.mother_occupation,
                  st.guardian_name, st.guardian_occupation, st.guardian_relation,
                  st.school_name, st.phone, st.address, st.blood_group, st.dob,
                  st.hide_photo_from_students,
                  c.name as class_name, c.sort_order, u.username
           FROM students st
           JOIN classes c ON c.id = st.class_id
           JOIN users u ON u.id = st.user_id
           LEFT JOIN batches b ON b.id = st.batch_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY c.sort_order DESC, st.division, st.roll`
        )
        .bind(...params)
        .all<Record<string, unknown>>()
    ).results;

    // Apply student privacy rule: if hide_photo_from_students is 1, mask photo from other students
    const sanitized = rows.map((s: any) => {
      if (user.role === "STUDENT" && s.hide_photo_from_students === 1 && s.id !== user.studentId) {
        return { ...s, photo_key: null };
      }
      return s;
    });

    return ok({ students: sanitized });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER"]);
    const body = await parseJson(req, studentCreateSchema);

    const classRow = await db
      .prepare("SELECT id FROM classes WHERE name = ?")
      .bind(body.className)
      .first<{ id: number }>()
      .catch(() => null);
    if (!classRow) throw new ApiError(400, "শ্রেণি পাওয়া যায়নি।");

    const requiresDivision = body.className === "9" || body.className === "10";
    if (requiresDivision && !body.division) {
      throw new ApiError(400, "বিভাগ নির্বাচন করুন।");
    }
    if (!requiresDivision && body.division) {
      throw new ApiError(400, "এই শ্রেণিতে বিভাগ প্রযোজ্য নয়।");
    }

    if (user.role === "TEACHER" && user.teacherId) {
      const allowed = await teacherClassAllowed(db, user.teacherId, classRow.id);
      if (!allowed) throw new ApiError(403, MSG.noPermissionSubject);
    }

    // uniqueness checks with friendly Bangla messages
    const dupUser = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(body.username)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupUser) throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে।");

    const dupReqUser = await db
      .prepare("SELECT id FROM student_requests WHERE username = ? AND status = 'PENDING'")
      .bind(body.username)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupReqUser) throw new ApiError(400, "এই ইউজারনেম দিয়ে ইতোমধ্যে একটি অনুরোধ অপেক্ষারত আছে।");

    const dupRoll = await db
      .prepare(
        "SELECT id FROM students WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '') AND roll = ?"
      )
      .bind(classRow.id, body.division ?? null, body.roll)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupRoll) throw new ApiError(400, "এই রোল নম্বর ইতোমধ্যে ব্যবহৃত হয়েছে।");

    const dupReqRoll = await db
      .prepare(
        "SELECT id FROM student_requests WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '') AND roll = ? AND status = 'PENDING'"
      )
      .bind(classRow.id, body.division ?? null, body.roll)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupReqRoll) throw new ApiError(400, "এই রোল নম্বর দিয়ে ইতোমধ্যে একটি অনুরোধ অপেক্ষারত আছে।");

    let resolvedBatchId: number | null = body.batchId ?? null;
    let resolvedBatchName: string | null = body.batchName?.trim() ?? null;

    if (resolvedBatchId) {
      const bRow = await db
        .prepare("SELECT id, name FROM batches WHERE id = ?")
        .bind(resolvedBatchId)
        .first<{ id: number; name: string }>()
        .catch(() => null);
      if (bRow) {
        resolvedBatchName = bRow.name;
      } else {
        resolvedBatchId = null;
      }
    } else if (resolvedBatchName) {
      const bRow = await db
        .prepare("SELECT id, name FROM batches WHERE class_id = ? AND name = ?")
        .bind(classRow.id, resolvedBatchName)
        .first<{ id: number; name: string }>()
        .catch(() => null);
      if (bRow) {
        resolvedBatchId = bRow.id;
      }
    }

    const hash = await hashPassword(body.password);

    // If teacher submitted: submit as student request pending admin approval
    if (user.role === "TEACHER") {
      const insRes = await db
        .prepare(
          `INSERT INTO student_requests (
            teacher_id, name, class_id, batch_id, batch_name, division, section, roll, username, password_hash, raw_password,
            father_name, father_occupation, mother_name, mother_occupation,
            guardian_name, guardian_occupation, guardian_relation,
            school_name, phone, address, blood_group, dob, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`
        )
        .bind(
          user.teacherId ?? null,
          body.name,
          classRow.id,
          resolvedBatchId,
          resolvedBatchName,
          body.division ?? null,
          body.section ?? null,
          body.roll,
          body.username,
          hash,
          body.password,
          body.fatherName ?? null,
          body.fatherOccupation ?? null,
          body.motherName ?? null,
          body.motherOccupation ?? null,
          body.guardianName ?? null,
          body.guardianOccupation ?? null,
          body.guardianRelation ?? null,
          body.schoolName ?? null,
          body.phone ?? null,
          body.address ?? null,
          body.bloodGroup ?? null,
          body.dob ?? null
        )
        .run();
      const requestId = Number(insRes.meta.last_row_id ?? 0);
      return ok(
        {
          message: "শিক্ষার্থীর তথ্য সফলভাবে পাঠানো হয়েছে। প্রশাসনের অনুমোদনের পর চূড়ান্তভাবে যুক্ত হবে।",
          pending: true,
          requestId,
        },
        201
      );
    }

    // Admin creates directly
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'STUDENT')")
      .bind(body.name, body.username, hash)
      .run();
    const userId = Number(res.meta.last_row_id ?? 0);
    if (!userId) throw new ApiError(500, "সংরক্ষণ করা যায়নি।");

    await db
      .prepare(
        `INSERT INTO students (
          user_id, name, class_id, batch_id, batch_name, division, section, roll,
          father_name, father_occupation, mother_name, mother_occupation,
          guardian_name, guardian_occupation, guardian_relation,
          school_name, phone, address, blood_group, dob, hide_photo_from_students, raw_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        body.name,
        classRow.id,
        resolvedBatchId,
        resolvedBatchName,
        body.division ?? null,
        body.section ?? null,
        body.roll,
        body.fatherName ?? null,
        body.fatherOccupation ?? null,
        body.motherName ?? null,
        body.motherOccupation ?? null,
        body.guardianName ?? null,
        body.guardianOccupation ?? null,
        body.guardianRelation ?? null,
        body.schoolName ?? null,
        body.phone ?? null,
        body.address ?? null,
        body.bloodGroup ?? null,
        body.dob ?? null,
        body.hidePhotoFromStudents ? 1 : 0,
        body.password
      )
      .run();

    const created = await db
      .prepare("SELECT id, photo_key FROM students WHERE user_id = ?")
      .bind(userId)
      .first<{ id: number; photo_key: string | null }>();
    return ok(
      { message: MSG.saved, studentId: created?.id ?? null, photoKey: created?.photo_key ?? null, pending: false },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
