// /api/admin/directors/[id] — Update or Delete a Director (Admin)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { parseJson, directorUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const { id } = await params;
    const directorId = Number(id);
    if (!directorId || Number.isNaN(directorId)) throw new ApiError(400, "অবৈধ ডিরেক্টর আইডি।");

    const db = await getDb();
    const body = await parseJson(req, directorUpdateSchema);

    const dir = await db
      .prepare("SELECT user_id FROM directors WHERE id = ?")
      .bind(directorId)
      .first<{ user_id: number }>()
      .catch(() => null);

    if (!dir) throw new ApiError(404, "পরিচালক পাওয়া যায়নি।");

    if (body.username) {
      const dup = await db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .bind(body.username, dir.user_id)
        .first<{ id: number }>()
        .catch(() => null);
      if (dup) throw new ApiError(400, "ইউজারনেম ইতোমধ্যে ব্যবহৃত হয়েছে।");

      await db
        .prepare("UPDATE users SET username = ? WHERE id = ?")
        .bind(body.username, dir.user_id)
        .run();
    }

    if (body.name) {
      await db
        .prepare("UPDATE users SET name = ? WHERE id = ?")
        .bind(body.name, dir.user_id)
        .run();
    }

    if (body.password) {
      const hash = await hashPassword(body.password);
      await db
        .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(hash, dir.user_id)
        .run();
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.institution !== undefined) {
      updates.push("institution = ?");
      values.push(body.institution);
    }
    if (body.remarks !== undefined) {
      updates.push("remarks = ?");
      values.push(body.remarks);
    }
    if (body.photo_key !== undefined) {
      updates.push("photo_key = ?");
      values.push(body.photo_key);
    }
    if (body.signature_key !== undefined) {
      updates.push("signature_key = ?");
      values.push(body.signature_key);
    }

    if (updates.length > 0) {
      values.push(directorId);
      await db
        .prepare(`UPDATE directors SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();
    }

    return ok({ message: "পরিচালকের তথ্য সফলভাবে আপডেট হয়েছে।" });
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
    await requireApiUser(["ADMIN"]);
    const { id } = await params;
    const directorId = Number(id);
    if (!directorId || Number.isNaN(directorId)) throw new ApiError(400, "অবৈধ ডিরেক্টর আইডি।");

    const db = await getDb();
    const dir = await db
      .prepare("SELECT user_id FROM directors WHERE id = ?")
      .bind(directorId)
      .first<{ user_id: number }>()
      .catch(() => null);

    if (!dir) throw new ApiError(404, "পরিচালক পাওয়া যায়নি।");

    // Deleting the user cascades to directors table
    await db.prepare("DELETE FROM users WHERE id = ?").bind(dir.user_id).run();

    return ok({ message: "পরিচালক সফলভাবে মুছে ফেলা হয়েছে।" });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
