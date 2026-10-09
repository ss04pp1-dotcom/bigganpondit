// /api/auth/webauthn/login — Authenticate via Fingerprint / Biometrics / Passkeys
//
// SECURITY: this route performs REAL WebAuthn assertion verification:
//   1. clientData.type must be "webauthn.get"
//   2. clientData.origin must exactly match the request origin (no substring match)
//   3. the challenge must exist, be unexpired, single-use, AND bound to the
//      credential owner's user_id
//   4. authenticatorData.rpIdHash must equal SHA-256(rpId)
//   5. UserPresence flag must be set
//   6. the assertion signature must verify against the stored public key
//   7. the signature counter must increase (clone detection)

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { fail, handleError, ok, assertSameOrigin } from "@/lib/api";
import { SESSION_COOKIE, type Role } from "@/lib/constants";
import { roleHome } from "@/lib/auth/guards";
import { LOGIN_RATE, assertNotRateLimited, clearRateLimit, loginRateKey } from "@/lib/auth/rate-limit";
import { generateRandomChallenge, saveChallenge, verifyAndConsumeChallenge } from "@/lib/auth/webauthn";
import { parseAuthData, verifyAssertionSignature, rpIdHash, constantTimeEqual } from "@/lib/auth/webauthn-crypto";
import { fromBase64Url } from "@/lib/auth/webauthn";

export const dynamic = "force-dynamic";

