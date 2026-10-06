// POST /api/auth/login — verify credentials, create session, set HttpOnly cookie.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { fail, handleError, ok, assertSameOrigin, loginRateClear, loginRateKey, loginRateLimit } from "@/lib/api";
import { SESSION_COOKIE, MSG } from "@/lib/constants";
import { parseJson, loginSchema } from "@/lib/validation";
import { roleHome } from "@/lib/auth/guards";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, loginSchema);
    const db = await getDb();

    const rlKey = loginRateKey(req, body.username);
    loginRateLimit(rlKey);

    const user = await db
      .prepare("SELECT id, name, username, password_hash, role FROM users WHERE username = ?")
      .bind(body.username)
      .first<{ id: number; name: string; username: string; password_hash: string; role: "ADMIN" | "TEACHER" | "STUDENT" }>(undefined as never)
      .catch(() => null);

    // Constant-time mitigation against username enumeration
    const DUMMY_HASH = "pbkdf2$100000$YXVkaXRzYWx0MTIzNDU2Nw==$YXVkaXRoYXNoMTIzNDU2Nzg5MDEyMzQ1Njc4OTA=";
    const hashToVerify = user ? user.password_hash : DUMMY_HASH;
    const valid = await verifyPassword(body.password, hashToVerify);
    if (!user || !valid) {
      return fail(401, MSG.loginFailed);
    }
    loginRateClear(rlKey);

    // housekeeping: drop expired sessions
    await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

    const { token } = await createSession(db, user.id);
    const res = ok({
      name: user.name,
      role: user.role,
      redirect: roleHome(user.role),
    }) as NextResponse;
    const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");
    const opts = sessionCookieOptions();
    res.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: isHttps,
      path: opts.path,
      maxAge: opts.maxAge,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
