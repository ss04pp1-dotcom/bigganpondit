// /api/auth/webauthn/register — Register new biometric / fingerprint credential.
// Requires existing active session (Teachers / Admin / Students).

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import { generateRandomChallenge, saveChallenge, verifyAndConsumeChallenge } from "@/lib/auth/webauthn";
import { APP_TITLE, DEFAULT_ACADEMY_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

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
    const body = await req.json();

    const { credentialId, publicKey, rawClientData, deviceName } = body;

    if (!credentialId || !publicKey) {
      return fail(400, "বায়োমেট্রিক ক্রেডেনশিয়াল ডেটা অসম্পূর্ণ।");
    }

    // Verify challenge from clientDataJSON if provided
    if (rawClientData) {
      try {
        const clientData = JSON.parse(rawClientData);
        if (clientData.challenge) {
          const valid = await verifyAndConsumeChallenge(db, clientData.challenge, user.id);
          if (!valid) {
            return fail(400, "বায়োমেট্রিক চ্যালেঞ্জের মেয়াদ শেষ হয়েছে। আবার চেষ্টা করুন।");
          }
        }
      } catch {
        // Fallback if parsing fails
      }
    }

    // Save credential to database
    await db
      .prepare(
        `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, updated_at)
         VALUES (?, ?, ?, 0, ?, datetime('now'))
         ON CONFLICT(credential_id) DO UPDATE SET
           public_key = excluded.public_key,
           device_name = excluded.device_name,
           updated_at = datetime('now')`
      )
      .bind(user.id, credentialId, publicKey, deviceName || "বায়োমেট্রিক ডিভাইস")
      .run();

    return ok({ message: "ফিঙ্গারপ্রিন্ট সফলভাবে যুক্ত করা হয়েছে!" });
  } catch (e) {
    return handleError(e);
  }
}
