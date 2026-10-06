// Password hashing with PBKDF2-SHA256 via Web Crypto.
// Works identically in Bun (local dev) and Cloudflare Workers (production).
// Stored format: pbkdf2$<iterations>$<salt-b64>$<hash-b64>

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Web Crypto not available");
  return c.subtle;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const keyMaterial = await subtle().importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await subtle().deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BYTES * 8
  );
  const hash = new Uint8Array(bits);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = Number(parts[1]);
    const salt = fromB64(parts[2]);
    const expected = fromB64(parts[3]);

    const keyMaterial = await subtle().importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await subtle().deriveBits(
      {
        name: "PBKDF2",
        salt: salt as unknown as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      expected.length * 8
    );
    const actual = new Uint8Array(bits);

    // Constant-time comparison
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) {
      diff |= actual[i] ^ expected[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
