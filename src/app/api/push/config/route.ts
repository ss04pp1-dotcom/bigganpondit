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
import { getServerEnv } from "@/lib/push-service";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

export async function GET() {
  try {
    const env = await getServerEnv();
    const apiKey = str(env.FIREBASE_API_KEY);
    const appId = str(env.FIREBASE_APP_ID);
    const projectId = str(env.FIREBASE_PROJECT_ID);
    const senderId = str(env.FIREBASE_SENDER_ID);

    const configured =
      apiKey.length > 10 &&
      appId.length > 10 &&
      projectId.length > 3 &&
      senderId.length > 3;

    return ok({
      enabled: configured,
      firebase: configured
        ? { apiKey, appId, projectId, senderId }
        : null,
    });
  } catch (e) {
    return handleError(e);
  }
}
