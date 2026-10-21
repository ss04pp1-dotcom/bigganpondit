// src/lib/web-push.ts — Zero-dependency W3C Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID)
// using pure WebCrypto (crypto.subtle) for Cloudflare Workers & Next.js.
//
// Auto-generates and persists VAPID P-256 keys in D1 (`settings` table) on first use
// so push notifications work out-of-the-box on installed PWAs (Android, iOS 16.4+, Desktop)
// without requiring external Firebase service-account setup.

import type { D1Database } from "@/lib/db/types";
import type { FcmBatchResult, FcmMessagePayload, FcmSendResult } from "@/lib/fcm";

export const SETTING_VAPID_KEYS = "vapid_keys_v1";

export interface VapidKeyData {
  publicKey: string; // base64url raw 65-byte uncompressed P-256 key
  privateJwk: JsonWebKey;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let cachedVapidKeys: VapidKeyData | null = null;

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Loads VAPID keys from D1 `settings` table, or generates & saves a fresh P-256
 * keypair if none exists yet.
 */
export async function getOrCreateVapidKeys(db: D1Database): Promise<VapidKeyData> {
  if (cachedVapidKeys) return cachedVapidKeys;

  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(SETTING_VAPID_KEYS)
    .first<{ value: string }>()
    .catch(() => null);

  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as VapidKeyData;
      if (parsed.publicKey && parsed.privateJwk) {
        cachedVapidKeys = parsed;
        return parsed;
      }
    } catch {
      // regenerate below
    }
  }

  const keyPair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;

  const data: VapidKeyData = {
    publicKey: b64urlEncode(rawPub),
    privateJwk,
  };

  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .bind(SETTING_VAPID_KEYS, JSON.stringify(data))
    .run()
    .catch(() => null);

  cachedVapidKeys = data;
  return data;
}

/** Checks if a stored token string is a serialized WebPushSubscription JSON. */
export function parseWebPushToken(token: string): WebPushSubscription | null {
  if (!token || !token.trim().startsWith("{")) return null;
  try {
    const j = JSON.parse(token) as Partial<WebPushSubscription>;
    if (
      typeof j.endpoint === "string" &&
      j.endpoint.startsWith("https://") &&
      j.keys &&
      typeof j.keys.p256dh === "string" &&
      typeof j.keys.auth === "string"
    ) {
      return j as WebPushSubscription;
    }
    return null;
  } catch {
    return null;
  }
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  lengthBytes: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as BufferSource,
      info: info as BufferSource,
    },
    key,
    lengthBytes * 8
  );
  return new Uint8Array(bits);
}

/** Encrypts plaintext UTF-8 string using RFC 8291 `aes128gcm` content encoding. */
async function encryptAes128Gcm(
  plaintext: string,
  uaPublicB64: string,
  authSecretB64: string
): Promise<Uint8Array> {
  const uaPublicBytes = b64urlDecode(uaPublicB64);
  const authSecretBytes = b64urlDecode(authSecretB64);

  const uaPublicKey = await crypto.subtle.importKey(
    "raw",
    uaPublicBytes as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const asKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )) as CryptoKeyPair;

  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaPublicKey },
      asKeyPair.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  // RFC 8291 Section 3.3: IKM derivation
  const keyInfo = concatBytes(enc.encode("WebPush: info\0"), uaPublicBytes, asPublicBytes);
  const ikm = await hkdf(authSecretBytes, ecdhSecret, keyInfo, 32);

  // RFC 8291 Section 3.4: CEK & NONCE derivation
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad plaintext with 0x02 delimiter byte
  const plainBytes = enc.encode(plaintext);
  const padded = new Uint8Array(plainBytes.length + 1);
  padded.set(plainBytes, 0);
  padded[plainBytes.length] = 2;

  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, [
    "encrypt",
  ]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as BufferSource, tagLength: 128 },
      aesKey,
      padded as BufferSource
    )
  );

  // 86-byte aes128gcm header: salt (16) + rs (4, big-endian 4096) + idlen (1, 65) + keyid (65)
  const header = new Uint8Array(21 + asPublicBytes.length);
  header.set(salt, 0);
  header[16] = 0x00;
  header[17] = 0x00;
  header[18] = 0x10;
  header[19] = 0x00;
  header[20] = asPublicBytes.length;
  header.set(asPublicBytes, 21);

  return concatBytes(header, ciphertext);
}

