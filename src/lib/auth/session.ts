// Session management: HttpOnly cookie + D1-stored session records.
// The cookie carries an opaque random token; D1 stores only its SHA-256 hash.

import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import type { D1Database, UserRow, TeacherRow, StudentRow } from "@/lib/db/types";
import { SESSION_COOKIE, SESSION_TTL_DAYS, type Role } from "@/lib/constants";

export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  role: Role;
  // teacher profile (when role = TEACHER)
  teacherId?: number;
  shortName?: string;
  signatureKey?: string | null;
  // student profile (when role = STUDENT)
  studentId?: number;
  classId?: number;
  className?: string;
  division?: string | null;
  section?: string | null;
  roll?: number;
  photoKey?: string | null;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashSessionToken(token: string): string {
  return sha256Hex(token);
}

export function newSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function expiryDate(days: number): string {
  const d = new Date(Date.now() + days * 86400_000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export async function createSession(db: D1Database, userId: number): Promise<{ token: string; expires: string }> {
  const token = newSessionToken();
  const id = randomUUID();
  const expires = expiryDate(SESSION_TTL_DAYS);
  await db
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, hashSessionToken(token), expires)
    .run();
  return { token, expires };
}

export async function destroySession(db: D1Database, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(hashSessionToken(token)).run();
}

async function fetchUserByToken(db: D1Database, token: string): Promise<CurrentUser | null> {
  const row = await db
    .prepare(
      `SELECT u.*, s.id as sid, s.expires_at, s.token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(hashSessionToken(token))
    .first<UserRow & { sid: string; expires_at: string }>()
    .catch(() => null);
  if (!row) return null;

  // Sliding renewal: extend when less than 2 days remain.
  const expiresMs = new Date(row.expires_at.replace(" ", "T") + "Z").getTime();
  if (expiresMs - Date.now() < 2 * 86400_000) {
    await db
      .prepare("UPDATE sessions SET expires_at = ?, updated_at = datetime('now') WHERE token_hash = ?")
      .bind(expiryDate(SESSION_TTL_DAYS), hashSessionToken(token))
      .run();
  }

  const out: CurrentUser = {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
  };

  if (user.role === "TEACHER") {
    const t = await db
      .prepare("SELECT * FROM teachers WHERE user_id = ?")
      .bind(user.id)
      .first<TeacherRow>()
      .catch(() => null);
    if (t) {
      out.teacherId = t.id;
      out.shortName = t.short_name;
      out.signatureKey = t.signature_key;
      out.photoKey = t.photo_key;
    }
  } else if (user.role === "STUDENT") {
    const s = await db
      .prepare(
        `SELECT st.*, c.name as class_name FROM students st JOIN classes c ON c.id = st.class_id WHERE st.user_id = ?`
      )
      .bind(user.id)
      .first<StudentRow & { class_name: string }>()
      .catch(() => null);
    if (s) {
      out.studentId = s.id;
      out.classId = s.class_id;
      out.className = (s as unknown as { class_name: string }).class_name;
      out.division = s.division;
      out.section = s.section;
      out.roll = s.roll;
      out.photoKey = s.photo_key;
    }
  }
  return out;
}

/** Current user from the session cookie (server components & route handlers). */
export async function getCurrentUser(db: D1Database): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await fetchUserByToken(db, token);
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  };
}
