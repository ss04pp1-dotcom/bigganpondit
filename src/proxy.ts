// Next.js 16 Proxy Convention — Edge session-cookie gate for protected areas.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sid";

const PROTECTED_PREFIXES = [
  "/admin",
  "/director",
  "/teacher",
  "/student",
  "/api/students",
  "/api/marks",
  "/api/results",
  "/api/uploads",
  "/api/backup",
  "/api/settings",
  "/api/admin",
  "/api/attendance",
  "/api/notebooks",
];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/files/")) {
    return NextResponse.next(); // authenticated per-request inside the route
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !req.cookies.get(SESSION_COOKIE)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "লগইন করা আবশ্যক।" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/director/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/api/:path*",
  ],
};
