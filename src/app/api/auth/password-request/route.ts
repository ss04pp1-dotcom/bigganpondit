// /api/auth/password-request — Submit or check status of password change request (Teacher & Student)
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

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
    const db = await getDb();
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      currentPassword?: string;
      newPassword?: string;
      reason?: string;
    };

    if (!body.newPassword || body.newPassword.trim().length < 4) {
      throw new ApiError(400, "নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।");
    }

    // Check if user is authenticated session or unauthenticated request from login page
    let targetUser: { id: number; name: string; username: string; role: string; password_hash?: string } | null = null;
    const sessionUser = await getCurrentUser(db).catch(() => null);

    if (sessionUser) {
      targetUser = sessionUser;
      if (body.currentPassword) {
        const userRow = await db
          .prepare("SELECT password_hash FROM users WHERE id = ?")
          .bind(sessionUser.id)
          .first<{ password_hash: string }>()
          .catch(() => null);
        if (userRow?.password_hash) {
          const valid = await verifyPassword(body.currentPassword, userRow.password_hash);
          if (!valid) {
            throw new ApiError(400, "বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
          }
        }
      }
    } else {
      // Unauthenticated request from login page (Forgot Password)
      const uname = (body.username ?? "").trim();
      if (!uname) {
        throw new ApiError(400, "ইউজারনেম বা আইডি প্রদান আবশ্যক।");
      }

      targetUser = await db
        .prepare("SELECT id, name, username, role FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1")
        .bind(uname)
        .first<{ id: number; name: string; username: string; role: string }>()
        .catch(() => null);

      if (!targetUser) {
        throw new ApiError(404, "এই ইউজারনেম দিয়ে কোনো ব্যবহারকারী পাওয়া যায়নি। সঠিক ইউজারনেম দিন।");
      }
    }

    // Hash the requested new password
    const newHash = await hashPassword(body.newPassword.trim());

    // Mark previous pending requests as SUPERSEDED
    await db
      .prepare(
        "UPDATE password_change_requests SET status = 'SUPERSEDED' WHERE user_id = ? AND status = 'PENDING'"
      )
      .bind(targetUser.id)
      .run()
      .catch(() => null);

    // Insert new pending request for Admin review & acceptance
    await db
      .prepare(
        `INSERT INTO password_change_requests (
           user_id, user_name, user_role, username, new_password_hash, reason, status
         ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`
      )
      .bind(
        targetUser.id,
        targetUser.name,
        targetUser.role,
        targetUser.username,
        newHash,
        body.reason?.trim() || "পাসওয়ার্ড ভুলে গেছি — অ্যাডমিন অনুমোদনের অনুরোধ"
      )
      .run();

    return ok({
      message: "পাসওয়ার্ড পরিবর্তনের অনুরোধ সফলভাবে অ্যাডমিনের কাছে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন (Accept) করার পর আপনার নতুন পাসওয়ার্ড কার্যকর হবে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
