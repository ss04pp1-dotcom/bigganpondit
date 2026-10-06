// /api/auth/password-request — Submit or check status of password change request (Teacher & Student)
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    const { user, db } = await requireApiUser();

    const latest = await db
      .prepare(
        `SELECT id, status, reason, admin_notes, created_at, reviewed_at
         FROM password_change_requests
         WHERE user_id = ?
         ORDER BY id DESC LIMIT 1`
      )
      .bind(user.id)
      .first<{
        id: number;
        status: string;
        reason: string | null;
        admin_notes: string | null;
        created_at: string;
        reviewed_at: string | null;
      }>()
      .catch(() => null);

    return ok({ request: latest });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();

    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
      reason?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      throw new ApiError(400, "বর্তমান পাসওয়ার্ড ও নতুন পাসওয়ার্ড উভয়টি প্রদান আবশ্যক।");
    }

    if (body.newPassword.trim().length < 4) {
      throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    // Verify current user password
    const userRow = await db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ password_hash: string }>()
      .catch(() => null);

    if (!userRow) throw new ApiError(404, "ব্যবহারকারী পাওয়া যায়নি।");

    const valid = await verifyPassword(body.currentPassword, userRow.password_hash);
    if (!valid) {
      throw new ApiError(400, "বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
    }

    // Hash the requested new password
    const newHash = await hashPassword(body.newPassword.trim());

    // Mark previous pending requests as SUPERSEDED
    await db
      .prepare(
        "UPDATE password_change_requests SET status = 'SUPERSEDED' WHERE user_id = ? AND status = 'PENDING'"
      )
      .bind(user.id)
      .run()
      .catch(() => null);

    // Insert new pending request
    await db
      .prepare(
        `INSERT INTO password_change_requests (
           user_id, user_name, user_role, username, new_password_hash, reason, status
         ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`
      )
      .bind(
        user.id,
        user.name,
        user.role,
        user.username,
        newHash,
        body.reason?.trim() || null
      )
      .run();

    return ok({
      message: "পাসওয়ার্ড পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন করার পর আপনার নতুন পাসওয়ার্ড কার্যকর হবে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
