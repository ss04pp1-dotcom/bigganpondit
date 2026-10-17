// /api/admin/directors — Director management (Admin)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson, directorCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR"]);
    const db = await getDb();

    // Ensure directors table exists
    await db
      .exec(
        `CREATE TABLE IF NOT EXISTS directors (
           id              INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
           institution     TEXT,
           photo_key       TEXT,
           signature_key   TEXT,
           remarks         TEXT,
           created_at      TEXT NOT NULL DEFAULT (datetime('now'))
         );`
      )
      .catch(() => null);

    const directors = (
      await db
        .prepare(
          `SELECT d.id, d.user_id, d.institution, d.photo_key, d.signature_key, d.remarks, d.created_at,
                  u.name, u.username
           FROM directors d JOIN users u ON u.id = d.user_id ORDER BY d.id ASC`
        )
        .all<Record<string, unknown>>()
        .catch(() => null)
    )?.results ?? [];

    return ok({ directors });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const db = await getDb();
    const body = await parseJson(req, directorCreateSchema);

    // 1. Ensure directors table exists
    await db
      .exec(
        `CREATE TABLE IF NOT EXISTS directors (
           id              INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
           institution     TEXT,
           photo_key       TEXT,
           signature_key   TEXT,
           remarks         TEXT,
           created_at      TEXT NOT NULL DEFAULT (datetime('now')),
           updated_at      TEXT
         );`
      )
      .catch(() => null);

    // 2. Check duplicate username
    const dup = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(body.username)
      .first<{ id: number }>()
      .catch(() => null);

    if (dup) {
      throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে। অন্য ইউজারনেম দিন।");
    }

    const hash = await hashPassword(body.password);

    // 3. Insert into users.
    // SECURITY: NEVER fall back to role 'ADMIN' — that was a privilege
    // escalation bug. On databases whose users.role CHECK predates the
    // DIRECTOR role (migration 0001), we store 'TEACHER' (allowed by the
    // legacy CHECK) — the effective role is resolved to DIRECTOR through
    // the directors table by the login and session layers, so the user
    // still authenticates and is authorized exactly as a DIRECTOR.
    let userRes;
    let storedRole: "DIRECTOR" | "TEACHER" = "DIRECTOR";
    try {
      userRes = await db
        .prepare(
          "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, 'DIRECTOR', ?)"
        )
        .bind(body.username, hash, body.name)
        .run();
    } catch (insertErr) {
      // Legacy CHECK constraint (role IN ('ADMIN','TEACHER','STUDENT')) rejects DIRECTOR.
      console.warn("Direct insert with role 'DIRECTOR' failed, using legacy-compatible 'TEACHER' storage:", insertErr);
      storedRole = "TEACHER";
      userRes = await db
        .prepare(
          "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, 'TEACHER', ?)"
        )
        .bind(body.username, hash, body.name)
        .run();
    }

    // 4. Safely obtain userId
    let userId = Number(userRes?.meta?.last_row_id ?? 0);
    if (!userId) {
      const u = await db
        .prepare("SELECT id FROM users WHERE username = ?")
        .bind(body.username)
        .first<{ id: number }>()
        .catch(() => null);
      userId = Number(u?.id ?? 0);
    }

    if (!userId) {
      throw new ApiError(500, "ব্যবহারকারী অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।");
    }

    // 5. Insert into directors table
    let dirRes;
    try {
      dirRes = await db
        .prepare(
          `INSERT INTO directors (user_id, institution, photo_key, signature_key, remarks)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          userId,
          body.institution ?? null,
          body.photo_key ?? null,
          body.signature_key ?? null,
          body.remarks ?? null
        )
        .run();
    } catch (dirErr: any) {
      console.error("Failed to insert into directors table:", dirErr);
      // Clean up orphaned user record if directors insert failed
      await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run().catch(() => null);
      throw new ApiError(500, `পরিচালক ডাটাবেজে সংরক্ষণ করা যায়নি: ${dirErr?.message || "ত্রুটি"}`);
    }

    let directorId = Number(dirRes?.meta?.last_row_id ?? 0);
    if (!directorId) {
      const d = await db
        .prepare("SELECT id FROM directors WHERE user_id = ?")
        .bind(userId)
        .first<{ id: number }>()
        .catch(() => null);
      directorId = Number(d?.id ?? 0);
    }

    return ok(
      {
        id: directorId,
        user_id: userId,
        role: "DIRECTOR",
        storedRole,
        message: "পরিচালক সফলভাবে যুক্ত করা হয়েছে।",
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
