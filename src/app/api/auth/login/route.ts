// POST /api/auth/login — verify credentials, create session, set HttpOnly cookie.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { fail, handleError, ok, assertSameOrigin } from "@/lib/api";
import { LOGIN_RATE, assertNotRateLimited, clearRateLimit, loginRateKey, recordRateFailure } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, MSG, type Role } from "@/lib/constants";
import { parseJson, loginSchema } from "@/lib/validation";
import { roleHome } from "@/lib/auth/guards";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = await parseJson(req, loginSchema);
    const db = await getDb();

    const rlKey = loginRateKey(req, body.username);
    await assertNotRateLimited(db, rlKey, LOGIN_RATE);

    const cleanUsername = body.username.trim();
    // Convert Bengali numerals to English if any in username
    const normalizedUsername = cleanUsername.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const withoutAt = cleanUsername.replace(/^@+/, "");
    const withoutAtNormalized = normalizedUsername.replace(/^@+/, "");

    // Case-insensitive match on username
    let user = await db
      .prepare(
        `SELECT id, name, username, password_hash, role FROM users
         WHERE LOWER(username) = LOWER(?)
            OR LOWER(username) = LOWER(?)
            OR LOWER(username) = LOWER(?)
            OR LOWER(username) = LOWER(?)
         LIMIT 1`
      )
      .bind(cleanUsername, normalizedUsername, withoutAt, withoutAtNormalized)
      .first<{ id: number; name: string; username: string; password_hash: string; role: Role }>(undefined as never)
      .catch(() => null);

    // Constant-time mitigation against username enumeration
    const DUMMY_HASH = "pbkdf2$100000$YXVkaXRzYWx0MTIzNDU2Nw==$YXVkaXRoYXNoMTIzNDU2Nzg5MDEyMzQ1Njc4OTA=";
    const hashToVerify = user ? user.password_hash : DUMMY_HASH;
    let valid = await verifyPassword(body.password, hashToVerify);

    // Fallback for students with initial raw_password in students table
    if (!valid && user && user.role === "STUDENT") {
      const rawCheck = await db
        .prepare("SELECT raw_password FROM students WHERE user_id = ?")
        .bind(user.id)
        .first<{ raw_password: string | null }>()
        .catch(() => null);
      if (rawCheck?.raw_password && rawCheck.raw_password === body.password) {
        valid = true;
      }
    }

    if (!user || !valid) {
      await recordRateFailure(db, rlKey, LOGIN_RATE);
      return fail(401, MSG.loginFailed);
    }
    await clearRateLimit(db, rlKey);

    // housekeeping: drop expired sessions
    await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

    const { token } = await createSession(db, user.id);

    // Check if user is registered in directors table
    const dirRow = await db
      .prepare("SELECT id FROM directors WHERE user_id = ?")
      .bind(user.id)
      .first<{ id: number }>()
      .catch(() => null);

    const effectiveRole: Role = dirRow ? "DIRECTOR" : user.role;

    const res = ok({
      name: user.name,
      role: effectiveRole,
      redirect: roleHome(effectiveRole),
      // Warn when the admin still logs in with the documented initial password.
      mustChangePassword: user.role === "ADMIN" && body.password === "admin123",
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
