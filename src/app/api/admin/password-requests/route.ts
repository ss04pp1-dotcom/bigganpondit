// /api/admin/password-requests — List password change requests (Admin only)
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { db } = await requireApiUser(["ADMIN"]);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ALL";

    let query = `
      SELECT id, user_id, user_name, user_role, username, reason, status, admin_notes, created_at, reviewed_at
      FROM password_change_requests
    `;
    const params: any[] = [];

    if (status !== "ALL") {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END, id DESC LIMIT 100";

    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    const pendingRow = await db
      .prepare("SELECT COUNT(*) as c FROM password_change_requests WHERE status = 'PENDING'")
      .first<{ c: number }>()
      .catch(() => null);

    return ok({
      requests: result.results ?? [],
      pendingCount: pendingRow?.c ?? 0,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
