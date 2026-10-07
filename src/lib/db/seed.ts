// Secure seed/setup for the academy system.
// Idempotent: every section checks for existing data before inserting.

import { hashPassword } from "@/lib/auth/password";
import type { D1Database } from "./types";
import { DEFAULT_ACADEMY_NAME } from "@/lib/constants";

export interface SeedEnv {
  adminUsername: string;
  adminPassword: string;
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
async function ensureTeachers(db: D1Database) {
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
  const existing = await db
    .prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
    .first<{ id: number }>()
    .catch(() => null);
  if (existing) return;
  const username = env.adminUsername || "admin";
  const password = env.adminPassword || "admin123";
  const hash = await hashPassword(password);
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

async function ensureDemoData(db: D1Database) {
  const flag = await db
    .prepare("SELECT value FROM settings WHERE key = 'demo_data_seeded'")
    .first<{ value: string }>()
    .catch(() => null);
  if (flag?.value === "disabled" || flag?.value === "1") return;
  if ((await count(db, "students")) > 0) return;

  // 1) student users + student rows
  const passwordHash = await hashPassword("1234");
  let seq = 0;
  for (const s of DEMO_STUDENTS) {
    seq++;
    const username = `student${String(seq).padStart(2, "0")}`;
    const res = await db
      .prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'STUDENT')")
      .bind(s.name, username, passwordHash)
      .run();
    const userId = Number(res.meta.last_row_id ?? 0);
    if (!userId) continue;
    const c = await classIdByName(db, s.classNum);
    if (!c) continue;
    const section = s.classNum === "9" || s.classNum === "10" ? "ক" : null;
    await db
      .prepare("INSERT INTO students (user_id, name, class_id, division, section, roll) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(userId, s.name, c, s.division, section, s.roll)
      .run();
  }

  // 2) demo exams + marks — current month and two previous months
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const monthTriples: { month: number; year: number }[] = [];
  for (let k = 2; k >= 0; k--) {
    let m = curMonth - k;
    let y = curYear;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    monthTriples.push({ month: m, year: y });
  }

  const subjects = (await db.prepare("SELECT id, class_id FROM subjects").all<{ id: number; class_id: number }>()).results;
  const students = (await db.prepare("SELECT id, class_id, division FROM students").all<{ id: number; class_id: number; division: string | null }>()).results;
  const links = (await db.prepare("SELECT teacher_id, subject_id FROM teacher_subjects").all<{ teacher_id: number; subject_id: number }>()).results;
  const teacherForSubject = new Map<number, number>();
  for (const l of links) if (!teacherForSubject.has(l.subject_id)) teacherForSubject.set(l.subject_id, l.teacher_id);

  const rand = mulberry32(20261005);
  const ability = new Map<number, number>();
  for (const st of students) ability.set(st.id, 0.45 + rand() * 0.5);

  const examPlans: { month: number; year: number; title: string; total: number; dateSuffix: string }[] = [];
  for (const { month, year } of monthTriples) {
    examPlans.push({ month, year, title: "মাসিক পরীক্ষা", total: 100, dateSuffix: "18" });
    if (month === curMonth) {
      examPlans.push({ month, year, title: "ক্লাস টেস্ট ১", total: 20, dateSuffix: "08" });
      examPlans.push({ month, year, title: "ক্লাস টেস্ট ২", total: 20, dateSuffix: "24" });
    }
  }

  for (const subj of subjects) {
    // group the students of this class by division (9/10: Science & Humanities)
    const classStudents = students.filter((st) => st.class_id === subj.class_id);
    const groups = new Map<string, { division: string | null; list: { id: number }[] }>();
    for (const st of classStudents) {
      const key = st.division ?? "";
      if (!groups.has(key)) groups.set(key, { division: st.division ?? null, list: [] });
      groups.get(key)!.list.push(st);
    }

    for (const group of groups.values()) {
      for (const plan of examPlans) {
        const examDate = `${plan.year}-${String(plan.month).padStart(2, "0")}-${plan.dateSuffix}`;
        const res = await db
          .prepare(
            `INSERT INTO exams (class_id, division, subject_id, month, year, exam_date, title, total_marks, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(subj.class_id, group.division, subj.id, plan.month, plan.year, examDate, plan.title, plan.total, teacherForSubject.get(subj.id) ?? null)
          .run();
        const examId = Number(res.meta.last_row_id ?? 0);
        if (!examId) continue;

        const inserts: import("./types").D1PreparedStatement[] = [];
        for (const st of group.list) {
          const base = ability.get(st.id) ?? 0.6;
          const noise = (rand() - 0.5) * 0.12;
          const pct = Math.max(0.3, Math.min(0.98, base + noise));
          const absent = rand() < 0.06;
          const obtained = absent ? 0 : Math.round(plan.total * pct);
          inserts.push(
            db.prepare("INSERT INTO marks (exam_id, student_id, attendance, obtained_marks) VALUES (?, ?, ?, ?)")
              .bind(examId, st.id, absent ? "ABSENT" : "PRESENT", absent ? 0 : obtained)
          );
        }
        if (inserts.length) await db.batch(inserts);
      }
    }
  }
  await db
    .prepare("INSERT INTO settings (key, value) VALUES ('demo_data_seeded', '1') ON CONFLICT(key) DO UPDATE SET value = '1'")
    .run()
    .catch(() => null);
}

// ---------------------------------------------------------------- entry
export async function seedDatabase(db: D1Database, env: SeedEnv): Promise<void> {
  await ensureClasses(db);
  await ensureSubjects(db);
  await ensureTeachers(db);
  await ensureAdmin(db, env);
  await ensureSettings(db);
  await ensureDemoData(db);
}
