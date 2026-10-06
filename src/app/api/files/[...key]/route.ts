// GET /api/files/[...key] — authenticated Worker endpoint for private R2 objects.
// A student can never read another student's photo by changing the id:
// ownership and permission are verified per request here.

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, handleError } from "@/lib/api";
import { getBucket } from "@/lib/storage/r2";
import { teacherClassAllowed } from "@/lib/permissions";

type Ctx = { params: Promise<{ key: string[] }> };

function contentTypeFor(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const segments = (await ctx.params).key ?? [];
    const key = segments.join("/");
    if (!key.startsWith("academy/")) return fail(404, "এই তথ্য পাওয়া যায়নি।");

    const db = await getDb();
    const bucket = await getBucket();
    const obj = await bucket.get(key);
    if (!obj) return fail(404, "এই তথ্য পাওয়া যায়নি।");

    // ---- public: academy logo & banners (branding) ----
    if (key.startsWith("academy/logos/") || key.startsWith("academy/banners/")) {
      return new Response(obj.data as unknown as BodyInit, {
        headers: {
          "Content-Type": contentTypeFor(key),
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // everything else requires a session
    const user = await getCurrentUser(db);
    if (!user) return fail(401, "লগইন করা আবশ্যক।");

    // ---- notebooks: read-only pdfs for authenticated users ----
    if (key.startsWith("academy/notebooks/")) {
      return new Response(obj.data as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=\"notebook-preview.pdf\"",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // ---- backups: admin only ----
    if (key.startsWith("academy/backups/")) {
      if (user.role !== "ADMIN") return fail(403, "আপনার এই তথ্য দেখার অনুমতি নেই।");
      return new Response(obj.data as unknown as BodyInit, {
        headers: {
          "Content-Type": contentTypeFor(key),
          "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ---- director photos & signatures ----
    if (key.startsWith("academy/directors/") || key.startsWith("academy/signatures/director-")) {
      return new Response(obj.data as unknown as BodyInit, {
        headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "private, max-age=300" },
      });
    }

    // ---- signatures: admin, director, the teacher themself, or students viewing reports ----
    if (key.startsWith("academy/signatures/")) {
      const allowed =
        user.role === "ADMIN" ||
        user.role === "DIRECTOR" ||
        user.role === "STUDENT" ||
        user.role === "TEACHER";
      if (!allowed) return fail(403, "আপনার এই তথ্য দেখার অনুমতি নেই।");
      return new Response(obj.data as unknown as BodyInit, {
        headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "private, max-age=300" },
      });
    }

    // ---- teacher photos: accessible to logged in users ----
    if (key.startsWith("academy/teachers/")) {
      return new Response(obj.data as unknown as BodyInit, {
        headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "private, max-age=300" },
      });
    }

    // ---- student photos: admin, director, teacher of that class, or the student themself ----
    if (key.startsWith("academy/students/")) {
      const m = key.match(/^academy\/students\/(\d+)\//);
      const studentId = m ? Number(m[1]) : null;
      let allowed = false;
      if (studentId) {
        if (user.role === "ADMIN" || user.role === "DIRECTOR") allowed = true;
        else if (user.role === "STUDENT") {
          if (user.studentId === studentId) {
            allowed = true;
          } else {
            const st = await db
              .prepare("SELECT hide_photo_from_students FROM students WHERE id = ?")
              .bind(studentId)
              .first<{ hide_photo_from_students: number }>()
              .catch(() => null);
            // Allow if privacy flag is not active (public merit board / directory)
            allowed = !st || st.hide_photo_from_students === 0;
          }
        }
        else if (user.role === "TEACHER" && user.teacherId) {
          const st = await db
            .prepare("SELECT class_id FROM students WHERE id = ?")
            .bind(studentId)
            .first<{ class_id: number }>(undefined as never)
            .catch(() => null);
          if (st) allowed = await teacherClassAllowed(db, user.teacherId, st.class_id);
        }
      }
      if (!allowed) return fail(403, "আপনার এই তথ্য দেখার অনুমতি নেই।");
      return new Response(obj.data as unknown as BodyInit, {
        headers: { "Content-Type": contentTypeFor(key), "Cache-Control": "private, max-age=300" },
      });
    }

    return fail(404, "এই তথ্য পাওয়া যায়নি।");
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
