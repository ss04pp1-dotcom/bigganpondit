// Unit tests for the security & logic fixes (run with: bun scripts/verify-fixes.test.ts)
/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

// ---- module under test: webauthn crypto ----
import {
  parseAttestationObject,
  parseAuthData,
  coseKeyToSpki,
  verifyAssertionSignature,
  b64Encode,
  b64Decode,
} from "../src/lib/auth/webauthn-crypto";
import { buildMonthlyResult, aggregate } from "../src/lib/results/engine";

// ---------------------------------------------------------------- helpers
function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function b64ToB64Url(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// minimal CBOR encoder for building test fixtures
function cborUint(n: number): number[] {
  if (n < 24) return [n];
  if (n < 0x100) return [0x18, n];
  return [0x19, (n >> 8) & 0xff, n & 0xff];
}
// negative int: major type 1 (−1 → 0x20, −2 → 0x21, …)
function cborNeg(n: number): number[] {
  const k = -n - 1;
  if (k < 24) return [0x20 | k];
  if (k < 0x100) return [0x38, k];
  return [0x39, (k >> 8) & 0xff, k & 0xff];
}
function cborBytes(b: number[]): number[] {
  // major type 2 (byte string)
  if (b.length < 24) return [0x40 | b.length, ...b];
  if (b.length < 0x100) return [0x58, b.length, ...b];
  return [0x59, (b.length >> 8) & 0xff, b.length & 0xff, ...b];
}
function cborTstr(s: string): number[] {
  // major type 3 (text string)
  const enc = Array.from(new TextEncoder().encode(s));
  if (enc.length < 24) return [0x60 | enc.length, ...enc];
  if (enc.length < 0x100) return [0x78, enc.length, ...enc];
  return [0x79, (enc.length >> 8) & 0xff, enc.length & 0xff, ...enc];
}
function cborMap(entries: Array<[number[], number[]]>): number[] {
  // major type 5 (map)
  if (entries.length < 24) return [0xA0 | entries.length, ...(entries.flat(2) as unknown as number[])];
  return [0xB8, entries.length, ...(entries.flat(2) as unknown as number[])];
}

describe("webauthn-crypto: CBOR / COSE parsing", () => {
  test("parses attestationObject and extracts authData", () => {
    const rpIdHash = new Uint8Array(32).fill(0xab);
    const flags = 0x41; // UP | AT
    const counter = [0x00, 0x00, 0x00, 0x07];
    const aaguid = new Uint8Array(16).fill(0x01);
    const credId = [0x11, 0x22, 0x33, 0x44];
    // COSE EC2 P-256 ES256 key
    const x = new Uint8Array(32).fill(0x05);
    const y = new Uint8Array(32).fill(0x06);
    const cose = cborMap([
      [cborUint(1), cborUint(2)],   // kty: EC2
      [cborUint(3), [0x26]],        // alg: -7 (ES256)
      [cborNeg(-1), cborUint(1)],   // crv: P-256
      [cborNeg(-2), cborBytes(Array.from(x))],  // x
      [cborNeg(-3), cborBytes(Array.from(y))],  // y
    ]);
    const authData = concat(rpIdHash, new Uint8Array([flags]), new Uint8Array(counter), aaguid, new Uint8Array([0x00, credId.length]), new Uint8Array(credId), new Uint8Array(cose));

    const attObj = new Uint8Array([
      ...cborMap([
        [cborTstr("fmt"), cborTstr("none")],
        [cborTstr("attStmt"), cborMap([])],
        [cborTstr("authData"), cborBytes(Array.from(authData))],
      ]),
    ]);

    const parsedAuth = parseAttestationObject(attObj);
    const parsed = parseAuthData(parsedAuth);
    expect(Array.from(parsed.rpIdHash)).toEqual(Array.from(rpIdHash));
    expect(parsed.flags).toBe(0x41);
    expect(parsed.counter).toBe(7);
    expect(Array.from(parsed.credentialId!)).toEqual(credId);
    expect(parsed.cosePublicKey).toBeDefined();
  });

  test("COSE EC2 -> SPKI matches Web Crypto's own SPKI export (real curve point)", async () => {
    // use a REAL P-256 key so the coordinates are valid curve points
    const kp = (await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" } as unknown as Algorithm,
      true,
      ["sign", "verify"]
    )) as unknown as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
    const x = b64Decode(jwk.x as string);
    const y = b64Decode(jwk.y as string);
    const cose = new Uint8Array(cborMap([
      [cborUint(1), cborUint(2)],
      [cborUint(3), [0x26]],
      [cborNeg(-1), cborUint(1)],
      [cborNeg(-2), cborBytes(Array.from(x))],
      [cborNeg(-3), cborBytes(Array.from(y))],
    ]));
    const spki = coseKeyToSpki(cose);
    // our DER must byte-match Web Crypto's own SPKI export
    const expected = new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey));
    expect(Array.from(spki)).toEqual(Array.from(expected));
    const key = await crypto.subtle.importKey("spki", spki as unknown as BufferSource, { name: "ECDSA", namedCurve: "P-256" } as unknown as Algorithm, false, ["verify"]);
    expect(key.type).toBe("public");
    expect(key.algorithm.name).toBe("ECDSA");
  });
});

