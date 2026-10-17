// Secure seed/setup for the academy system.
// Idempotent: every section checks for existing data before inserting.

import { hashPassword } from "@/lib/auth/password";
import type { D1Database } from "./types";
import { DEFAULT_ACADEMY_NAME } from "@/lib/constants";

export interface SeedEnv {
  adminUsername: string;
  // null = refuse to create the initial admin (Workers without the
  // ADMIN_PASSWORD secret must NEVER get a well-known default password).
  adminPassword: string | null;
  // Demo teachers/students/exams are ONLY seeded when explicitly requested
  // (SEED_DEMO_DATA="1", e.g. in local .dev.vars). Production installs get a
  // clean database with no known-credential accounts.
  seedDemo: boolean;
}

async function count(db: D1Database, table: string): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) as c FROM ${table}`).first<{ c: number }>();
  return r?.c ?? 0;
}

async function classIdByName(db: D1Database, name: string): Promise<number | null> {
  const r = await db
    .prepare("SELECT id FROM classes WHERE name = ?")
    .bind(name)
    .first<{ id: number }>()
    .catch(() => null);
  return r?.id ?? null;
}

// ---------------------------------------------------------------- classes
async function ensureClasses(db: D1Database) {
  if ((await count(db, "classes")) > 0) return;
  const stmts = ["6", "7", "8", "9", "10"].map((n) =>
    db.prepare("INSERT INTO classes (name, sort_order) VALUES (?, ?)").bind(n, Number(n))
  );
  await db.batch(stmts);
}

// ---------------------------------------------------------------- subjects
const SUBJECTS_9_10: [string, boolean][] = [
  ["বাংলা ২য় পত্র", false],
  ["ইংরেজি ১ম পত্র", false],
  ["ইংরেজি ২য় পত্র", false],
  ["সাধারণ গণিত", false],
  ["পদার্থবিজ্ঞান", false],
  ["রসায়ন", false],
  ["জীববিজ্ঞান", false],
  ["কৃষিশিক্ষা", true],
  ["উচ্চতর গণিত", true],
];
const SUBJECTS_6_8: [string, boolean][] = [
  ["বাংলা ১ম পত্র", false],
  ["বাংলা ২য় পত্র", false],
  ["ইংরেজি ১ম পত্র", false],
  ["ইংরেজি ২য় পত্র", false],
  ["গণিত", false],
  ["বিজ্ঞান", false],
  ["বাংলাদেশ ও বিশ্বপরিচয়", false],
];

async function ensureSubjects(db: D1Database) {
  if ((await count(db, "subjects")) > 0) return;
  const stmts: import("./types").D1PreparedStatement[] = [];
  for (const cn of ["9", "10"]) {
    const c = await classIdByName(db, cn);
    if (!c) continue;
    for (const [name, fourth] of SUBJECTS_9_10) {
      stmts.push(
        db.prepare("INSERT INTO subjects (name, class_id, division, is_fourth_subject) VALUES (?, ?, NULL, ?)").bind(name, c, fourth ? 1 : 0)
      );
    }
  }
  for (const cn of ["6", "7", "8"]) {
    const c = await classIdByName(db, cn);
    if (!c) continue;
    for (const [name, fourth] of SUBJECTS_6_8) {
      stmts.push(
        db.prepare("INSERT INTO subjects (name, class_id, division, is_fourth_subject) VALUES (?, ?, NULL, ?)").bind(name, c, fourth ? 1 : 0)
      );
    }
  }
  if (stmts.length) await db.batch(stmts);
}

// ---------------------------------------------------------------- teachers
async function ensureTeachers(db: D1Database, seedDemo: boolean) {
  if (!seedDemo) {
    // Mark as disabled so demo accounts can never be resurrected later by a
    // cold start (the old guard was count(teachers) > 0 — deleting the demo
    // teachers used to re-seed them with the known passwords).
    await db
      .prepare("INSERT INTO settings (key, value) VALUES ('demo_teachers_seeded', 'disabled') ON CONFLICT(key) DO UPDATE SET value = 'disabled'")
      .run()
      .catch(() => null);
    return;
  }
  const flag = await db
    .prepare("SELECT value FROM settings WHERE key = 'demo_teachers_seeded'")
    .first<{ value: string }>()
    .catch(() => null);
  if (flag?.value === "disabled" || flag?.value === "1") return;
  if ((await count(db, "teachers")) > 0) return;

  interface SeedTeacher {
    name: string;
    username: string;
    password: string;
    shortName: string;
    permissions: Record<string, string[]>;
  }
  const teachers: SeedTeacher[] = [
    {
      name: "রাকিবুল ইসলাম",
      username: "rakibul",
      password: "0092",
      shortName: "RI",
      permissions: {
        "9": ["বাংলা ২য় পত্র", "ইংরেজি ১ম পত্র", "রসায়ন", "জীববিজ্ঞান", "কৃষিশিক্ষা"],
        "10": ["বাংলা ২য় পত্র", "ইংরেজি ১ম পত্র", "রসায়ন", "জীববিজ্ঞান", "কৃষিশিক্ষা"],
        "6": ["গণিত", "বিজ্ঞান", "বাংলা ২য় পত্র"],
        "7": ["গণিত", "বিজ্ঞান", "বাংলা ২য় পত্র"],
        "8": ["গণিত", "বিজ্ঞান", "বাংলা ২য় পত্র"],
      },
    },
    {
      name: "মেহেদী হাসান",
      username: "mehedi",
      password: "2732",
      shortName: "MH",
      permissions: {
        "9": ["সাধারণ গণিত", "পদার্থবিজ্ঞান", "ইংরেজি ২য় পত্র", "উচ্চতর গণিত"],
        "10": ["সাধারণ গণিত", "পদার্থবিজ্ঞান", "ইংরেজি ২য় পত্র", "উচ্চতর গণিত"],
        "6": ["ইংরেজি ১ম পত্র", "ইংরেজি ২য় পত্র", "বাংলা ১ম পত্র", "বাংলাদেশ ও বিশ্বপরিচয়"],
        "7": ["ইংরেজি ১ম পত্র", "ইংরেজি ২য় পত্র", "বাংলা ১ম পত্র", "বাংলাদেশ ও বিশ্বপরিচয়"],
        "8": ["ইংরেজি ১ম পত্র", "ইংরেজি ২য় পত্র", "বাংলা ১ম পত্র", "বাংলাদেশ ও বিশ্বপরিচয়"],
      },
    },
  ];

  for (const t of teachers) {
    const hash = await hashPassword(t.password);
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'TEACHER')")
      .bind(t.name, t.username, hash)
      .run();
    const userId = Number(res.meta.last_row_id ?? 0);
    if (!userId) continue;
    const tres = await db
      .prepare("INSERT INTO teachers (user_id, short_name) VALUES (?, ?)")
      .bind(userId, t.shortName)
      .run();
    const teacherId = Number(tres.meta.last_row_id ?? 0);
    if (!teacherId) continue;

    const links: import("./types").D1PreparedStatement[] = [];
    for (const [classNum, subjectNames] of Object.entries(t.permissions)) {
      const c = await classIdByName(db, classNum);
      if (!c) continue;
      for (const sName of subjectNames) {
        const s = await db
          .prepare("SELECT id FROM subjects WHERE class_id = ? AND name = ?")
          .bind(c, sName)
          .first<{ id: number }>()
          .catch(() => null);
        if (!s) continue;
        links.push(db.prepare("INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)").bind(teacherId, s.id));
      }
    }
    if (links.length) await db.batch(links);
  }
  await db
    .prepare("INSERT INTO settings (key, value) VALUES ('demo_teachers_seeded', '1') ON CONFLICT(key) DO UPDATE SET value = '1'")
    .run()
    .catch(() => null);
}

// ---------------------------------------------------------------- admin
async function ensureAdmin(db: D1Database, env: SeedEnv) {
  // SECURITY: create the initial admin ONLY on a completely empty users
  // table. Previously the guard was "no ADMIN row exists", which meant that
  // deleting the admin account resurrected it with the default password on
  // the next cold start.
  if ((await count(db, "users")) > 0) return;
  const username = env.adminUsername || "admin";
  if (!env.adminPassword) {
    // SECURITY: a production deploy where ADMIN_PASSWORD was never set must
    // not silently boot with admin/admin123 — the documented default.
    console.error(
      "[seed] ADMIN_PASSWORD is not configured — initial admin account NOT created. " +
        "Set it with `wrangler secret put ADMIN_USERNAME` / `wrangler secret put ADMIN_PASSWORD`, then restart the worker."
    );
    return;
  }
  const hash = await hashPassword(env.adminPassword);
  await db
    .prepare("INSERT INTO users (name, username, password_hash, role) VALUES ('প্রশাসক', ?, ?, 'ADMIN')")
    .bind(username, hash)
    .run();
}

// ---------------------------------------------------------------- settings
async function ensureSettings(db: D1Database) {
  const existing = await db
    .prepare("SELECT id FROM settings WHERE key = 'academy_name' LIMIT 1")
    .first<{ id: number }>()
    .catch(() => null);
  if (!existing) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('academy_name', ?)").bind(DEFAULT_ACADEMY_NAME).run();
  }
}

// ---------------------------------------------------------------- demo data
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_STUDENTS: { name: string; classNum: string; division: string | null; roll: number }[] = [
  { name: "আরিফুল ইসলাম", classNum: "10", division: "SCIENCE", roll: 1 },
  { name: "সাদিয়া আফরিন", classNum: "10", division: "SCIENCE", roll: 2 },
  { name: "তানভীর হাসান", classNum: "10", division: "SCIENCE", roll: 3 },
  { name: "নুসরাত জাহান", classNum: "10", division: "SCIENCE", roll: 4 },
  { name: "রাফিউল করিম", classNum: "10", division: "SCIENCE", roll: 5 },
  { name: "ফাহিম মাহমুদ", classNum: "10", division: "HUMANITIES", roll: 1 },
  { name: "সাবরিনা সুলতানা", classNum: "10", division: "HUMANITIES", roll: 2 },
  { name: "ইমরান খান", classNum: "10", division: "HUMANITIES", roll: 3 },
  { name: "জুবায়ের আহমেদ", classNum: "9", division: "SCIENCE", roll: 1 },
  { name: "সাইফুল ইসলাম", classNum: "9", division: "SCIENCE", roll: 2 },
  { name: "মারিয়া সুলতানা", classNum: "9", division: "SCIENCE", roll: 3 },
  { name: "আদনান সামী", classNum: "9", division: "SCIENCE", roll: 4 },
  { name: "রিফাত মাহমুদ", classNum: "9", division: "HUMANITIES", roll: 1 },
  { name: "লাবিবা নূর", classNum: "9", division: "HUMANITIES", roll: 2 },
  { name: "সিয়াম চৌধুরী", classNum: "8", division: null, roll: 1 },
  { name: "অন্তরা দাশ", classNum: "8", division: null, roll: 2 },
  { name: "রায়হান আহমেদ", classNum: "8", division: null, roll: 3 },
  { name: "প্রিয়া রানী দাস", classNum: "8", division: null, roll: 4 },
  { name: "নাজমুল হুদা", classNum: "7", division: null, roll: 1 },
  { name: "ফারজানা আক্তার", classNum: "7", division: null, roll: 2 },
  { name: "শাকিল খান", classNum: "7", division: null, roll: 3 },
  { name: "হাসিন আলী", classNum: "6", division: null, roll: 1 },
  { name: "মিম আক্তার", classNum: "6", division: null, roll: 2 },
  { name: "আবির হোসেন", classNum: "6", division: null, roll: 3 },
];

async function ensureDemoData(db: D1Database, seedDemo: boolean) {
  // Production protection: strictly no demo students or demo exams seeded
  await db
    .prepare("INSERT INTO settings (key, value) VALUES ('demo_data_seeded', 'disabled') ON CONFLICT(key) DO UPDATE SET value = 'disabled'")
    .run()
    .catch(() => null);
  return;
}

// ---------------------------------------------------------------- routines
async function ensureRoutines(db: D1Database) {
  const existing = await count(db, "routines");
  if (existing > 0) return;

  const tRI = await db
    .prepare("SELECT t.id, u.name FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.short_name = 'RI'")
    .first<{ id: number; name: string }>()
    .catch(() => null);
  const tMH = await db
    .prepare("SELECT t.id, u.name FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.short_name = 'MH'")
    .first<{ id: number; name: string }>()
    .catch(() => null);

  const nameRI = tRI?.name || "রাকিবুল ইসলাম";
  const nameMH = tMH?.name || "মেহেদী হাসান";
  const idRI = tRI?.id ?? null;
  const idMH = tMH?.id ?? null;

  const b10Morning = await db
    .prepare("SELECT b.id, b.name FROM batches b JOIN classes c ON c.id = b.class_id WHERE c.name = '10' AND b.name = 'সকাল ব্যাচ'")
    .first<{ id: number; name: string }>()
    .catch(() => null);
  const b10Evening = await db
    .prepare("SELECT b.id, b.name FROM batches b JOIN classes c ON c.id = b.class_id WHERE c.name = '10' AND b.name = 'সন্ধ্যা ব্যাচ'")
    .first<{ id: number; name: string }>()
    .catch(() => null);

  // Days: 6 (শনিবার), 0 (রবিবার), 1 (সোমবার), 2 (মঙ্গলবার), 3 (বুধবার), 4 (বৃহস্পতিবার)
  const days = [6, 0, 1, 2, 3, 4];
  const stmts: import("./types").D1PreparedStatement[] = [];

  for (const day of days) {
    // Class 10 (Science)
    stmts.push(
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, batch_id, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '10', 'SCIENCE', 'ক', ?, ?, 'পদার্থবিজ্ঞান', ?, ?, '10:00 AM', '11:00 AM', 'বিজ্ঞান ল্যাব', 'অধ্যায় ভিত্তিক তত্ত্ব ও প্রয়োগ')`)
        .bind(day, b10Morning?.id ?? null, b10Morning?.name ?? "সকাল ব্যাচ", idMH, nameMH),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, batch_id, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '10', 'SCIENCE', 'ক', ?, ?, 'রসায়ন', ?, ?, '11:05 AM', '12:05 PM', 'রুম ১০১', 'মডেল টেস্ট প্রস্তুতি')`)
        .bind(day, b10Morning?.id ?? null, b10Morning?.name ?? "সকাল ব্যাচ", idRI, nameRI),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, batch_id, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '10', 'SCIENCE', 'ক', ?, ?, 'উচ্চতর গণিত', ?, ?, '02:00 PM', '03:00 PM', 'রুম ১০১', 'সমস্যা সমাধান ক্লাস')`)
        .bind(day, b10Evening?.id ?? null, b10Evening?.name ?? "সন্ধ্যা ব্যাচ", idMH, nameMH),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, batch_id, batch_name, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '10', 'SCIENCE', 'ক', ?, ?, 'জীববিজ্ঞান', ?, ?, '03:05 PM', '04:05 PM', 'রুম ১০২', 'চিত্রাঙ্কন ও আলোচনা')`)
        .bind(day, b10Evening?.id ?? null, b10Evening?.name ?? "সন্ধ্যা ব্যাচ", idRI, nameRI),

      // Class 9 (Science)
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '9', 'SCIENCE', 'ক', 'রসায়ন', ?, ?, '10:00 AM', '11:00 AM', 'রুম ১০২', 'রাসায়নিক বন্ধন ও বিক্রিয়া')`)
        .bind(day, idRI, nameRI),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '9', 'SCIENCE', 'ক', 'সাধারণ গণিত', ?, ?, '11:05 AM', '12:05 PM', 'রুম ১০৩', 'বীজগণিত অনুশীলন')`)
        .bind(day, idMH, nameMH),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '9', 'SCIENCE', 'ক', 'পদার্থবিজ্ঞান', ?, ?, '02:00 PM', '03:00 PM', 'বিজ্ঞান ল্যাব', 'গতি ও বলের সূত্রাবলী')`)
        .bind(day, idMH, nameMH),

      // Class 8
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '8', NULL, 'ক', 'গণিত', ?, ?, '09:00 AM', '10:00 AM', 'রুম ২০২', 'জ্যামিতি ও পাটিগণিত')`)
        .bind(day, idRI, nameRI),
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '8', NULL, 'ক', 'ইংরেজি ১ম পত্র', ?, ?, '10:05 AM', '11:05 AM', 'রুম ২০২', 'সিন প্যাসেজ ও গ্রামার')`)
        .bind(day, idMH, nameMH),

      // Class 7
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '7', NULL, 'ক', 'বিজ্ঞান', ?, ?, '11:15 AM', '12:15 PM', 'রুম ২০৩', 'অধ্যায় ৪ — শ্বসনতন্ত্র')`)
        .bind(day, idRI, nameRI),

      // Class 6
      db.prepare(`INSERT INTO routines (day_of_week, class_name, division, section, subject_name, teacher_id, teacher_name, start_time, end_time, room_no, note)
                  VALUES (?, '6', NULL, 'ক', 'বিজ্ঞান', ?, ?, '09:00 AM', '10:00 AM', 'রুম ২০৪', 'ভগ্নাংশ ও মৌলিক সংখ্যা')`)
        .bind(day, idRI, nameRI)
    );
  }

  for (let i = 0; i < stmts.length; i += 50) {
    await db.batch(stmts.slice(i, i + 50));
  }
}

// ---------------------------------------------------------------- batches
async function ensureBatches(db: D1Database) {
  if ((await count(db, "batches")) > 0) return;
  const classes = (await db.prepare("SELECT id, name FROM classes ORDER BY sort_order DESC").all<{ id: number; name: string }>().catch(() => null))?.results ?? [];
  const stmts: import("./types").D1PreparedStatement[] = [];
  for (const c of classes) {
    stmts.push(
      db.prepare(
        "INSERT INTO batches (name, class_id, time_slot, days, is_active) VALUES (?, ?, ?, ?, 1)"
      ).bind("সকাল ব্যাচ", c.id, "সকাল ৮:০০ - ৯:৩০", "শনি-সোম-বুধ"),
      db.prepare(
        "INSERT INTO batches (name, class_id, time_slot, days, is_active) VALUES (?, ?, ?, ?, 1)"
      ).bind("সন্ধ্যা ব্যাচ", c.id, "সন্ধ্যা ৫:০০ - ৬:৩০", "রবি-মঙ্গল-বৃহস্পতি")
    );
  }
  if (stmts.length) await db.batch(stmts);
}

// ---------------------------------------------------------------- entry
export async function seedDatabase(db: D1Database, env: SeedEnv): Promise<void> {
  await ensureClasses(db);
  await ensureBatches(db);
  await ensureSubjects(db);
  // Admin FIRST: it is only created on a completely EMPTY users table, so it
  // must run before demo teacher accounts populate the users table.
  await ensureAdmin(db, env);
  await ensureTeachers(db, env.seedDemo);
  await ensureSettings(db);
  await ensureDemoData(db, env.seedDemo);
  await ensureRoutines(db);
}
