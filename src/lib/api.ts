// Shared API helpers: typed errors, JSON responses, same-origin (CSRF) check.

import { NextResponse } from "next/server";
import { MSG } from "@/lib/constants";

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export function ok<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(status: number, message: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return fail(e.status, e.message, e.extra);
  }
  console.error("[api]", e);
  return fail(500, "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
}

/** Basic CSRF protection: mutations must come from the same origin. */
export function assertSameOrigin(req: Request): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  try {
    if (origin) {
      const o = new URL(origin);
      if (host && o.host !== host && o.hostname !== host) {
        throw new ApiError(403, "অননুমোদিত অনুরোধ।");
      }
      return;
    }

    if (referer) {
      const r = new URL(referer);
      if (host && r.host !== host && r.hostname !== host) {
        throw new ApiError(403, "অননুমোদিত অনুরোধ।");
      }
      return;
    }

    const secFetchSite = req.headers.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      throw new ApiError(403, "অননুমোদিত অনুরোধ।");
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
  }
}

// ---- simple in-memory login rate limit (per isolate) ----
const attempts = new Map<string, { count: number; until: number }>();

export function loginRateLimit(key: string): void {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && rec.until > now && rec.count >= 8) {
    throw new ApiError(429, "অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
  }
  if (!rec || rec.until <= now) {
    attempts.set(key, { count: 1, until: now + 5 * 60_000 });
  } else {
    rec.count += 1;
  }
}

export function loginRateClear(key: string): void {
  attempts.delete(key);
}

export function loginRateKey(req: Request, username: string): string {
  const ip =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  return `${ip}:${username}`;
}

export const MESSAGES = MSG;
