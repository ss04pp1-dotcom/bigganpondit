// /api/auth/webauthn/register — Register new biometric / fingerprint credential.
// Requires existing active session (Teachers / Admin / Students).
//
// SECURITY: the challenge from clientDataJSON is mandatory (no fallback),
// clientData.type must be "webauthn.create", origin must match exactly, and
// we parse the attestationObject's authData to extract the REAL COSE public
// key (converted to SPKI) — never a client-supplied opaque blob.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { generateRandomChallenge, saveChallenge, verifyAndConsumeChallenge } from "@/lib/auth/webauthn";
import {
  parseAttestationObject,
  parseAuthData,
  coseKeyToSpki,
  b64Encode,
} from "@/lib/auth/webauthn-crypto";
import { fromBase64Url, toBase64Url } from "@/lib/auth/webauthn";
import { DEFAULT_ACADEMY_NAME } from "@/lib/constants";

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
    const { user, db } = await requireApiUser();
    const url = new URL(req.url);
    const challenge = generateRandomChallenge(32);
    await saveChallenge(db, challenge, user.id);

    const rpName = DEFAULT_ACADEMY_NAME;
    const rpId = url.hostname;

    return ok({
      challenge,
      rp: {
        name: rpName,
        id: rpId,
      },
      user: {
        id: String(user.id),
        name: user.username,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Fingerprint / Touch ID / Face ID / Windows Hello
        userVerification: "preferred",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser();
    const body = (await req.json().catch(() => null)) as {
      credentialId?: string;
      publicKey?: string;
      attestationObject?: string;
      rawClientData?: string;
      deviceName?: string;
    } | null;

    const credentialId = body?.credentialId?.trim();
    // `publicKey` is kept for client compatibility — it historically carried the
    // base64url attestationObject; new clients send `attestationObject` explicitly.
    const attestationB64Url = body?.attestationObject ?? body?.publicKey;

    if (!credentialId || !attestationB64Url) {
      return fail(400, "বায়োমেট্রিক ক্রেডেনশিয়াল ডেটা অসম্পূর্ণ।");
    }
    if (!body?.rawClientData) {
      return fail(400, "বায়োমেট্রিক ক্লায়েন্ট ডেটা অসম্পূর্ণ।");
    }

    // ---- verify clientDataJSON ----
    let clientData: { type?: string; challenge?: string; origin?: string };
    try {
      clientData = JSON.parse(body.rawClientData);
    } catch {
      return fail(400, "অবৈধ ক্লায়েন্ট ডেটা ফরম্যাট।");
    }
    if (clientData.type !== "webauthn.create") {
      return fail(400, "অবৈধ বায়োমেট্রিক নিবন্ধন অনুরোধ।");
    }
    const allowed = allowedOriginsFor(req);
    if (typeof clientData.origin !== "string" || !allowed.includes(clientData.origin)) {
      return fail(403, "বায়োমেট্রিক অরিজিন মিসম্যাচ সনাক্ত হয়েছে।");
    }
    const challenge = String(clientData.challenge || "");
    if (!challenge) {
      return fail(400, "বায়োমেট্রিক চ্যালেঞ্জ পাওয়া যায়নি।");
    }
    // Challenge is mandatory and must be bound to the registering user.
    const valid = await verifyAndConsumeChallenge(db, challenge, user.id);
    if (!valid) {
      return fail(400, "বায়োমেট্রিক চ্যালেঞ্জের মেয়াদ শেষ হয়েছে। আবার চেষ্টা করুন।");
    }

    // ---- parse the attestation and extract the REAL public key ----
    let authData: Uint8Array;
    try {
      authData = parseAttestationObject(fromBase64Url(attestationB64Url));
    } catch {
      return fail(400, "অবৈধ অ্যাটেস্টেশন ডেটা।");
    }

    let parsed: ReturnType<typeof parseAuthData>;
    try {
      parsed = parseAuthData(authData);
    } catch {
      return fail(400, "অবৈধ অথেনটিকেটর ডেটা।");
    }
    if (!parsed.credentialId || !parsed.cosePublicKey) {
      return fail(400, "অ্যাটেস্টেশনে পাবলিক কী পাওয়া যায়নি।");
    }
    if (toBase64Url(parsed.credentialId) !== credentialId) {
      return fail(400, "ক্রেডেনশিয়াল আইডি মিলছে না।");
    }

    let spkiB64: string;
    try {
      spkiB64 = b64Encode(coseKeyToSpki(parsed.cosePublicKey));
    } catch {
      return fail(400, "এই ডিভাইসের কী-টাইপ সমর্থিত নয় (ES256/RS256 প্রয়োজন)।");
    }

    // ---- prevent cross-user credential overwrite ----
    const existing = await db
      .prepare("SELECT user_id FROM webauthn_credentials WHERE credential_id = ?")
      .bind(credentialId)
      .first<{ user_id: number }>()
      .catch(() => null);
    if (existing && existing.user_id !== user.id) {
      return fail(403, "এই ফিঙ্গারপ্রিন্ট ইতোমধ্যে অন্য অ্যাকাউন্টে যুক্ত।");
    }

    await db
      .prepare(
        `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, datetime('now'), datetime('now'))
         ON CONFLICT(credential_id) DO UPDATE SET
           public_key = excluded.public_key,
           device_name = excluded.device_name,
           counter = 0,
           updated_at = datetime('now')`
      )
      .bind(user.id, credentialId, spkiB64, body?.deviceName || "বায়োমেট্রিক ডিভাইস")
      .run();

    return ok({ message: "ফিঙ্গারপ্রিন্ট সফলভাবে যুক্ত করা হয়েছে!" });
  } catch (e) {
    return handleError(e);
  }
}
