import { getDb } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { getOrCreateVapidKeys } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const vapid = await getOrCreateVapidKeys(db);
    return ok({
      publicKey: vapid.publicKey,
    });
  } catch (e) {
    return handleError(e);
  }
}