describe("webauthn-crypto: REAL signature verification round-trip", () => {
  test("ECDSA-P256: correct signature verifies, tampered data fails", async () => {
    // 1) generate a real key pair (as a real authenticator would)
    const kp = (await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" } as unknown as Algorithm,
      true,
      ["sign", "verify"]
    )) as unknown as CryptoKeyPair;
    const spkiRaw = await crypto.subtle.exportKey("spki", kp.publicKey);
    const spkiB64 = b64Encode(new Uint8Array(spkiRaw));

    // 2) build authenticatorData (rpIdHash + flags + counter)
    const rpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("example.com")));
    const authData = concat(rpIdHash, new Uint8Array([0x01]), new Uint8Array([0, 0, 0, 42]));

    // 3) clientDataJSON + signature over (authData || sha256(clientDataJSON))
    const clientDataJSON = JSON.stringify({ type: "webauthn.get", challenge: "abc123", origin: "https://example.com" });
    const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientDataJSON)));
    const signed = concat(authData, clientHash);
    const sig = new Uint8Array(
      await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" } as unknown as Algorithm, kp.privateKey, signed as unknown as BufferSource)
    );

    // 4) verify — must be true
    const ok = await verifyAssertionSignature({
      spkiPublicKeyB64: spkiB64,
      authenticatorData: authData,
      clientDataJSON,
      signature: sig,
    });
    expect(ok).toBe(true);

    // 5) tampered clientDataJSON must FAIL (this is exactly what the old
    //    no-verification login allowed!)
    const tampered = JSON.stringify({ type: "webauthn.get", challenge: "abc123", origin: "https://evil.com" });
    const bad = await verifyAssertionSignature({
      spkiPublicKeyB64: spkiB64,
      authenticatorData: authData,
      clientDataJSON: tampered,
      signature: sig,
    });
    expect(bad).toBe(false);
  });

  test("b64Decode tolerates standard and url-safe base64", () => {
    const bytes = new Uint8Array([1, 2, 250, 251, 252, 3]);
    const std = b64Encode(bytes);
    const url = b64ToB64Url(std);
    expect(Array.from(b64Decode(std))).toEqual(Array.from(bytes));
    expect(Array.from(b64Decode(url))).toEqual(Array.from(bytes));
  });
});

describe("engine: 4th subject handling (deterministic, best bonus)", () => {
  const mk = (name: string, isFourth: boolean, obtained: number, total: number) => ({
    name,
    isFourth,
    exams: [{ total, obtained }],
  });

  test("TWO fourth subjects: highest-GPA one gives the bonus, result is deterministic", () => {
    // student took both কৃষিশিক্ষা (90/100 => A+ 5.0) and উচ্চতর গণিত (40/100 => C 2.0)
    // compulsory: বাংলা 80/100 (A+ 5.0)
    const bySubject = new Map<number, { name: string; isFourth: boolean; exams: { total: number; obtained: number }[] }>([
      [1, mk("বাংলা", false, 80, 100)],
      [2, mk("কৃষিশিক্ষা", true, 90, 100)],
      [3, mk("উচ্চতর গণিত", true, 40, 100)],
    ]);
    const res = buildMonthlyResult(bySubject, new Map());
    // bonus = max(5.0, 2.0) - 2 = 3.0 → totalGp = 5.0 + 3.0 = 8.0, divisor 1 → 5.0
    // (the old code picked by alphabetical order and could have used 2.0 → no bonus)
    expect(res.overall.gpa).toBe(5.0);
    expect(res.overall.grade).toBe("A+");
    // percentage still includes ALL marks (incl. both 4th subjects)
    expect(res.overall.totalMarks).toBe(300);
    expect(res.overall.obtained).toBe(210);
    expect(res.overall.percentage).toBeCloseTo(70, 1);
  });

  test("bonus only applied when 4th subject GPA > 2.0", () => {
    const bySubject = new Map([
      [1, mk("বাংলা", false, 80, 100)],
      [2, mk("উচ্চতর গণিত", true, 30, 100)], // F = 0.0 → no bonus
    ]);
    const res = buildMonthlyResult(bySubject, new Map());
    expect(res.overall.gpa).toBe(5.0); // only compulsory 5.0
  });

  test("compulsory fail zeroes the GPA", () => {
    const bySubject = new Map([
      [1, mk("বাংলা", false, 30, 100)], // F
      [2, mk("কৃষিশিক্ষা", true, 90, 100)],
    ]);
    const res = buildMonthlyResult(bySubject, new Map());
    expect(res.overall.gpa).toBe(0);
    expect(res.overall.grade).toBe("F");
  });

  test("same input → same output (determinism across 50 runs)", () => {
    const bySubject = new Map([
      [1, mk("বাংলা", false, 65, 100)],
      [2, mk("কৃষিশিক্ষা", true, 82, 100)],
      [3, mk("উচ্চতর গণিত", true, 81, 100)],
    ]);
    const first = JSON.stringify(buildMonthlyResult(bySubject, new Map()).overall);
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(buildMonthlyResult(bySubject, new Map()).overall)).toBe(first);
    }
  });

  test("aggregate: SUM(obtained)/SUM(total), never average of percentages", () => {
    const agg = aggregate([
      { total: 100, obtained: 90 },
      { total: 20, obtained: 20 },
    ]);
    expect(agg.totalMarks).toBe(120);
    expect(agg.obtained).toBe(110);
    expect(agg.percentage).toBeCloseTo(91.666, 2);
  });
});
