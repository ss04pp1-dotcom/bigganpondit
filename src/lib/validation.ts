// Schema-based validation (zod) — used on the server for every mutation.
// Client-side validation mirrors these rules for UX only.

import { z } from "zod";
import { ApiError } from "@/lib/api";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "ইউজারনেম লিখুন।"),
  password: z.string().min(1, "পাসওয়ার্ড লিখুন।"),
});

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "তারিখের ফরম্যাট ভুল (YYYY-MM-DD)।")
  .refine((s) => !isNaN(new Date(`${s}T00:00:00`).getTime()), "ভুল তারিখ।");

export const studentCreateSchema = z.object({
  name: z.string().trim().min(1, "শিক্ষার্থীর নাম লিখুন।").max(100),
  className: z.string().regex(/^(6|7|8|9|10)$/, "শ্রেণি নির্বাচন করুন।"),
  division: z.enum(["SCIENCE", "HUMANITIES"]).nullish(),
  section: z.string().trim().max(10).nullish(),
  roll: z.number().int().positive("রোল একটি ধনাত্মক সংখ্যা হতে হবে।"),
  username: z
    .string()
    .trim()
    .min(3, "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "ইউজারনেমে শুধু ইংরেজি অক্ষর, সংখ্যা, . _ - ব্যবহার করা যাবে।"),
  password: z.string().min(4, "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।").max(100),
  fatherName: z.string().trim().max(100).nullish(),
  motherName: z.string().trim().max(100).nullish(),
  schoolName: z.string().trim().max(150).nullish(),
  phone: z.string().trim().max(30).nullish(),
  address: z.string().trim().max(200).nullish(),
  bloodGroup: z.string().trim().max(10).nullish(),
  dob: z.string().trim().max(30).nullish(),
  hidePhotoFromStudents: z.boolean().optional().default(false),
});
export const studentUpdateSchema = studentCreateSchema.partial();

export const directorCreateSchema = z.object({
  name: z.string().trim().min(1, "পরিচালকের নাম লিখুন।").max(100),
  username: z
    .string()
    .trim()
    .min(3, "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "ইউজারনেমে শুধু ইংরেজি অক্ষর, সংখ্যা, . _ - ব্যবহার করা যাবে।"),
  password: z.string().min(4, "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।").max(100),
  institution: z.string().trim().max(200).nullish(),
  remarks: z.string().trim().max(500).nullish(),
  photo_key: z.string().nullish(),
  signature_key: z.string().nullish(),
});
export const directorUpdateSchema = directorCreateSchema.partial();

export const markSaveSchema = z.object({
  examId: z.number().int().positive().optional(),
  classId: z.number().int().positive(),
  division: z.enum(["SCIENCE", "HUMANITIES"]).nullish(),
  subjectId: z.number().int().positive("বিষয় নির্বাচন করুন।"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  examDate: dateStr,
  title: z.string().trim().min(1, "পরীক্ষার নাম লিখুন।").max(100),
  totalMarks: z.number().int().positive("মোট নম্বর ০-এর বেশি হতে হবে।").max(1000),
  examType: z.enum(["MONTHLY", "MODEL"]).optional().default("MONTHLY"),
  studentId: z.number().int().positive("শিক্ষার্থী নির্বাচন করুন।").optional(),
  attendance: z.enum(["PRESENT", "ABSENT"]).optional().default("PRESENT"),
  obtainedMarks: z.number().min(0, "ভুল নম্বর প্রদান করা হয়েছে।").max(1000).optional().default(0),
  confirmUpdate: z.boolean().optional(),
  batch: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        attendance: z.enum(["PRESENT", "ABSENT"]),
        obtainedMarks: z.number().min(0).max(1000),
      })
    )
    .optional(),
});

export const markUpdateSchema = z.object({
  obtainedMarks: z.number().min(0, "ভুল নম্বর প্রদান করা হয়েছে।"),
  attendance: z.enum(["PRESENT", "ABSENT"]),
});

export const teacherCreateSchema = z.object({
  name: z.string().trim().min(1, "শিক্ষকের নাম লিখুন।").max(100),
  username: z
    .string()
    .trim()
    .min(3, "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(4, "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।").max(100),
  shortName: z.string().trim().min(1).max(10),
  subjectIds: z.array(z.number().int().positive()).default([]),
});
export const teacherUpdateSchema = teacherCreateSchema.partial();

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1, "বিষয়ের নাম লিখুন।").max(100),
  className: z.string().regex(/^(6|7|8|9|10)$/, "শ্রেণি নির্বাচন করুন।"),
  division: z.enum(["SCIENCE", "HUMANITIES"]).nullish(),
  isFourthSubject: z.boolean().optional().default(false),
});
export const subjectUpdateSchema = subjectCreateSchema.partial();

export const settingsUpdateSchema = z.object({
  academyName: z.string().trim().min(1, "একাডেমির নাম লিখুন।").max(100).optional(),
  cardBgUrl: z.string().nullable().optional(),
  publicationName: z.string().trim().max(120).optional(),
  publicationDescription: z.string().trim().max(1000).optional(),
  publicationLogoKey: z.string().nullable().optional(),
});

export const backupActionSchema = z.object({
  action: z.enum(["create", "restore", "delete"]),
  key: z.string().optional(),
});

export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "অনুরোধটি বোঝা যায়নি।");
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    const first = r.error.issues[0]?.message ?? "ভুল তথ্য প্রদান করা হয়েছে।";
    throw new ApiError(400, first);
  }
  return r.data as z.infer<S>;
}

export function num(v: string | null, def: number | null = null): number | null {
  if (v === null || v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
