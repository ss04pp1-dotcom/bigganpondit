// /api/admin/password-requests/[id] — Approve or Reject a password change request (Admin only)
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN"]);
    const { id } = await params;
    const reqId = Number(id);

    if (!reqId || Number.isNaN(reqId)) {
      throw new ApiError(400, "অবৈধ অনুরোধ আইডি।");
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: "APPROVE" | "REJECT";
      adminNotes?: string;
    };

    if (body.action !== "APPROVE" && body.action !== "REJECT") {
      throw new ApiError(400, "অবৈধ একশন (APPROVE অথবা REJECT আবশ্যক)।");
    }

    // Fetch the request
    const requestRow = await db
      .prepare(
        `SELECT id, user_id, user_name, user_role, username, new_password_hash, status
         FROM password_change_requests
         WHERE id = ?`
      )
      .bind(reqId)
      .first<{
        id: number;
        user_id: number;
        user_name: string;
        user_role: string;
        username: string;
        new_password_hash: string;
        status: string;
      }>()
      .catch(() => null);

    if (!requestRow) {
      throw new ApiError(404, "পাসওয়ার্ড পরিবর্তনের অনুরোধ পাওয়া যায়নি।");
    }

    if (requestRow.status !== "PENDING") {
      throw new ApiError(
        400,
        `এই অনুরোধটি ইতোমধ্যে '${requestRow.status === "APPROVED" ? "অনুমোদিত" : "নিষ্পন্ন"}' অবস্থায় আছে।`
      );
    }

    if (body.action === "APPROVE") {
      // 1) Update user's password in users table
      await db
        .prepare(
          "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(requestRow.new_password_hash, requestRow.user_id)
        .run();

      // 2) Update request status to APPROVED
      await db
        .prepare(
          `UPDATE password_change_requests
           SET status = 'APPROVED', admin_notes = ?, reviewed_at = datetime('now')
           WHERE id = ?`
        )
        .bind(body.adminNotes?.trim() || "অ্যাডমিন কর্তৃক অনুমোদিত", reqId)
        .run();

      // 3) Invalidate old sessions so user logs in with new password
      await db
        .prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(requestRow.user_id)
        .run()
        .catch(() => null);

      return ok({
        message: `${requestRow.user_name} (${requestRow.username})-এর পাসওয়ার্ড সফলভাবে পরিবর্তন ও অনুমোদন করা হয়েছে।`,
      });
    } else {
      // REJECT
      await db
        .prepare(
          `UPDATE password_change_requests
           SET status = 'REJECTED', admin_notes = ?, reviewed_at = datetime('now')
           WHERE id = ?`
        )
        .bind(body.adminNotes?.trim() || "অনুরোধটি বাতিল করা হয়েছে", reqId)
        .run();

      return ok({
        message: `${requestRow.user_name}-এর পাসওয়ার্ড পরিবর্তনের অনুরোধ প্রত্যাখ্যান করা হয়েছে।`,
      });
    }
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
