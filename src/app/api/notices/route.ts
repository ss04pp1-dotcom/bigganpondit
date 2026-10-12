// /api/notices — Notice board & floating ticker
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, handleError, ok } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(db);
    const url = new URL(req.url);
    const tickerOnly = url.searchParams.get("ticker") === "true";

    if (tickerOnly) {
      // Approved ticker notices only
      const tickers = (
        await db
          .prepare(
            `SELECT id, title, content, author_name, created_at
             FROM notices
             WHERE status = 'APPROVED' AND is_ticker = 1
             ORDER BY id DESC LIMIT 5`
          )
          .all<{ id: number; title: string; content: string; author_name: string; created_at: string }>()
          .catch(() => null)
      )?.results ?? [];

      return ok({ notices: tickers });
    }

    let query: string;
    let params: any[] = [];

    if (user?.role === "ADMIN") {
      // Admin sees all notices + pending approvals
      query = `
        SELECT id, title, content, author_id, author_name, author_role, status, is_ticker, created_at, approved_at
        FROM notices
        ORDER BY CASE WHEN status = 'PENDING_APPROVAL' THEN 0 ELSE 1 END, id DESC
      `;
    } else if (user) {
      // Users see approved notices + their own submissions
      query = `
        SELECT id, title, content, author_id, author_name, author_role, status, is_ticker, created_at, approved_at
        FROM notices
        WHERE status = 'APPROVED' OR author_id = ?
        ORDER BY id DESC
      `;
      params = [user.id];
    } else {
      query = `
        SELECT id, title, content, author_id, author_name, author_role, status, is_ticker, created_at, approved_at
        FROM notices
        WHERE status = 'APPROVED'
        ORDER BY id DESC
      `;
    }

    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    const pendingRow = user?.role === "ADMIN"
      ? await db.prepare("SELECT COUNT(*) as c FROM notices WHERE status = 'PENDING_APPROVAL'").first<{ c: number }>().catch(() => null)
      : null;

    return ok({
      notices: result.results ?? [],
      pendingCount: pendingRow?.c ?? 0,
    });
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
      content?: string;
      is_ticker?: boolean;
    };

    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!title || !content) {
      throw new ApiError(400, "নোটিশের শিরোনাম ও বিস্তারিত বিবরণ আবশ্যক।");
    }

    const isTicker = body.is_ticker !== false ? 1 : 0;
    const isAutoApproved = user.role === "ADMIN";
    const status = isAutoApproved ? "APPROVED" : "PENDING_APPROVAL";

    const res = await db
      .prepare(
        `INSERT INTO notices (
           title, content, author_id, author_name, author_role, status, is_ticker, approved_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        title,
        content,
        user.id,
        user.name,
        user.role,
        status,
        isTicker,
        isAutoApproved ? new Date().toISOString() : null
      )
      .run();

    return ok({
      id: res.meta.last_row_id,
      status,
      message: isAutoApproved
        ? "নোটিশ সফলভাবে প্রকাশিত হয়েছে।"
        : "নোটিশটি সফলভাবে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন করলে তা প্রকাশিত হবে।",
    });
  } catch (e) {
    return handleError(e);
  }
}

export const dynamic = "force-dynamic";
