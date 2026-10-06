// /api/notices/[id] — Approve, Reject or Delete a notice
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN"]);
    const { id } = await params;
    const noticeId = Number(id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: "APPROVE" | "REJECT";
    };

    if (body.action !== "APPROVE" && body.action !== "REJECT") {
      throw new ApiError(400, "অবৈধ একশন (APPROVE অথবা REJECT আবশ্যক)।");
    }

    const notice = await db
      .prepare("SELECT id FROM notices WHERE id = ?")
      .bind(noticeId)
      .first<{ id: number }>()
      .catch(() => null);

    if (!notice) throw new ApiError(404, "নোটিশ পাওয়া যায়নি।");

    if (body.action === "APPROVE") {
      await db
        .prepare("UPDATE notices SET status = 'APPROVED', approved_at = datetime('now') WHERE id = ?")
        .bind(noticeId)
        .run();
      return ok({ message: "নোটিশটি সফলভাবে অনুমোদন করা হয়েছে।" });
    } else {
      await db
        .prepare("UPDATE notices SET status = 'REJECTED' WHERE id = ?")
        .bind(noticeId)
        .run();
      return ok({ message: "নোটিশটি প্রত্যাখ্যান করা হয়েছে।" });
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const { id } = await params;
    const noticeId = Number(id);

    const notice = await db
      .prepare("SELECT author_id FROM notices WHERE id = ?")
      .bind(noticeId)
      .first<{ author_id: number }>()
      .catch(() => null);

    if (!notice) throw new ApiError(404, "নোটিশ পাওয়া যায়নি।");

    if (user.role !== "ADMIN" && notice.author_id !== user.id) {
      throw new ApiError(403, "এই নোটিশটি মুছে ফেলার অনুমতি নেই।");
    }

    await db.prepare("DELETE FROM notices WHERE id = ?").bind(noticeId).run();

    return ok({ message: "নোটিশ মুছে ফেলা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
