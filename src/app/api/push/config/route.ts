// /api/push/config — PUBLIC Firebase client configuration for the Android app.
//
// Serves ONLY the public client identifiers (apiKey / appId / projectId /
// senderId) so the app can initialize Firebase at runtime — no rebuild needed
// when the owner sets up the Firebase project later.
//
// These values are the same ones google-services.json ships inside every APK
// (Google documents them as safe to expose). The SERVICE-ACCOUNT key that can
// actually send notifications is NEVER here — it stays in the encrypted
// `FCM_SERVICE_ACCOUNT` Worker secret.
//
// Worker vars to set (dashboard → Workers → Settings → Variables):
//   FIREBASE_API_KEY   — Firebase console → Project settings → Web API key
//   FIREBASE_APP_ID    — android app id, e.g. "1:1234567890:android:abc..."
//   FIREBASE_PROJECT_ID— e.g. "biggan-pondit-academy"
//   FIREBASE_SENDER_ID — Project settings → Cloud Messaging → Sender ID
// When any is missing the endpoint answers enabled:false and the app simply
// skips push (everything else keeps working).
//
// `serviceAccountConfigured` reports whether the server-side FCM sender
// (FCM_SERVICE_ACCOUNT secret/variable) parses as a valid service-account
// key — a boolean only, NO values are ever exposed. The Android app ignores
// unknown fields (org.json), so this is purely additive; it exists so the
// setup can be verified from any browser:
//   GET /api/push/config → "enabled":true, "serviceAccountConfigured":true
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/push-service";
import { parseServiceAccount } from "@/lib/fcm";
import { getOrCreateVapidKeys } from "@/lib/web-push";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

export async function GET() {
  try {
    const env = await getServerEnv();
    const db = await getDb();
    const vapid = await getOrCreateVapidKeys(db).catch(() => null);

    const apiKey = str(env.FIREBASE_API_KEY);
    const appId = str(env.FIREBASE_APP_ID);
    const projectId = str(env.FIREBASE_PROJECT_ID);
    const senderId = str(env.FIREBASE_SENDER_ID);

    const configured =
      apiKey.length > 10 &&
      appId.length > 10 &&
      projectId.length > 3 &&
      senderId.length > 3;

    const fcmConfigured =
      parseServiceAccount(str(env.FCM_SERVICE_ACCOUNT)) !== null;

    return ok({
      enabled: configured || !!vapid?.publicKey,
      serviceAccountConfigured: fcmConfigured || !!vapid?.publicKey,
      webPushPublicKey: vapid?.publicKey ?? null,
      firebase: configured
        ? { apiKey, appId, projectId, senderId }
        : null,
    });
  } catch (e) {
    return handleError(e);
  }
}
