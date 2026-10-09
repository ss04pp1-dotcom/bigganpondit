// Reset the local dev DB to a freshly-seeded demo state for smoke tests.
// Usage: bun scripts/reset_demo_db.ts
process.env.SEED_DEMO_DATA = "1";
process.env.ADMIN_PASSWORD = "admin123";

import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "db", "academy.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  try {
    fs.rmSync(dbPath + suffix);
    console.log("removed", dbPath + suffix);
  } catch {
    // not present
  }
}
// local file storage (notebooks/backups from previous runs)
const storageDir = path.join(process.cwd(), ".storage");
try {
  fs.rmSync(storageDir, { recursive: true });
  console.log("removed .storage/");
} catch {
  // not present
}

const { getDb } = await import("../src/lib/db");
const db = await getDb();

const students = (await db.prepare("SELECT COUNT(*) as c FROM students").first<{ c: number }>()).c;
const users = (await db.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>()).c;
const exams = (await db.prepare("SELECT COUNT(*) as c FROM exams").first<{ c: number }>()).c;
const la = await db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_attempts'")
  .first<{ name: string }>()
  .catch(() => null);
console.log(`fresh DB: users=${users} students=${students} exams=${exams} login_attempts=${la?.name ?? "MISSING"}`);
