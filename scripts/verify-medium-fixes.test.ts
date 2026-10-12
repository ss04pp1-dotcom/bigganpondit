// Unit tests for the MEDIUM-severity fixes (run: bun scripts/verify-medium-fixes.test.ts)
/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { buildMonthlyResult, computeFinalGpa } from "../src/lib/results/engine";
import {
  BD_PHONE_RE,
  normalizeBdPhone,
  todayISODateDhaka,
} from "../src/lib/constants";
import { ApiError, assertSameOrigin } from "../src/lib/api";
import { settingsUpdateSchema, studentCreateSchema } from "../src/lib/validation";
import { assertNotRateLimited, clearRateLimit, recordRateFailure } from "../src/lib/auth/rate-limit";
import { getDb } from "../src/lib/db";

// ---------------------------------------------------------------- GPA formula
describe("computeFinalGpa (official GPA formula)", () => {
  test("compulsory fail forces GPA 0 even with high other marks", () => {
    const r = computeFinalGpa([
      { gpa: 5.0, isFourth: false },
      { gpa: 5.0, isFourth: false },
      { gpa: 0.0, isFourth: false }, // 32/100 -> F
    ]);
    expect(r.gpa).toBe(0);
    expect(r.grade).toBe("F");
  });

  test("4th subject above 2.0 contributes (gpa - 2) bonus, capped at 5.0", () => {
    const r = computeFinalGpa([
      { gpa: 5.0, isFourth: false },
      { gpa: 5.0, isFourth: false },
      { gpa: 4.0, isFourth: true },
    ]);
    // (5 + 5 + 2) / 2 = 6 -> capped 5.0
    expect(r.gpa).toBe(5.0);
    expect(r.grade).toBe("A+");
  });

  test("4th subject at or below 2.0 contributes nothing", () => {
    const r = computeFinalGpa([
      { gpa: 4.0, isFourth: false },
      { gpa: 4.0, isFourth: false },
      { gpa: 1.0, isFourth: true },
    ]);
    // (4 + 4) / 2 = 4
    expect(r.gpa).toBe(4.0);
  });

  test("multiple 4th subjects: only the best one is used", () => {
    const r = computeFinalGpa([
      { gpa: 4.0, isFourth: false },
      { gpa: 4.0, isFourth: false },
      { gpa: 3.0, isFourth: true },
      { gpa: 4.5, isFourth: true },
    ]);
    // (4 + 4 + (4.5 - 2)) / 2 = 5.25 -> capped 5.0
    expect(r.gpa).toBe(5.0);
  });

  test("no compulsory subjects falls back to overall percentage grade", () => {
    const r = computeFinalGpa([{ gpa: 4.0, isFourth: true }], 85);
    expect(r.gpa).toBe(5.0);
    expect(r.grade).toBe("A+");
  });

  test("buildMonthlyResult.overall uses THE SAME formula (merit/card consistency)", () => {
    const mk = (gpa: number, isFourth = false) => ({
      name: `s${gpa}-${isFourth}`,
      isFourth,
      exams: [
        { total: 100, obtained: gpa === 0 ? 32 : gpa * 20 - 1 },
      ],
    });
    const bySubject = new Map<number, ReturnType<typeof mk>>();
    bySubject.set(1, mk(5.0));
    bySubject.set(2, mk(5.0));
    bySubject.set(3, mk(0)); // one compulsory fail
    const res = buildMonthlyResult(bySubject, new Map());
    const direct = computeFinalGpa(
      res.subjects.map((s) => ({ gpa: s.gpa, isFourth: s.isFourth })),
      res.overall.percentage
    );
    expect(res.overall.gpa).toBe(direct.gpa);
    expect(res.overall.grade).toBe(direct.grade);
    expect(res.overall.gpa).toBe(0);
  });
});

