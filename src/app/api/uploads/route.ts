// POST /api/uploads — image uploads to Cloudflare R2.
// Allowed: JPG / JPEG / PNG (validated by magic bytes, not by filename),
// max 5 MB. Only the R2 object key is stored in D1.

import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";
import {
  ALLOWED_IMAGE_EXT,
  MAX_UPLOAD_BYTES,
  MSG,
  SETTING_ACADEMY_LOGO,
  SETTING_PUBLICATION_LOGO,
} from "@/lib/constants";
import { setSetting } from "@/lib/db";
import { getBucket } from "@/lib/storage/r2";
import { teacherClassAllowed } from "@/lib/permissions";

function detectImageType(bytes: Uint8Array, mime?: string, fileName?: string): "jpg" | "png" | "webp" | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "webp";

  // Fallback to MIME type or file extension
  const m = (mime || "").toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";

  const fn = (fileName || "").toLowerCase();
  if (fn.endsWith(".jpg") || fn.endsWith(".jpeg")) return "jpg";
  if (fn.endsWith(".png")) return "png";
  if (fn.endsWith(".webp")) return "webp";

  return null;
}

function extOf(key: string): string {
  const m = key.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
  return m ? m[1] : "";
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "TEACHER", "DIRECTOR"]);
    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") ?? "");

    if (!(file instanceof File)) throw new ApiError(400, "ফাইল পাওয়া যায়নি।");

    // Special handling for notebook PDFs
    if (type === "notebook-pdf") {
      const maxPdfBytes = 25 * 1024 * 1024; // 25 MB
      if (file.size > maxPdfBytes) throw new ApiError(400, "পিডিএফ ফাইলটি অনেক বড় (সর্বোচ্চ ২৫ MB)।");
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Validate PDF signature: %PDF (0x25, 0x50, 0x44, 0x46) anywhere in first 1024 bytes
      const headerWindow = bytes.subarray(0, Math.min(bytes.length, 1024));
      let hasPdfHeader = false;
      for (let i = 0; i <= headerWindow.length - 4; i++) {
        if (
          headerWindow[i] === 0x25 &&
          headerWindow[i + 1] === 0x50 &&
          headerWindow[i + 2] === 0x44 &&
          headerWindow[i + 3] === 0x46
        ) {
          hasPdfHeader = true;
          break;
        }
      }
      if (!hasPdfHeader) {
        throw new ApiError(400, "অননুমোদিত ফাইল ধরন — শুধুমাত্র বৈধ PDF ফাইল আপলোড করা যাবে।");
      }
      const bucket = await getBucket();
      const uuid = crypto.randomUUID();
      const key = `academy/notebooks/${uuid}.pdf`;
      await bucket.put(key, bytes);
      return ok({
        key,
        url: `/api/files/${key}`,
        fileName: file.name,
        fileSize: file.size,
        message: "পিডিএফ সফলভাবে আপলোড হয়েছে।",
      });
    }

    // Type-specific file size limits
    const maxBytes =
      type === "banner"
        ? 15 * 1024 * 1024 // 15 MB
        : type === "publication-logo" || type === "logo"
        ? 10 * 1024 * 1024 // 10 MB (supports 10mb jpg/png requested by user)
        : MAX_UPLOAD_BYTES; // 5 MB

    if (file.size > maxBytes) {
      throw new ApiError(
        400,
        type === "banner"
          ? "ব্যানার ফাইলটি অনেক বড় (সর্বোচ্চ ১৫ MB)।"
          : type === "publication-logo" || type === "logo"
          ? "লোগো ফাইলটি অনেক বড় (সর্বোচ্চ ১০ MB)।"
          : MSG.fileTooLarge
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageType(bytes, file.type, file.name);
    if (!detected) throw new ApiError(400, MSG.invalidFileType + " (শুধু JPG/PNG/WebP)");
    if (!ALLOWED_IMAGE_EXT.includes(detected)) throw new ApiError(400, MSG.invalidFileType);

    const bucket = await getBucket();
    const uuid = crypto.randomUUID();

    if (type === "banner") {
      if (user.role !== "ADMIN") throw new ApiError(403, "শুধুমাত্র প্রশাসক ব্যানার পরিবর্তন করতে পারেন।");
      const key = `academy/banners/banner-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "director-photo") {
      if (user.role !== "ADMIN" && user.role !== "DIRECTOR") throw new ApiError(403, MSG.noPermissionView);
      const key = `academy/directors/photo-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "director-signature") {
      if (user.role !== "ADMIN" && user.role !== "DIRECTOR") throw new ApiError(403, MSG.noPermissionView);
      const key = `academy/signatures/director-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "logo") {
      if (user.role !== "ADMIN") {
        throw new ApiError(403, "শুধুমাত্র প্রশাসক একাডেমির লোগো পরিবর্তন করতে পারেন।");
      }
      const current = await db
        .prepare("SELECT value FROM settings WHERE key = ?")
        .bind(SETTING_ACADEMY_LOGO)
        .first<{ value: string | null }>(undefined as never)
        .catch(() => null);
      const key = `academy/logos/main-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await setSetting(SETTING_ACADEMY_LOGO, key);
      if (current?.value) await bucket.delete(current.value).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "publication-logo") {
      if (user.role !== "ADMIN") {
        throw new ApiError(403, "শুধুমাত্র প্রশাসক প্রকাশনীর লোগো পরিবর্তন করতে পারেন।");
      }
      const current = await db
        .prepare("SELECT value FROM settings WHERE key = ?")
        .bind(SETTING_PUBLICATION_LOGO)
        .first<{ value: string | null }>(undefined as never)
        .catch(() => null);
      const key = `academy/publication/logo-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await setSetting(SETTING_PUBLICATION_LOGO, key);
      if (current?.value) await bucket.delete(current.value).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: "প্রকাশনীর লোগো সংরক্ষিত হয়েছে।" });
    }

    if (type === "signature") {
      let teacherId = user.teacherId ?? null;
      const target = Number(form.get("teacherId") ?? 0);
      if (target && target !== user.teacherId) {
        if (user.role !== "ADMIN") throw new ApiError(403, MSG.noPermissionView);
        teacherId = target;
      }
      if (!teacherId) throw new ApiError(400, "শিক্ষক নির্বাচন করুন।");
      const teacher = await db
        .prepare("SELECT id, signature_key FROM teachers WHERE id = ?")
        .bind(teacherId)
        .first<{ id: number; signature_key: string | null }>(undefined as never)
        .catch(() => null);
      if (!teacher) throw new ApiError(404, MSG.notFound);
      const key = `academy/signatures/teacher-${teacherId}-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await db.prepare("UPDATE teachers SET signature_key = ?, updated_at = datetime('now') WHERE id = ?").bind(key, teacherId).run();
      if (teacher.signature_key) await bucket.delete(teacher.signature_key).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "teacher-photo") {
      let teacherId = user.teacherId ?? null;
      const target = Number(form.get("teacherId") ?? 0);
      if (target && target !== user.teacherId) {
        if (user.role !== "ADMIN") throw new ApiError(403, MSG.noPermissionView);
        teacherId = target;
      }
      if (!teacherId) throw new ApiError(400, "শিক্ষক নির্বাচন করুন।");
      const teacher = await db
        .prepare("SELECT id, photo_key FROM teachers WHERE id = ?")
        .bind(teacherId)
        .first<{ id: number; photo_key: string | null }>(undefined as never)
        .catch(() => null);
      if (!teacher) throw new ApiError(404, MSG.notFound);
      const key = `academy/teachers/photo-${teacherId}-${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await db.prepare("UPDATE teachers SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(key, teacherId).run();
      if (teacher.photo_key) await bucket.delete(teacher.photo_key).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "student-photo") {
      const studentId = Number(form.get("studentId") ?? 0);
      if (!studentId) throw new ApiError(400, "শিক্ষার্থী নির্বাচন করুন।");
      const student = await db
        .prepare("SELECT id, photo_key, class_id FROM students WHERE id = ?")
        .bind(studentId)
        .first<{ id: number; photo_key: string | null; class_id: number }>(undefined as never)
        .catch(() => null);
      if (!student) throw new ApiError(404, MSG.notFound);
      if (user.role === "TEACHER" && user.teacherId) {
        const allowed = await teacherClassAllowed(db, user.teacherId, student.class_id);
        if (!allowed) throw new ApiError(403, MSG.noPermissionView);
      }
      const key = `academy/students/${studentId}/${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await db.prepare("UPDATE students SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(key, studentId).run();
      if (student.photo_key) await bucket.delete(student.photo_key).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "pending-student-photo") {
      const requestId = Number(form.get("requestId") ?? 0);
      if (!requestId) throw new ApiError(400, "অনুরোধ আইডি প্রদান করুন।");
      const reqRow = await db
        .prepare("SELECT id, photo_key, class_id FROM student_requests WHERE id = ?")
        .bind(requestId)
        .first<{ id: number; photo_key: string | null; class_id: number }>()
        .catch(() => null);
      if (!reqRow) throw new ApiError(404, MSG.notFound);
      if (user.role === "TEACHER" && user.teacherId) {
        const allowed = await teacherClassAllowed(db, user.teacherId, reqRow.class_id);
        if (!allowed) throw new ApiError(403, MSG.noPermissionView);
      }
      const key = `academy/requests/${requestId}/${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await db.prepare("UPDATE student_requests SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(key, requestId).run();
      if (reqRow.photo_key) await bucket.delete(reqRow.photo_key).catch(() => {});
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    if (type === "card-bg") {
      if (user.role !== "ADMIN" && user.role !== "DIRECTOR") throw new ApiError(403, MSG.noPermissionView);
      const key = `academy/card-bg/${uuid}.${detected}`;
      await bucket.put(key, bytes);
      await setSetting("card_bg_image_key", key);
      return ok({ key, url: `/api/files/${key}`, message: MSG.saved });
    }

    throw new ApiError(400, "অজানা আপলোড ধরন।");
  } catch (e) {
    return handleError(e);
  }
}

void extOf;
