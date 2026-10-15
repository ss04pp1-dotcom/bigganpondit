// src/lib/fcm.ts — Firebase Cloud Messaging (HTTP v1) client for Workers.
//
// The Cloudflare Worker runtime cannot run the Node firebase-admin SDK, so
// this implements the HTTP v1 API directly:
//   1. Service-account credentials come from the server secret
//      `FCM_SERVICE_ACCOUNT` (full JSON key) — NEVER shipped to the client.
//   2. A short-lived OAuth2 access token is minted by signing a RS256 JWT
//      with WebCrypto and exchanging it at https://oauth2.googleapis.com/token.
//   3. Tokens are cached in module scope until 5 minutes before expiry.
//
// If FCM is not configured yet (no service account secret), every send is
// skipped with a clear reason instead of failing — the queue marks the
// notification as FAILED with a descriptive message so the admin can see
// the exact missing setup step.

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string; // PEM string with \n escapes as in the downloaded JSON
}

export interface FcmSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** true when the error means the token will never work again */
  invalidToken?: boolean;
}

export interface FcmBatchResult {
  configured: boolean;
  notConfiguredReason?: string;
  sent: number;
  failed: number;
  invalidTokens: string[];
  results: ({ token: string } & FcmSendResult)[];
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_ENDPOINT = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

/** Module-scope access-token cache (survives across requests in an isolate). */
let cachedToken: { token: string; expiresAt: number } | null = null;

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, "")
    .trim();
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Parses the FCM_SERVICE_ACCOUNT secret. Accepts the raw JSON key file. */
export function parseServiceAccount(raw: string | undefined | null): FcmServiceAccount | null {
  if (!raw || !raw.trim()) return null;
  try {
    const j = JSON.parse(raw) as Partial<FcmServiceAccount>;
    if (j.project_id && j.client_email && j.private_key) {
      return {
        project_id: j.project_id,
        client_email: j.client_email,
        private_key: j.private_key,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Mint (or reuse) a Google OAuth2 access token for the FCM scope. */
async function getAccessToken(sa: FcmServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 300 > now) {
    return cachedToken.token;
  }

  const header = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const claims = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const unsigned = `${header}.${claims}`;

  const keyData = pemToPkcs8(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${b64urlEncode(new Uint8Array(sig))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FCM OAuth token exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };
  return data.access_token;
}

export interface FcmMessagePayload {
  title: string;
  body: string;
  deepLink?: string | null;
  imageUrl?: string | null;
  /** arbitrary data map delivered to the app */
  data?: Record<string, string>;
  notificationId?: number;
}

function buildMessage(payload: FcmMessagePayload, token: string) {
  const data: Record<string, string> = { ...(payload.data || {}) };
  if (payload.deepLink) data.route = payload.deepLink;
  if (payload.notificationId != null) data.notificationId = String(payload.notificationId);

  // androidChannelId maps to the channel created by the Flutter app so
  // system notifications get the right importance/sound.
  return {
    message: {
      token,
      data,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      },
      android: {
        priority: "HIGH" as const,
        notification: {
          channel_id: "push",
          // Must match a drawable resource inside the Android app
          // (system tray only displays notification payloads when the app
          // is backgrounded/closed, using this icon name).
          icon: "ic_stat_notification",
          ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
        },
      },
    },
  };
}

// Error reasons that mean THIS token will never work again → deactivate it.
// Note: QUOTA_EXCEEDED is deliberately NOT here — it is a project-level
// rate limit, not a token problem; the queue retries it instead of
// throwing away a healthy device registration.
const INVALID_TOKEN_CODES = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "INVALID_REGISTRATION_TOKEN",
  "SENDER_ID_MISMATCH",
  "UNSPECIFIED",
]);

/** Sends one message; classifies token-invalidating errors. */
async function sendOne(
  accessToken: string,
  projectId: string,
  token: string,
  payload: FcmMessagePayload
): Promise<FcmSendResult> {
  try {
    const res = await fetch(FCM_ENDPOINT(projectId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildMessage(payload, token)),
    });
    if (res.ok) {
      const j = (await res.json().catch(() => ({}))) as { name?: string };
      return { ok: true, messageId: j.name };
    }
    const errText = await res.text().catch(() => "");
    let code = "";
    try {
      code = ((JSON.parse(errText) as any)?.error?.details?.[0]?.reason as string) || "";
      if (!code) code = ((JSON.parse(errText) as any)?.error?.status as string) || "";
    } catch {
      /* not json */
    }
    const invalid =
      res.status === 404 ||
      INVALID_TOKEN_CODES.has(code) ||
      /not found|unregistered|invalid/i.test(errText.slice(0, 200));
    return { ok: false, error: code || `HTTP ${res.status}: ${errText.slice(0, 160)}`, invalidToken: invalid };
  } catch (e) {
    // Network / transient error — NOT an invalid token, safe to retry.
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

/**
 * Sends to many tokens with bounded parallelism (FCM HTTP v1 has no
 * multicast endpoint — the Admin SDK fans out per-token the same way).
 */
export async function sendToMany(
  serviceAccountRaw: string | undefined | null,
  tokens: string[],
  payload: FcmMessagePayload,
  options?: { concurrency?: number }
): Promise<FcmBatchResult> {
  const sa = parseServiceAccount(serviceAccountRaw);
  if (!sa) {
    return {
      configured: false,
      notConfiguredReason:
        "FCM_SERVICE_ACCOUNT সিক্রেট সেট করা হয়নি — Firebase service-account JSON key কে `bunx wrangler secret put FCM_SERVICE_ACCOUNT` দিয়ে যোগ করুন।",
      sent: 0,
      failed: 0,
      invalidTokens: [],
      results: [],
    };
  }
  if (tokens.length === 0) {
    return { configured: true, sent: 0, failed: 0, invalidTokens: [], results: [] };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token exchange failed";
    return {
      configured: true,
      sent: 0,
      failed: tokens.length,
      invalidTokens: [],
      results: tokens.map((t) => ({ token: t, ok: false, error: msg })),
    };
  }

  const concurrency = Math.min(options?.concurrency ?? 20, 25);
  const results: ({ token: string } & FcmSendResult)[] = [];
  for (let i = 0; i < tokens.length; i += concurrency) {
    const slice = tokens.slice(i, i + concurrency);
    const batch = await Promise.all(
      slice.map((t) => sendOne(accessToken, sa.project_id, t, payload))
    );
    batch.forEach((r, idx) => results.push({ token: slice[idx], ...r }));
  }

  return {
    configured: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    invalidTokens: results.filter((r) => r.invalidToken).map((r) => r.token),
    results,
  };
}