function allowedOriginsFor(req: Request): string[] {
  const url = new URL(req.url);
  return [
    `https://${url.hostname}`,
    `http://${url.hostname}`,
    `https://${url.host}`,
    `http://${url.host}`,
  ];
}

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const username = url.searchParams.get("username")?.trim();

    const challenge = generateRandomChallenge(32);
    let userId: number | null = null;
    let allowCredentials: { id: string; type: "public-key" }[] = [];

    if (username) {
      const user = await db
        .prepare("SELECT id FROM users WHERE username = ?")
        .bind(username)
        .first<{ id: number }>()
        .catch(() => null);

      if (user) {
        userId = user.id;
        const creds = (
          await db
            .prepare("SELECT credential_id FROM webauthn_credentials WHERE user_id = ?")
            .bind(user.id)
            .all<{ credential_id: string }>()
            .catch(() => null)
        )?.results ?? [];

        allowCredentials = creds.map((c) => ({
          id: c.credential_id,
          type: "public-key",
        }));
      }
    }

    await saveChallenge(db, challenge, userId);

    // Housekeeping: purge expired challenges so the table cannot grow unboundedly.
    await db
      .prepare("DELETE FROM webauthn_challenges WHERE expires_at <= ?")
      .bind(new Date().toISOString())
      .run()
      .catch(() => null);

    return ok({
      challenge,
      rpId: url.hostname,
      allowCredentials,
      userVerification: "preferred",
      timeout: 60000,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const db = await getDb();
    const body = await req.json().catch(() => null) as {
      credentialId?: string;
      rawClientData?: string;
      authenticatorData?: string;
      signature?: string;
    } | null;

    if (!body?.credentialId) {
      return fail(400, "বায়োমেট্রিক আইডি পাওয়া যায়নি।");
    }
    // Signature + authenticatorData are mandatory — without them verification
    // is impossible and login MUST be rejected.
    if (!body.rawClientData || !body.authenticatorData || !body.signature) {
      return fail(401, "বায়োমেট্রিক প্রমাণীকরণ উপাত্ত অসম্পূর্ণ।");
    }

    let clientData: { type?: string; challenge?: string; origin?: string };
    try {
      clientData = JSON.parse(body.rawClientData);
    } catch {
      return fail(400, "অবৈধ ক্লায়েন্ট ডেটা ফরম্যাট।");
    }

    // 1) type check
    if (clientData.type !== "webauthn.get") {
      return fail(403, "অবৈধ বায়োমেট্রিক অনুরোধ ধরন।");
    }

    // 2) exact origin check (no substring matching — "https://evil-example.com" must NOT match)
    const allowed = allowedOriginsFor(req);
    if (typeof clientData.origin !== "string" || !allowed.includes(clientData.origin)) {
      return fail(403, "বায়োমেট্রিক অরিজিন মিসম্যাচ সনাক্ত হয়েছে।");
    }

    const clientChallenge = String(clientData.challenge || "");
    if (!clientChallenge) {
      return fail(401, "বায়োমেট্রিক চ্যালেঞ্জ পাওয়া যায়নি।");
    }

    // 3) fetch the credential first — the challenge must be bound to THIS user
    const cred = await db
      .prepare(
        `SELECT wc.user_id, wc.public_key, wc.counter, u.name, u.username, u.role
         FROM webauthn_credentials wc
         JOIN users u ON u.id = wc.user_id
         WHERE wc.credential_id = ? LIMIT 1`
      )
      .bind(body.credentialId)
      .first<{ user_id: number; public_key: string; counter: number; name: string; username: string; role: Role }>()
      .catch(() => null);

    if (!cred) {
      return fail(401, "এই ফিঙ্গারপ্রিন্টটি কোনো একাউন্টের সাথে যুক্ত নয়। প্রথমে সাধারণ পাসওয়ার্ড দিয়ে লগইন করে ফিঙ্গারপ্রিন্ট যুক্ত করুন।");
    }

    // Durable rate-limit guard (same policy as password login)
    const rlKey = loginRateKey(req, cred.username);
    await assertNotRateLimited(db, rlKey, LOGIN_RATE);

    const validChallenge = await verifyAndConsumeChallenge(db, clientChallenge, cred.user_id);
    if (!validChallenge) {
      return fail(401, "বায়োমেট্রিক সেশনের মেয়াদ শেষ হয়েছে অথবা রি-প্লে অ্যাটাক সনাক্ত হয়েছে।");
    }

    // 4) parse authenticatorData & verify rpIdHash
    const authData = fromBase64Url(body.authenticatorData);
    const signature = fromBase64Url(body.signature);
    let parsed: ReturnType<typeof parseAuthData>;
    try {
      parsed = parseAuthData(authData);
    } catch {
      return fail(400, "অবৈধ অথেনটিকেটর ডেটা।");
    }

    const reqUrl = new URL(req.url);
    const expectedRpIdHash = await rpIdHash(reqUrl.hostname);
    if (!constantTimeEqual(parsed.rpIdHash, expectedRpIdHash)) {
      return fail(403, "বায়োমেট্রিক ডোমেইন যাচাই ব্যর্থ হয়েছে।");
    }

    // 5) user presence flag
    if (!(parsed.flags & 0x01)) {
      return fail(403, "ইউজার উপস্থিতি যাচাই হয়নি।");
    }

    // 6) REAL signature verification against the stored public key
    let signatureValid = false;
    try {
      signatureValid = await verifyAssertionSignature({
        spkiPublicKeyB64: cred.public_key,
        authenticatorData: authData,
        clientDataJSON: body.rawClientData,
        signature,
      });
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      return fail(401, "ফিঙ্গারপ্রিন্ট সিগনেচার যাচাই ব্যর্থ হয়েছে। পাসওয়ার্ড দিয়ে লগইন করে ফিঙ্গারপ্রিন্ট নতুন করে যুক্ত করুন।");
    }

    // 7) counter / clone detection (counter may be 0 on both sides for authenticators without counters)
    const newCounter = parsed.counter;
    const storedCounter = Number(cred.counter) || 0;
    if ((newCounter !== 0 || storedCounter !== 0) && newCounter <= storedCounter) {
      return fail(401, "সন্দেহজনক ফিঙ্গারপ্রিন্ট ডুপ্লিকেশন সনাক্ত হয়েছে।");
    }
    await db
      .prepare("UPDATE webauthn_credentials SET counter = ?, updated_at = datetime('now') WHERE credential_id = ?")
      .bind(newCounter, body.credentialId)
      .run()
      .catch(() => null);

    // Rate limit clear on success (the durable D1-backed limiter)
    await clearRateLimit(db, rlKey);

    // Housekeeping: purge expired sessions
    await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

    // Effective role: a user registered in the directors table is a DIRECTOR
    const dirRow = await db
      .prepare("SELECT id FROM directors WHERE user_id = ?")
      .bind(cred.user_id)
      .first<{ id: number }>()
      .catch(() => null);
    const effectiveRole: Role = dirRow ? "DIRECTOR" : cred.role;

    // Create session
    const { token } = await createSession(db, cred.user_id);
    const res = ok({
      name: cred.name,
      role: effectiveRole,
      redirect: roleHome(effectiveRole),
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
