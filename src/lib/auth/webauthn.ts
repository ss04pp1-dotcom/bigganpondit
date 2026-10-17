// WebAuthn / Passkeys / Fingerprint helper functions
// Designed to run seamlessly in Cloudflare Workers and Node.js without external binary deps.

import type { D1Database } from "@/lib/db/types";

export function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateRandomChallenge(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function saveChallenge(
  db: D1Database,
  challenge: string,
  userId: number | null = null,
  ttlSeconds = 300
): Promise<string> {
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await db
    .prepare("INSERT INTO webauthn_challenges (id, challenge, user_id, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, challenge, userId, expires)
    .run();
  return id;
}

export async function verifyAndConsumeChallenge(
  db: D1Database,
  challenge: string,
  userId?: number | null
): Promise<boolean> {
  const now = new Date().toISOString();
  const clauses = ["challenge = ?", "expires_at > ?"];
  const params: unknown[] = [challenge, now];

  if (userId !== undefined && userId !== null) {
    clauses.push("user_id = ?");
    params.push(userId);
  }

  const record = await db
    .prepare(`SELECT id FROM webauthn_challenges WHERE ${clauses.join(" AND ")} LIMIT 1`)
    .bind(...params)
    .first<{ id: string }>()
    .catch(() => null);

  if (!record) return false;

  // Consume challenge (single-use anti-replay)
  await db.prepare("DELETE FROM webauthn_challenges WHERE id = ?").bind(record.id).run();
  return true;
}
