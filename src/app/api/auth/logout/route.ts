// POST /api/auth/logout — destroy session + clear cookie.

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { destroySession, sessionCookieOptions } from "@/lib/auth/session";
import { handleError, ok, assertSameOrigin } from "@/lib/api";
import { MSG, SESSION_COOKIE } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    await destroySession(db, token);
    const opts = sessionCookieOptions();
    jar.set(SESSION_COOKIE, "", { ...opts, maxAge: 0 });
    return ok({ message: MSG.loggedOut });
  } catch (e) {
    return handleError(e);
  }
}
