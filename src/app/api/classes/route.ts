// /api/classes — List all classes (authenticated users)
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { handleError, ok } from "@/lib/api";

export async function GET() {
  try {
    await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"]);
    const db = await getDb();
    const classes = (
      await db
        .prepare("SELECT id, name, sort_order FROM classes ORDER BY sort_order DESC")
        .all<{ id: number; name: string; sort_order: number }>()
        .catch(() => null)
    )?.results ?? [];
    return ok({ classes });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