/** Creates RFC 8292 VAPID ES256 Authorization header value. */
async function createVapidAuthHeader(
  endpoint: string,
  vapid: VapidKeyData
): Promise<string> {
  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();

  const headerB64 = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claimsB64 = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: origin,
        exp: now + 12 * 3600,
        sub: "mailto:admin@bigganpondit.com",
      })
    )
  );
  const unsigned = `${headerB64}.${claimsB64}`;

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    vapid.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      enc.encode(unsigned)
    )
  );

  const jwt = `${unsigned}.${b64urlEncode(sig)}`;
  return `vapid t=${jwt}, k=${vapid.publicKey}`;
}

/** Maps abstract deepLink values to actual PWA URLs. */
export function resolveDeepLinkUrl(deepLink?: string | null): string {
  switch (deepLink) {
    case "notices":
      return "/notices";
    case "routine":
      return "/routines";
    case "results":
      return "/results";
    case "profile":
      return "/profile";
    case "home":
      return "/dashboard";
    default:
      if (deepLink && deepLink.startsWith("/")) return deepLink;
      return "/dashboard";
  }
}

async function sendOneWebPush(
  vapid: VapidKeyData,
  rawToken: string,
  sub: WebPushSubscription,
  payload: FcmMessagePayload
): Promise<{ token: string } & FcmSendResult> {
  try {
    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: resolveDeepLinkUrl(payload.deepLink),
      image: payload.imageUrl || undefined,
      tag: payload.notificationId ? `bp-push-${payload.notificationId}` : `bp-push-${Date.now()}`,
      notificationId: payload.notificationId,
      data: payload.data || {},
    });

    const bodyBytes = await encryptAes128Gcm(jsonPayload, sub.keys.p256dh, sub.keys.auth);
    const authHeader = await createVapidAuthHeader(sub.endpoint, vapid);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: bodyBytes as BodyInit,
    });

    if (res.status >= 200 && res.status < 300) {
      return {
        token: rawToken,
        ok: true,
        messageId: res.headers.get("location") || `webpush-${Date.now()}`,
      };
    }

    const errText = await res.text().catch(() => "");
    // 404 or 410 Gone means the browser unsubscribed or expired the push endpoint
    const invalidToken = res.status === 404 || res.status === 410;
    return {
      token: rawToken,
      ok: false,
      error: `WebPush HTTP ${res.status}: ${errText.slice(0, 140)}`,
      invalidToken,
    };
  } catch (e) {
    return {
      token: rawToken,
      ok: false,
      error: e instanceof Error ? e.message : "webpush error",
    };
  }
}

/**
 * Sends Web Push notifications to all PWA subscriptions in `tokens`.
 */
export async function sendWebPushToMany(
  db: D1Database,
  tokens: string[],
  payload: FcmMessagePayload,
  options?: { concurrency?: number }
): Promise<FcmBatchResult> {
  if (tokens.length === 0) {
    return { configured: true, sent: 0, failed: 0, invalidTokens: [], results: [] };
  }

  const vapid = await getOrCreateVapidKeys(db);
  const concurrency = Math.min(options?.concurrency ?? 20, 25);
  const results: ({ token: string } & FcmSendResult)[] = [];

  for (let i = 0; i < tokens.length; i += concurrency) {
    const slice = tokens.slice(i, i + concurrency);
    const batch = await Promise.all(
      slice.map((raw) => {
        const sub = parseWebPushToken(raw);
        if (!sub) {
          return Promise.resolve({
            token: raw,
            ok: false,
            error: "Invalid WebPush subscription format",
            invalidToken: true,
          });
        }
        return sendOneWebPush(vapid, raw, sub, payload);
      })
    );
    results.push(...batch);
  }

  return {
    configured: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    invalidTokens: results.filter((r) => r.invalidToken).map((r) => r.token),
    results,
  };
}
