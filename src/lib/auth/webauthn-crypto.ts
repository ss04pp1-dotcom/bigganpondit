// WebAuthn cryptographic verification — CBOR / COSE parsing + real signature checks.
// Uses Web Crypto only (works identically on Cloudflare Workers and Node 18+).
//
// The server MUST verify the authenticator assertion signature:
//   ECDSA/RSA-SHA256 over (authenticatorData || SHA-256(clientDataJSON))
// against the COSE public key extracted at registration time. Without this,
// "biometric login" is just a credential-ID lookup — a total auth bypass.

import { fromBase64Url, toBase64Url } from "./webauthn";

// ---------------------------------------------------------------- CBOR
type CborValue =
  | number
  | string
  | boolean
  | null
  | undefined
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>;

class CborReader {
  private pos = 0;
  constructor(private buf: Uint8Array) {}
  private readByte(): number {
    if (this.pos >= this.buf.length) throw new Error("CBOR: out of bounds");
    return this.buf[this.pos++];
  }
  // Lengths in WebAuthn payloads are far below 2^53 — plain numbers suffice
  // (also keeps the file free of BigInt/ES2020 requirements).
  private readUint(info: number): number {
    if (info < 24) return info;
    const len = info === 24 ? 1 : info === 25 ? 2 : info === 26 ? 4 : info === 27 ? 8 : 0;
    if (!len) throw new Error("CBOR: indefinite/invalid length");
    let v = 0;
    for (let i = 0; i < len; i++) v = v * 256 + this.readByte();
    return v;
  }
  private readBytes(len: number): Uint8Array {
    const n = Number(len);
    if (!Number.isInteger(n) || n < 0 || this.pos + n > this.buf.length) {
      throw new Error("CBOR: byte string out of bounds");
    }
    const out = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  readItem(): CborValue {
    const first = this.readByte();
    const major = first >> 5;
    const info = first & 0x1f;
    switch (major) {
      case 0:
        return this.readUint(info);
      case 1:
        return -1 - this.readUint(info);
      case 2:
        return this.readBytes(Number(this.readUint(info)));
      case 3: {
        const b = this.readBytes(Number(this.readUint(info)));
        return new TextDecoder().decode(b);
      }
      case 4: {
        const len = Number(this.readUint(info));
        const arr: CborValue[] = [];
        for (let i = 0; i < len; i++) arr.push(this.readItem());
        return arr;
      }
      case 5: {
        const len = Number(this.readUint(info));
        const map = new Map<CborValue, CborValue>();
        for (let i = 0; i < len; i++) {
          const k = this.readItem();
          map.set(k, this.readItem());
        }
        return map;
      }
      case 6:
        // skip tag, return tagged value
        this.readUint(info);
        return this.readItem();
      case 7: {
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        if (info === 23) return undefined;
        throw new Error("CBOR: floats unsupported");
      }
      default:
        throw new Error("CBOR: invalid major type");
    }
  }
}

function isBytes(v: CborValue | undefined): v is Uint8Array {
  return v instanceof Uint8Array;
}

// ---------------------------------------------------------------- DER helpers
function derEncode(tag: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let lenBytes: number[];
  if (len < 0x80) lenBytes = [len];
  else if (len < 0x100) lenBytes = [0x81, len];
  else if (len < 0x10000) lenBytes = [0x82, (len >> 8) & 0xff, len & 0xff];
  else lenBytes = [0x83, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  const out = new Uint8Array(1 + lenBytes.length + len);
  out[0] = tag;
  out.set(lenBytes, 1);
  out.set(content, 1 + lenBytes.length);
  return out;
}

function derOid(arcs: number[]): Uint8Array {
  const bytes: number[] = [];
  // first two arcs packed as 40*a+b
  bytes.push(40 * arcs[0] + arcs[1]);
  for (let i = 2; i < arcs.length; i++) {
    let v = arcs[i];
    const stack: number[] = [v & 0x7f];
    v = Math.floor(v / 128);
    while (v > 0) {
      stack.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    stack.reverse();
    // set continuation bit on all but last
    for (let j = 0; j < stack.length - 1; j++) stack[j] |= 0x80;
    bytes.push(...stack);
  }
  return derEncode(0x06, new Uint8Array(bytes));
}

const OID_EC_PUBLIC_KEY = [1, 2, 840, 10045, 2, 1];
const OID_PRIME256V1 = [1, 2, 840, 10045, 3, 1, 7];
const OID_RSA_ENCRYPTION = [1, 2, 840, 113549, 1, 1, 1];

function derSequence(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    buf.set(p, off);
    off += p.length;
  }
  return derEncode(0x30, buf);
}

function derBitString(data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + data.length);
  buf[0] = 0; // zero unused bits
  buf.set(data, 1);
  return derEncode(0x03, buf);
}

function derUint(bytes: Uint8Array): Uint8Array {
  // INTEGER must be positive: prepend 0x00 if high bit set
  if (bytes.length > 0 && bytes[0] & 0x80) {
    const buf = new Uint8Array(1 + bytes.length);
    buf[0] = 0;
    buf.set(bytes, 1);
    return derEncode(0x02, buf);
  }
  if (bytes.length === 0) return derEncode(0x02, new Uint8Array([0]));
  return derEncode(0x02, bytes);
}

// ---------------------------------------------------------------- base64 (tolerant: accepts standard & url-safe)
export function b64Decode(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ---------------------------------------------------------------- attestation / authData
export interface ParsedAuthData {
  rpIdHash: Uint8Array;
  flags: number;
  counter: number;
  credentialId: Uint8Array | null;
  cosePublicKey: Uint8Array | null;
}

export function parseAttestationObject(attObj: Uint8Array): Uint8Array {
  const root = new CborReader(attObj).readItem();
  if (!(root instanceof Map)) throw new Error("attestationObject: not a CBOR map");
  const authData = root.get("authData");
  if (!isBytes(authData)) throw new Error("attestationObject: missing authData");
  return authData;
}

export function parseAuthData(authData: Uint8Array): ParsedAuthData {
  if (authData.length < 37) throw new Error("authData: too short");
  const dv = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  const rpIdHash = authData.slice(0, 32);
  const flags = authData[32];
  const counter = dv.getUint32(33);
  const out: ParsedAuthData = { rpIdHash, flags, counter, credentialId: null, cosePublicKey: null };
  // AT flag (0x40): attested credential data present
  if (flags & 0x40) {
    if (authData.length < 55) throw new Error("authData: attested credential data truncated");
    const credIdLen = dv.getUint16(53);
    if (authData.length < 55 + credIdLen) throw new Error("authData: credential id truncated");
    out.credentialId = authData.slice(55, 55 + credIdLen);
    out.cosePublicKey = authData.slice(55 + credIdLen);
  }
  return out;
}

// ---------------------------------------------------------------- COSE key -> SPKI
export function coseKeyToSpki(cose: Uint8Array): Uint8Array {
  const root = new CborReader(cose).readItem();
  if (!(root instanceof Map)) throw new Error("COSE key: not a CBOR map");
  const kty = Number(root.get(1));
  const alg = Number(root.get(3));

  if (kty === 2 && alg === -7) {
    // EC2 / P-256 (ES256)
    const crv = Number(root.get(-1));
    const x = root.get(-2);
    const y = root.get(-3);
    if (crv !== 1 || !isBytes(x) || !isBytes(y)) throw new Error("COSE: invalid EC2 key");
    if (x.length !== 32 || y.length !== 32) throw new Error("COSE: EC2 coordinate must be 32 bytes");
    const point = new Uint8Array(65);
    point[0] = 0x04; // uncompressed
    point.set(x, 1);
    point.set(y, 33);
    return derSequence(
      derSequence(derOid(OID_EC_PUBLIC_KEY), derOid(OID_PRIME256V1)),
      derBitString(point)
    );
  }

  if (kty === 3 && alg === -257) {
    // RSA (RS256)
    const n = root.get(-1);
    const e = root.get(-2);
    if (!isBytes(n) || !isBytes(e)) throw new Error("COSE: invalid RSA key");
    return derSequence(
      derSequence(derOid(OID_RSA_ENCRYPTION), derEncode(0x05, new Uint8Array(0))),
      derBitString(derSequence(derUint(n), derUint(e)))
    );
  }

  throw new Error(`COSE: unsupported kty/alg (${kty}/${alg})`);
}

// ---------------------------------------------------------------- assertion verification
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const d = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return new Uint8Array(d);
}

export async function rpIdHash(rpId: string): Promise<Uint8Array> {
  return sha256(new TextEncoder().encode(rpId));
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  return bytesEqual(a, b);
}

/**
 * Verify a WebAuthn assertion signature against the stored SPKI public key.
 * signedData = authenticatorData || SHA-256(clientDataJSON)
 */
export async function verifyAssertionSignature(params: {
  spkiPublicKeyB64: string;
  authenticatorData: Uint8Array;
  clientDataJSON: string;
  signature: Uint8Array;
}): Promise<boolean> {
  const spki = b64Decode(params.spkiPublicKeyB64);

  // Detect algorithm from the SPKI OIDs.
  const asHex = Array.from(spki, (b) => b.toString(16).padStart(2, "0")).join("");
  const ecOid = Array.from(derOid(OID_PRIME256V1), (b) => b.toString(16).padStart(2, "0")).join("");
  const rsaOid = Array.from(derOid(OID_RSA_ENCRYPTION), (b) => b.toString(16).padStart(2, "0")).join("");

  const clientDataHash = await sha256(new TextEncoder().encode(params.clientDataJSON));
  const signed = new Uint8Array(params.authenticatorData.length + clientDataHash.length);
  signed.set(params.authenticatorData, 0);
  signed.set(clientDataHash, params.authenticatorData.length);

  let alg: AlgorithmIdentifier;
  let verifyAlg: AlgorithmIdentifier;
  if (asHex.includes(ecOid)) {
    alg = { name: "ECDSA", namedCurve: "P-256" } as unknown as AlgorithmIdentifier;
    verifyAlg = { name: "ECDSA", hash: "SHA-256" } as unknown as AlgorithmIdentifier;
  } else if (asHex.includes(rsaOid)) {
    alg = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as unknown as AlgorithmIdentifier;
    verifyAlg = alg;
  } else {
    throw new Error("Stored public key is not a supported SPKI key");
  }

  const key = await crypto.subtle.importKey("spki", spki as unknown as BufferSource, alg, false, ["verify"]);
  return await crypto.subtle.verify(
    verifyAlg,
    key,
    params.signature as unknown as BufferSource,
    signed as unknown as BufferSource
  );
}

export { toBase64Url, fromBase64Url };
