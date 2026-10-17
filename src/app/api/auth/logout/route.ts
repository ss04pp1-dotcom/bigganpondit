// POST & GET /api/auth/logout — destroy session + clear cookie and redirect to /login.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
    if (token) {
      await destroySession(db, token).catch(() => null);
    }
    const opts = sessionCookieOptions();
    jar.set(SESSION_COOKIE, "", { ...opts, maxAge: 0 });

    const accept = req.headers.get("accept") || "";
    const secFetchDest = req.headers.get("sec-fetch-dest") || "";
    const isHtmlNavigation =
      accept.includes("text/html") ||
      secFetchDest === "document" ||
      req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");

    if (isHtmlNavigation) {
      return NextResponse.redirect(new URL("/login", req.url), 303);
    }
    return ok({ message: MSG.loggedOut });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      await destroySession(db, token).catch(() => null);
    }
    const opts = sessionCookieOptions();
    jar.set(SESSION_COOKIE, "", { ...opts, maxAge: 0 });
  } catch {
    // ignore
  }
  return NextResponse.redirect(new URL("/login", req.url), 303);
}

