// /api/auth/webauthn/login — Authenticate via Fingerprint / Biometrics / Passkeys

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { fail, handleError, ok, assertSameOrigin, loginRateKey, loginRateLimit, loginRateClear } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/constants";
import { roleHome } from "@/lib/auth/guards";
import { generateRandomChallenge, saveChallenge, verifyAndConsumeChallenge } from "@/lib/auth/webauthn";

export const dynamic = "force-dynamic";

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
    const body = await req.json();

    const { credentialId, rawClientData } = body;

    if (!credentialId) {
      return fail(400, "বায়োমেট্রিক আইডি পাওয়া যায়নি।");
    }

    // Strict WebAuthn Security: ClientData and Challenge validation is mandatory (no bypass)
    if (!rawClientData) {
      return fail(401, "বায়োমেট্রিক প্রমাণীকরণ উপাত্ত অসম্পূর্ণ।");
    }

    let clientChallenge = "";
    try {
      const clientData = JSON.parse(rawClientData);
      clientChallenge = String(clientData.challenge || "");
      const reqUrl = new URL(req.url);
      if (clientData.origin && !clientData.origin.includes(reqUrl.hostname)) {
        return fail(403, "বায়োমেট্রিক অরিজিন মিসম্যাচ সনাক্ত হয়েছে।");
      }
    } catch {
      return fail(400, "অবৈধ ক্লায়েন্ট ডেটা ফরম্যাট।");
    }

    if (!clientChallenge) {
      return fail(401, "বায়োমেট্রিক চ্যালেঞ্জ পাওয়া যায়নি।");
    }

    const validChallenge = await verifyAndConsumeChallenge(db, clientChallenge);
    if (!validChallenge) {
      return fail(401, "বায়োমেট্রিক সেশনের মেয়াদ শেষ হয়েছে অথবা রি-প্লে অ্যাটাক সনাক্ত হয়েছে।");
    }

    // Find user by credential_id
    const cred = await db
      .prepare(
        `SELECT wc.user_id, u.name, u.username, u.role
         FROM webauthn_credentials wc
         JOIN users u ON u.id = wc.user_id
         WHERE wc.credential_id = ? LIMIT 1`
      )
      .bind(credentialId)
      .first<{ user_id: number; name: string; username: string; role: "ADMIN" | "TEACHER" | "STUDENT" }>()
      .catch(() => null);

    if (!cred) {
      return fail(401, "এই ফিঙ্গারপ্রিন্টটি কোনো একাউন্টের সাথে যুক্ত নয়। প্রথমে সাধারণ পাসওয়ার্ড দিয়ে লগইন করে ফিঙ্গারপ্রিন্ট যুক্ত করুন।");
    }

    // Rate limit clear on success
    const rlKey = loginRateKey(req, cred.username);
    loginRateClear(rlKey);

    // Housekeeping: purge expired sessions
    await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();

    // Create session
    const { token } = await createSession(db, cred.user_id);
    const res = ok({
      name: cred.name,
      role: cred.role,
      redirect: roleHome(cred.role),
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
