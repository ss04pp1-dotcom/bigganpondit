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
    const className = url.searchParams.get("class"); // '6'..'10' or null
    const division = url.searchParams.get("division"); // SCIENCE|HUMANITIES|null
    const q = url.searchParams.get("q")?.trim() ?? "";

    // Students can only ever see their own record (IDOR protection).
    if (user.role === "STUDENT") {
      if (!user.studentId) throw new ApiError(403, MSG.noPermissionView);
      const own = await db
        .prepare(
          `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key, c.name as class_name, u.username
           FROM students st JOIN classes c ON c.id = st.class_id JOIN users u ON u.id = st.user_id
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
      if (allowedClasses.length === 0) return ok({ students: [] });
      if (className && !allowedClasses.includes(className)) {
        throw new ApiError(403, MSG.noPermissionView);
      }
      clauses.push(`c.name IN (${allowedClasses.map(() => "?").join(",")})`);
      params.push(...allowedClasses);
    }

    if (className && /^(6|7|8|9|10)$/.test(className)) {
      clauses.push("c.name = ?");
      params.push(className);
    }
    if (division === "SCIENCE" || division === "HUMANITIES") {
      clauses.push("st.division = ?");
      params.push(division);
    }
    if (q) {
      clauses.push("(st.name LIKE ? OR CAST(st.roll AS TEXT) = ? OR u.username LIKE ?)");
      params.push(`%${q}%`, q, `%${q}%`);
    }

    const rows = (
      await db
        .prepare(
          `SELECT st.id, st.name, st.roll, st.division, st.section, st.photo_key,
                  c.name as class_name, c.sort_order, u.username
           FROM students st
           JOIN classes c ON c.id = st.class_id
           JOIN users u ON u.id = st.user_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY c.sort_order DESC, st.division, st.roll`
        )
        .bind(...params)
        .all<Record<string, unknown>>()
    ).results;

    return ok({ students: rows });
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

    const dupRoll = await db
      .prepare(
        "SELECT id FROM students WHERE class_id = ? AND COALESCE(division,'') = COALESCE(?, '') AND roll = ?"
      )
      .bind(classRow.id, body.division ?? null, body.roll)
      .first<{ id: number }>()
      .catch(() => null);
    if (dupRoll) throw new ApiError(400, "এই রোল নম্বর ইতোমধ্যে ব্যবহৃত হয়েছে।");

    const hash = await hashPassword(body.password);
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'STUDENT')")
      .bind(body.name, body.username, hash)
      .run();
    const userId = Number(res.meta.last_row_id ?? 0);
    if (!userId) throw new ApiError(500, "সংরক্ষণ করা যায়নি।");

    await db
      .prepare(
        "INSERT INTO students (user_id, name, class_id, division, section, roll) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(userId, body.name, classRow.id, body.division ?? null, body.section ?? null, body.roll)
      .run();

    const created = await db.prepare("SELECT id, photo_key FROM students WHERE user_id = ?").bind(userId).first<{ id: number; photo_key: string | null }>();
    return ok({ message: MSG.saved, studentId: created?.id ?? null, photoKey: created?.photo_key ?? null }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
