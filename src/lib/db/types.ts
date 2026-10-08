// D1-compatible database types (subset of Cloudflare D1 used by this app).
// The same call surface (`prepare().bind().first/all/run`, `batch`, `exec`)
// is implemented for local dev by the SQLite adapter — so queries are
// portable between local development and production D1.

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<D1Result>;
}

// Row shapes shared across the app
export interface UserRow {
  id: number;
  name: string;
  username: string;
  password_hash?: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  created_at: string;
  updated_at: string;
}

export interface TeacherRow {
  id: number;
  user_id: number;
  short_name: string;
  photo_key: string | null;
  signature_key: string | null;
}

export interface ClassRow {
  id: number;
  name: string;
  sort_order: number;
}

export interface StudentRow {
  id: number;
  user_id: number;
  name: string;
  class_id: number;
  division: string | null;
  section: string | null;
  roll: number;
  photo_key: string | null;
}

export interface SubjectRow {
  id: number;
  name: string;
  class_id: number;
  division: string | null;
  is_fourth_subject: number;
}

export interface TeacherSubjectRow {
  id: number;
  teacher_id: number;
  subject_id: number;
}

export interface ExamRow {
  id: number;
  class_id: number;
  division: string | null;
  subject_id: number;
  month: number;
  year: number;
  exam_date: string;
  title: string;
  total_marks: number;
  exam_type?: string;
  is_published?: number;
  created_by: number | null;
}

export interface MarkRow {
  id: number;
  exam_id: number;
  student_id: number;
  attendance: "PRESENT" | "ABSENT";
  obtained_marks: number;
}

export interface SessionRow {
  id: string;
  user_id: number;
  token_hash: string;
  expires_at: string;
}

export interface SettingRow {
  key: string;
  value: string | null;
}

export interface StudentRequestRow {
  id: number;
  teacher_id: number | null;
  name: string;
  class_id: number;
  division: string | null;
  section: string | null;
  roll: number;
  username: string;
  password_hash: string;
  photo_key: string | null;
  father_name: string | null;
  mother_name: string | null;
  school_name: string | null;
  phone: string | null;
  address: string | null;
  blood_group: string | null;
  dob: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
