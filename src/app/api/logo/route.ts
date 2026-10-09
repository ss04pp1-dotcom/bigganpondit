// GET /api/logo — Dynamic favicon & branding logo endpoint.
// Returns the uploaded academy logo from Cloudflare R2 if set by admin,
// or returns the official Biggan Pondit academic crest as default.

import { getDb, getSetting } from "@/lib/db";
import { getBucket } from "@/lib/storage/r2";
import { SETTING_ACADEMY_LOGO } from "@/lib/constants";

export const dynamic = "force-dynamic";

const DEFAULT_ACADEMY_SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <!-- Background Shield/Badge -->
  <rect width="100" height="100" rx="22" fill="url(#grad)" />
  <circle cx="50" cy="50" r="42" fill="none" stroke="#334155" stroke-width="2" />
  
  <!-- Graduation Cap (Education) -->
  <path d="M50 25 L80 37 L50 49 L20 37 Z" fill="url(#accent)" />
  <path d="M35 44 L35 58 C35 65 65 65 65 58 L65 44" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
  <path d="M78 38 L78 54 L75 57 L72 54 L72 39" fill="#fbbf24" />

  <!-- Open Book Base -->
  <path d="M26 68 C35 63 46 64 50 67 C54 64 65 63 74 68 L74 80 C65 75 54 76 50 79 C46 76 35 75 26 80 Z" fill="#ffffff" opacity="0.95" />
  <line x1="50" y1="67" x2="50" y2="79" stroke="#0f172a" stroke-width="2" />

  <!-- Science Atom Orbit (Biggan Pondit) -->
  <ellipse cx="50" cy="50" rx="20" ry="7" fill="none" stroke="#38bdf8" stroke-width="1.5" transform="rotate(30 50 50)" opacity="0.7" />
  <circle cx="50" cy="50" r="3" fill="#fbbf24" />
</svg>`;

export async function GET() {
  try {
    const db = await getDb();
    const logoKey = await getSetting(SETTING_ACADEMY_LOGO, "");

    if (logoKey && logoKey.startsWith("academy/")) {
      const bucket = await getBucket();
      const obj = await bucket.get(logoKey);
      if (obj && obj.data) {
        let contentType = "image/png";
        if (logoKey.endsWith(".jpg") || logoKey.endsWith(".jpeg")) contentType = "image/jpeg";
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
    // If DB is initializing or offline, serve default SVG
  }

  return new Response(DEFAULT_ACADEMY_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
