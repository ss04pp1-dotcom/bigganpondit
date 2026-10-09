// /api/notebooks/[id] — Delete notebook
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { getBucket } from "@/lib/storage/r2";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const { id } = await params;
    const notebookId = Number(id);

    const body = (await req.json().catch(() => ({}))) as { downloadAllowed?: boolean | number };
    const allow = body.downloadAllowed ? 1 : 0;

    const nb = await db
      .prepare("SELECT id, title FROM notebooks WHERE id = ?")
      .bind(notebookId)
      .first<{ id: number; title: string }>()
      .catch(() => null);

    if (!nb) throw new ApiError(404, "নোট বুক পাওয়া যায়নি।");

    await db
      .prepare("UPDATE notebooks SET download_allowed = ? WHERE id = ?")
      .bind(allow, notebookId)
      .run();

    return ok({
      message: allow
        ? `'${nb.title}' বইটির ডাউনলোড অনুমতি দেওয়া হয়েছে (Download + Read)।`
        : `'${nb.title}' বইটি রিড-অনলি মোডে রাখা হয়েছে (Download বন্ধ)।`,
      downloadAllowed: allow === 1,
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
