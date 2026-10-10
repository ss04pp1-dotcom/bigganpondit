// GET /api — status + ensures the database is bootstrapped.

import { getDb } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { APP_TITLE } from "@/lib/constants";

export async function GET() {
  try {
    await getDb(); // triggers schema + seed if needed
    return ok({ status: "running", app: APP_TITLE, time: new Date().toISOString() });
  } catch (e) {
    return handleError(e);
  }
}
