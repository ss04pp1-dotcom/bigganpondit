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
      // "Origin: null" (sandboxed iframe) or a malformed origin must FAIL CLOSED,
      // not silently pass the CSRF check.
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
    // Fail closed: a URL parse failure means the Origin/Referer was malformed
    // (e.g. "Origin: null") — reject instead of letting the request through.
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, "অননুমোদিত অনুরোধ।");
  }
}

// Rate limiting is now D1-backed and durable — see src/lib/auth/rate-limit.ts
// (the old in-memory Map was per-isolate and ineffective on Cloudflare Workers).

export const MESSAGES = MSG;
