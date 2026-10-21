// GET /api/logo — Dynamic favicon & branding logo endpoint.
// Returns the uploaded academy logo from Cloudflare R2 if set by admin,
// or serves/redirects to the official Biggan Pondit branding icon as default.

import { NextRequest, NextResponse } from "next/server";
import { getDb, getSetting } from "@/lib/db";
import { getBucket } from "@/lib/storage/r2";
import { SETTING_ACADEMY_LOGO } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isMaskable = searchParams.get("maskable") === "1" || searchParams.get("maskable") === "true";
  const size = searchParams.get("size");
  const isRaw = searchParams.get("raw") === "1";

  // Only return the raw rectangular R2 upload if explicitly requested via ?raw=1.
  // For PWA icons, favicons, splash screens, and notification badges, ALWAYS serve
  // the square 1:1 solid-white-background safe-zone padded icons so Android/Chrome
  // never squishes a rectangle into a square or renders transparency as a black oval.
  if (isRaw) {
    try {
      await getDb();
      const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");

      if (logoKey && logoKey.startsWith("academy/logos/")) {
        const bucket = await getBucket();
        const obj = await bucket.get(logoKey);
        if (obj && obj.data) {
          let contentType = "image/png";
          if (logoKey.endsWith(".jpg") || logoKey.endsWith(".jpeg")) contentType = "image/jpeg";
          else if (logoKey.endsWith(".webp")) contentType = "image/webp";
          else if (logoKey.endsWith(".svg")) contentType = "image/svg+xml";

          return new Response(obj.data as unknown as BodyInit, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=180, s-maxage=300",
            },
          });
        }
      }
    } catch {
      // Fallback to static icons below
    }
  }

  if (isMaskable) {
    if (size === "192") {
      return NextResponse.redirect(new URL("/icons/icon-maskable-192.png?v=5", request.url), 307);
    }
    return NextResponse.redirect(new URL("/icons/icon-maskable-512.png?v=5", request.url), 307);
  }
  if (size === "192") {
    return NextResponse.redirect(new URL("/icons/icon-192.png?v=5", request.url), 307);
  }
  return NextResponse.redirect(new URL("/icons/icon-512.png?v=5", request.url), 307);
}