// ---------------------------------------------------------------- phone utils
describe("BD phone normalization", () => {
  test("Bengali digits are converted", () => {
    expect(normalizeBdPhone("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
  });
  test("+880 / 880 prefixes fold to 0", () => {
    expect(normalizeBdPhone("+8801712345678")).toBe("01712345678");
    expect(normalizeBdPhone("8801712345678")).toBe("01712345678");
  });
  test("separators are stripped", () => {
    expect(normalizeBdPhone("01712 345-678")).toBe("01712345678");
  });
  test("regex accepts real BD numbers, rejects junk", () => {
    expect(BD_PHONE_RE.test("01712345678")).toBe(true);
    expect(BD_PHONE_RE.test("01912345678")).toBe(true);
    expect(BD_PHONE_RE.test("12345")).toBe(false);
    expect(BD_PHONE_RE.test("01234567890")).toBe(false);
    expect(BD_PHONE_RE.test("")).toBe(false);
  });
});

// ---------------------------------------------------------------- CSRF guard
describe("assertSameOrigin fails CLOSED on malformed Origin", () => {
  const mkReq = (origin: string) =>
    new Request("http://localhost:3000/api/x", {
      method: "POST",
      headers: { origin, host: "localhost:3000" },
    });

  test('Origin: "null" is rejected (403)', () => {
    expect(() => assertSameOrigin(mkReq("null"))).toThrow(ApiError);
    try {
      assertSameOrigin(mkReq("null"));
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });

  test('Origin: "https://" (malformed) is rejected', () => {
    expect(() => assertSameOrigin(mkReq("https://"))).toThrow();
  });

  test("same-origin passes", () => {
    expect(() => assertSameOrigin(mkReq("http://localhost:3000"))).not.toThrow();
  });
});

// ---------------------------------------------------------------- zod schemas
describe("settingsUpdateSchema logo-key hardening", () => {
  test("rejects a backup path as logo key (R2 pivot attack)", () => {
    const r = settingsUpdateSchema.safeParse({ academyLogoKey: "academy/backups/backup-20260101.json" });
    expect(r.success).toBe(false);
  });
  test("rejects arbitrary keys outside academy/logos/", () => {
    const r = settingsUpdateSchema.safeParse({ academyLogoKey: "academy/students/7/secret.png" });
    expect(r.success).toBe(false);
  });
  test("accepts a legitimate uploaded logo key", () => {
    const r = settingsUpdateSchema.safeParse({ academyLogoKey: "academy/logos/main-abc123.png" });
    expect(r.success).toBe(true);
  });
  test("accepts empty string / null (clear logo)", () => {
    expect(settingsUpdateSchema.safeParse({ academyLogoKey: "" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ academyLogoKey: null }).success).toBe(true);
  });
  test("cardBgUrl rejects javascript:/data: URIs", () => {
    expect(settingsUpdateSchema.safeParse({ cardBgUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ cardBgUrl: "data:image/png;base64,xxx" }).success).toBe(false);
  });
  test("cardBgUrl accepts internal /api/files and https URLs", () => {
    expect(settingsUpdateSchema.safeParse({ cardBgUrl: "/api/files/academy/card-bg/x.png" }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ cardBgUrl: "https://example.com/bg.jpg" }).success).toBe(true);
  });
});

describe("studentCreateSchema phone validation", () => {
  const base = {
    name: "টেস্ট শিক্ষার্থী",
    className: "7",
    roll: 99,
    username: "unittest01",
    password: "1234",
  };
  test("Bengali-digit phone is normalized to ASCII on the server", () => {
    const r = studentCreateSchema.safeParse({ ...base, phone: "০১৭১২৩৪৫৬৭৮" });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as { phone?: string }).phone).toBe("01712345678");
  });
  test("invalid phone rejected with clear message", () => {
    const r = studentCreateSchema.safeParse({ ...base, phone: "12345" });
    expect(r.success).toBe(false);
  });
  test("valid phone accepted", () => {
    expect(studentCreateSchema.safeParse({ ...base, phone: "01712345678" }).success).toBe(true);
  });
});

// ---------------------------------------------------------------- date helper
describe("todayISODateDhaka", () => {
  test("returns YYYY-MM-DD in Asia/Dhaka (UTC+6)", () => {
    const d = todayISODateDhaka();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // At 20:00 UTC it must already be the NEXT day in Dhaka.
    const utc = new Date().toISOString().slice(0, 10);
    const diffDays = Math.abs(Date.parse(d) - Date.parse(utc)) / 86400000;
    expect(diffDays).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------- rate limiter
describe("D1-backed durable rate limiter", () => {
  test("locks after limit failures, unlocks after clear", async () => {
    const db = await getDb();

    // bootstrap must have created the login_attempts table
    const tbl = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
      .first<{ name: string }>()
      .catch(() => null);
    expect(tbl?.name).toBe("login_attempts");

    const key = "test:rl:unit";
    await clearRateLimit(db, key);

    const opts = { limit: 3, windowSec: 60, lockoutSec: 120 };
    let lockedOn = -1;
    for (let i = 1; i <= 3; i++) {
      try {
        await recordRateFailure(db, key, opts);
      } catch {
        lockedOn = i;
        break;
      }
    }
    expect(lockedOn).toBe(3); // the 3rd failure engages the lockout

    let blocked = false;
    try {
      await assertNotRateLimited(db, key, opts);
    } catch (e) {
      blocked = e instanceof ApiError && (e as ApiError).status === 429;
    }
    expect(blocked).toBe(true);

    await clearRateLimit(db, key);
    let stillBlocked = false;
    try {
      await assertNotRateLimited(db, key, opts);
    } catch {
      stillBlocked = true;
    }
    expect(stillBlocked).toBe(false);

    await clearRateLimit(db, key);
  });
});
