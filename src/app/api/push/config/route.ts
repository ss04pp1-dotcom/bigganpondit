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
import { requireApiUser } from "@/lib/auth/guards";
import {
  getEffectiveFcmServiceAccount,
  getEffectiveFirebaseClientConfig,
  SETTING_FCM_SERVICE_ACCOUNT,
  SETTING_FIREBASE_CLIENT_CONFIG,
} from "@/lib/push-service";
import { clearFcmTokenCache, parseServiceAccount } from "@/lib/fcm";
import { getOrCreateVapidKeys } from "@/lib/web-push";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const [vapid, effSa, cfg] = await Promise.all([
      getOrCreateVapidKeys(db).catch(() => null),
      getEffectiveFcmServiceAccount(db),
      getEffectiveFirebaseClientConfig(db),
    ]);

    const configured =
      cfg.apiKey.length > 10 &&
      (cfg.appId.length > 10 || cfg.webAppId.length > 10) &&
      cfg.projectId.length > 2 &&
      cfg.senderId.length > 3;

    const fcmConfigured = effSa.parsed !== null;

    return ok({
      enabled: configured || !!vapid?.publicKey,
      serviceAccountConfigured: fcmConfigured || !!vapid?.publicKey,
      fcmServiceAccountConfigured: fcmConfigured,
      fcmSource: effSa.source,
      fcmProjectId: effSa.parsed?.project_id ?? (cfg.projectId || null),
      fcmClientEmail: effSa.parsed?.client_email ?? null,
      webPushPublicKey: vapid?.publicKey ?? null,
      firebase: configured
        ? {
            apiKey: cfg.apiKey,
            appId: cfg.appId || cfg.webAppId,
            webAppId: cfg.webAppId,
            projectId: cfg.projectId,
            senderId: cfg.senderId,
            vapidKey: cfg.vapidKey || null,
          }
        : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = (await req.json().catch(() => ({}))) as {
      serviceAccountJson?: string | null;
      apiKey?: string;
      appId?: string;
      webAppId?: string;
      projectId?: string;
      senderId?: string;
      vapidKey?: string;
    };

    // 1. Validate & save FCM Service Account JSON if provided
    if (typeof body.serviceAccountJson === "string" && body.serviceAccountJson.trim().length > 0) {
      const raw = body.serviceAccountJson.trim();
      const parsed = parseServiceAccount(raw);
      if (!parsed) {
        throw new ApiError(
          400,
          "সার্ভিস অ্যাকাউন্ট JSON সঠিক নয়। এতে project_id, client_email এবং private_key থাকতে হবে।"
        );
      }

      await db
        .prepare(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        )
        .bind(SETTING_FCM_SERVICE_ACCOUNT, raw)
        .run();

      clearFcmTokenCache();
    }

    // 2. Save Firebase client config overrides if provided
    const currentCfg = await getEffectiveFirebaseClientConfig(db);
    const nextCfg = {
      apiKey: typeof body.apiKey === "string" ? body.apiKey.trim() : currentCfg.apiKey,
      appId: typeof body.appId === "string" ? body.appId.trim() : currentCfg.appId,
      webAppId: typeof body.webAppId === "string" ? body.webAppId.trim() : currentCfg.webAppId,
      projectId: typeof body.projectId === "string" ? body.projectId.trim() : currentCfg.projectId,
      senderId: typeof body.senderId === "string" ? body.senderId.trim() : currentCfg.senderId,
      vapidKey: typeof body.vapidKey === "string" ? body.vapidKey.trim() : currentCfg.vapidKey,
    };

    await db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(SETTING_FIREBASE_CLIENT_CONFIG, JSON.stringify(nextCfg))
      .run();

    const effSa = await getEffectiveFcmServiceAccount(db);

    return ok({
      message: "Firebase (FCM) কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।",
      fcmServiceAccountConfigured: effSa.parsed !== null,
      fcmSource: effSa.source,
      fcmProjectId: effSa.parsed?.project_id ?? nextCfg.projectId,
      fcmClientEmail: effSa.parsed?.client_email ?? null,
      firebase: nextCfg,
    });
  } catch (e) {
    return handleError(e);
  }
}
