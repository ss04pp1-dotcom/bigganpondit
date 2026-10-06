// /api/notebooks/[id] — Delete notebook
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);
    const { id } = await params;
    const notebookId = Number(id);

    const nb = await db
      .prepare("SELECT uploaded_by FROM notebooks WHERE id = ?")
      .bind(notebookId)
      .first<{ uploaded_by: number }>()
      .catch(() => null);

    if (!nb) throw new ApiError(404, "নোট বুক পাওয়া যায়নি।");

    if (user.role !== "ADMIN" && nb.uploaded_by !== user.id) {
      throw new ApiError(403, "এই নোট বুকটি মুছে ফেলার অনুমতি নেই।");
    }

    await db.prepare("DELETE FROM notebooks WHERE id = ?").bind(notebookId).run();

    return ok({ message: "নোট বুক সফলভাবে মুছে ফেলা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
