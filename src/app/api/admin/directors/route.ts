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

    const dup = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(body.username)
      .first<{ id: number }>()
      .catch(() => null);

    if (dup) {
      throw new ApiError(400, "এই ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে। অন্য ইউজারনেম দিন।");
    }

    const hash = await hashPassword(body.password);
    const userRes = await db
      .prepare(
        "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, 'DIRECTOR', ?)"
      )
      .bind(body.username, hash, body.name)
      .run();

    const userId = userRes.meta.last_row_id;
    const dirRes = await db
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

    return ok(
      {
        id: dirRes.meta.last_row_id,
        user_id: userId,
        message: "পরিচালক সফলভাবে যুক্ত করা হয়েছে।",
      },
      201
    );
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
