// /api/backup — admin backup system (spec 54).
// GET                -> list backups (from the settings registry)
// POST {action}      -> create | restore | delete
// Backups are stored in R2 (academy/backups/…) and downloaded through
// the authenticated /api/files endpoint.

import { getDb, getSetting, setSetting } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { hashSessionToken } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import { MSG, SESSION_COOKIE, SETTING_BACKUP_REGISTRY } from "@/lib/constants";
import { backupActionSchema, parseJson } from "@/lib/validation";
import { getBucket } from "@/lib/storage/r2";
import { cookies } from "next/headers";

interface RegistryItem {
  key: string;
  size: number;
  createdAt: string;
}

async function readRegistry(): Promise<RegistryItem[]> {
  const raw = await getSetting(SETTING_BACKUP_REGISTRY, "[]");
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeRegistry(items: RegistryItem[]): Promise<void> {
  await setSetting(SETTING_BACKUP_REGISTRY, JSON.stringify(items.slice(0, 20)));
}

const TABLES = [
  "users",
  "teachers",
  "directors",
  "classes",
  "subjects",
  "teacher_subjects",
  "students",
  "exams",
  "marks",
  "attendance",
  "notices",
  "notebooks",
  "settings",
  "webauthn_credentials",
  "student_requests",
] as const;

// SECURITY: settings rows that hold third-party secrets are NEVER written to
// backups. A leaked backup file must not expose the Resend / SMS API keys.
const SECRET_SETTING_KEYS = new Set(["resend_api_key", "sms_gateway_api_key"]);

// SECURITY: plaintext password mirrors are scrubbed from backups. Only the
// PBKDF2 hashes (needed for restore) are exported; raw_password is nulled so
// the admin "reveal password" feature simply reports unavailable after a
// restore instead of shipping credentials inside the backup file.
const PASSWORD_MIRROR_COLUMNS: Record<string, string> = {
  students: "raw_password",
  student_requests: "raw_password",
};

export async function GET(req: Request) {
  try {
    await requireApiUser(["ADMIN"]);
    const items = await readRegistry();
    return ok({ backups: items });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireApiUser(["ADMIN"]);
    const body = await parseJson(req, backupActionSchema);
    const db = await getDb();
    const bucket = await getBucket();

    if (body.action === "create") {
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        let rows = (await db.prepare(`SELECT * FROM ${t}`).all<Record<string, unknown>>().catch(() => null))?.results ?? [];
        // scrub secrets
        if (PASSWORD_MIRROR_COLUMNS[t]) {
          const col = PASSWORD_MIRROR_COLUMNS[t];
          rows = rows.map((r) => (r[col] === null || r[col] === undefined ? r : { ...r, [col]: null }));
        }
        if (t === "settings") {
          rows = rows.filter((r) => !SECRET_SETTING_KEYS.has(String(r.key)));
        }
        dump[t] = rows;
      }
      const payload = {
        version: 1,
        createdAt: new Date().toISOString(),
        tables: dump,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const ts = new Date();
      const stamp = [
        ts.getFullYear(),
        String(ts.getMonth() + 1).padStart(2, "0"),
        String(ts.getDate()).padStart(2, "0"),
        "-",
        String(ts.getHours()).padStart(2, "0"),
        String(ts.getMinutes()).padStart(2, "0"),
        String(ts.getSeconds()).padStart(2, "0"),
      ].join("");
      const key = `academy/backups/backup-${stamp}.json`;
      await bucket.put(key, bytes);

      const items = await readRegistry();
      items.unshift({ key, size: bytes.length, createdAt: payload.createdAt });
      await writeRegistry(items);
      return ok({ message: "ব্যাকআপ তৈরি হয়েছে।", key });
    }

    if (body.action === "delete") {
      if (!body.key?.startsWith("academy/backups/")) throw new ApiError(400, "ভুল ব্যাকআপ কী।");
      await bucket.delete(body.key);
      const items = (await readRegistry()).filter((i) => i.key !== body.key);
      await writeRegistry(items);
      return ok({ message: MSG.deleted });
    }

    if (body.action === "restore") {
      if (!body.key?.startsWith("academy/backups/")) throw new ApiError(400, "ভুল ব্যাকআপ কী।");
      const obj = await bucket.get(body.key);
      if (!obj) throw new ApiError(404, MSG.notFound);
      let payload: {
        version: number;
        tables: Record<string, Record<string, unknown>[]>;
      };
      try {
        payload = JSON.parse(new TextDecoder().decode(obj.data));
      } catch {
        throw new ApiError(400, "ব্যাকআপ ফাইলটি সঠিক নয়।");
      }
      if (payload.version !== 1 || !payload.tables) {
        throw new ApiError(400, "ব্যাকআপ ফাইলটি সঠিক নয়।");
      }

      const insertOrder = [
        "classes",
        "subjects",
        "users",
        "teachers",
        "directors",
        "teacher_subjects",
        "students",
        "exams",
        "marks",
        "attendance",
        "notices",
        "notebooks",
        "settings",
        "student_requests",
        "webauthn_credentials",
      ] as const;

      const TABLE_COLUMNS: Record<string, readonly string[]> = {
        users: ["id", "name", "username", "password_hash", "role", "created_at", "updated_at"],
        teachers: ["id", "user_id", "short_name", "photo_key", "signature_key", "created_at", "updated_at"],
        classes: ["id", "name", "sort_order", "created_at", "updated_at"],
        students: [
          "id", "user_id", "name", "class_id", "division", "section", "roll", "photo_key",
          "father_name", "father_occupation", "mother_name", "mother_occupation",
          "guardian_name", "guardian_occupation", "guardian_relation",
          "school_name", "phone", "address", "blood_group", "dob", "raw_password",
          "hide_photo_from_students", "created_at", "updated_at"
        ],
        subjects: ["id", "name", "class_id", "division", "is_fourth_subject", "created_at", "updated_at"],
        teacher_subjects: ["id", "teacher_id", "subject_id", "created_at", "updated_at"],
        exams: ["id", "class_id", "division", "subject_id", "month", "year", "exam_date", "title", "total_marks", "created_by", "created_at", "updated_at"],
        marks: ["id", "exam_id", "student_id", "attendance", "obtained_marks", "created_at", "updated_at"],
        settings: ["id", "key", "value", "updated_at"],
        directors: ["id", "user_id", "institution", "photo_key", "signature_key", "remarks", "created_at", "updated_at"],
        notices: ["id", "title", "content", "author_id", "author_name", "author_role", "status", "is_ticker", "created_at", "approved_at"],
        notebooks: ["id", "title", "class_id", "subject_id", "file_key", "file_name", "file_size", "uploaded_by", "uploader_name", "description", "download_allowed", "created_at"],
        attendance: ["id", "student_id", "class_id", "date", "status", "remarks", "recorded_by", "created_at"],

        webauthn_credentials: ["id", "user_id", "credential_id", "public_key", "counter", "device_name", "created_at", "updated_at"],
        student_requests: [
          "id", "teacher_id", "name", "class_id", "division", "section", "roll", "username",
          "password_hash", "photo_key", "father_name", "father_occupation", "mother_name", "mother_occupation",
          "guardian_name", "guardian_occupation", "guardian_relation",
          "school_name", "phone", "address", "blood_group", "dob", "raw_password", "status", "admin_notes", "reviewed_by", "reviewed_at",
          "created_at", "updated_at"
        ],
      };

      // statements are executed safely in batches
      const stmts: import("@/lib/db/types").D1PreparedStatement[] = [];
      // delete in reverse dependency order (FK-safe)
      for (const t of ["sessions", "attendance", "notebooks", "notices", "marks", "exams", "teacher_subjects", "student_requests", "directors", "students", "teachers", "subjects", "settings", "classes", "users", "webauthn_credentials", "webauthn_challenges"]) {
        if (t === "settings") {
          // SECURITY: live API keys are NOT part of the backup (scrubbed at
          // creation) — do not delete them during restore either.
          const secretKeys = Array.from(SECRET_SETTING_KEYS);
          stmts.push(
            db.prepare(`DELETE FROM settings WHERE key NOT IN (${secretKeys.map(() => "?").join(",")})`).bind(...secretKeys)
          );
          continue;
        }
        stmts.push(db.prepare(`DELETE FROM ${t}`));
      }
      for (const t of insertOrder) {
        const rows = payload.tables[t];
        if (!Array.isArray(rows)) continue;
        const allowedCols = TABLE_COLUMNS[t];
        if (!allowedCols) continue;
        for (const r of rows) {
          const cols = Object.keys(r).filter((col) => allowedCols.includes(col));
          if (!cols.includes("id")) continue;
          stmts.push(
            db.prepare(
              `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
            ).bind(...cols.map((c) => (r[c] === undefined ? null : r[c])))
          );
        }
      }

      // Keep the acting admin logged in across the restore (everyone else is
      // logged out because their user rows are replaced). Only re-insert the
      // current session when its user still exists in the restored snapshot.
      const acting = await requireApiUser(["ADMIN"]);
      const jar = await cookies();
      const token = jar.get(SESSION_COOKIE)?.value;
      if (token) {
        const cur = await db
          .prepare("SELECT id, user_id, token_hash, expires_at, created_at, updated_at FROM sessions WHERE token_hash = ?")
          .bind(hashSessionToken(token))
          .first<{ id: string; user_id: number; token_hash: string; expires_at: string; created_at: string; updated_at: string }>(undefined as never)
          .catch(() => null);
        const restoredUserIds = new Set((payload.tables.users ?? []).map((u) => Number(u.id)));
        if (cur && restoredUserIds.has(cur.user_id)) {
          stmts.push(
            db.prepare(
              "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(cur.id, cur.user_id, cur.token_hash, cur.expires_at, cur.created_at, cur.updated_at)
          );
        }
      }
      void acting;

      // Preserve the CURRENT backup registry: the snapshot was taken before
      // this backup was registered, so restoring it would otherwise drop the
      // restored-from key from the list (orphaning the R2 object).
      const currentRegistry = await getSetting(SETTING_BACKUP_REGISTRY, "[]");
      const restoredRegistry = (payload.tables.settings ?? []).find((s) => s.key === SETTING_BACKUP_REGISTRY);
      if (currentRegistry !== "[]" && restoredRegistry && restoredRegistry.value !== currentRegistry) {
        stmts.push(db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?").bind(currentRegistry, SETTING_BACKUP_REGISTRY));
      }
      // Cloudflare D1 max batch size is 100 statements. Chunk to safe slices of 80:
      const CHUNK_SIZE = 80;
      for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
        const chunk = stmts.slice(i, i + CHUNK_SIZE);
        await db.batch(chunk);
      }
      return ok({ message: "ব্যাকআপ রিস্টোর করা হয়েছে। অন্য সব ব্যবহারকারীকে আবার লগইন করতে হবে।" });
    }

    throw new ApiError(400, "অজানা কাজ।");
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
