// /api/notebooks — Notebook & PDF lecture books library
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const subjectId = url.searchParams.get("subject_id");

    let query = `
      SELECT n.id, n.title, n.class_id, n.subject_id, n.file_key, n.file_name, n.file_size,
             n.uploaded_by, n.uploader_name, n.description, n.created_at,
             c.name as class_name, s.name as subject_name
      FROM notebooks n
      LEFT JOIN classes c ON c.id = n.class_id
      LEFT JOIN subjects s ON s.id = n.subject_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (classId) {
      conditions.push("n.class_id = ?");
      params.push(Number(classId));
    }
    if (subjectId) {
      conditions.push("n.subject_id = ?");
      params.push(Number(subjectId));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY n.id DESC";

    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return ok({ notebooks: result.results ?? [] });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR", "TEACHER"]);

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      classId?: number;
      subjectId?: number;
      fileKey?: string;
      fileName?: string;
      fileSize?: number;
      description?: string;
    };

    if (!body.title?.trim() || !body.fileKey?.trim()) {
      throw new ApiError(400, "বই বা নোটের শিরোনাম এবং আপলোডকৃত পিডিএফ ফাইল আবশ্যক।");
    }

    const res = await db
      .prepare(
        `INSERT INTO notebooks (
           title, class_id, subject_id, file_key, file_name, file_size, uploaded_by, uploader_name, description
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        body.title.trim(),
        body.classId ? Number(body.classId) : null,
        body.subjectId ? Number(body.subjectId) : null,
        body.fileKey.trim(),
        body.fileName?.trim() || "document.pdf",
        body.fileSize ? Number(body.fileSize) : null,
        user.id,
        user.name,
        body.description?.trim() || null
      )
      .run();

    return ok({
      id: res.meta.last_row_id,
      message: "নোট বুক সফলভাবে যুক্ত করা হয়েছে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
