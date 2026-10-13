// src/app/api/admin/fees/route.ts
// Admin API for Fee Management, Payments, Dues, and Invoices

import { requireApiUser } from "@/lib/auth/guards";
import { assertSameOrigin, fail, handleError, ok } from "@/lib/api";
import {
  generateMonthlyTuitionFees,
  recordFeePayment,
  FEE_CATEGORY_LABELS,
  type FeeCategory,
} from "@/lib/fees/engine";

export async function GET(req: Request) {
  try {
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const url = new URL(req.url);

    const classId = url.searchParams.get("classId");
    const batchId = url.searchParams.get("batchId");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const studentId = url.searchParams.get("studentId");
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();

    // 1. Fetch Fee Items
    let itemsSql = `
      SELECT
        fi.*,
        s.name as student_name,
        s.roll as student_roll,
        s.division,
        s.section,
        c.name as class_name,
        b.name as batch_name
      FROM fee_items fi
      JOIN students s ON s.id = fi.student_id
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN batches b ON b.id = s.batch_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (studentId) {
      itemsSql += ` AND fi.student_id = ?`;
      params.push(studentId);
    }
    if (classId && classId !== "all") {
      itemsSql += ` AND s.class_id = ?`;
      params.push(classId);
    }
    if (batchId && batchId !== "all") {
      itemsSql += ` AND s.batch_id = ?`;
      params.push(batchId);
    }
    if (category && category !== "all") {
      itemsSql += ` AND fi.category = ?`;
      params.push(category);
    }
    if (status && status !== "all") {
      itemsSql += ` AND fi.status = ?`;
      params.push(status);
    }
    if (query) {
      itemsSql += ` AND (LOWER(s.name) LIKE ? OR CAST(s.roll AS TEXT) LIKE ? OR LOWER(fi.title) LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    itemsSql += ` ORDER BY fi.created_at DESC LIMIT 300`;

    const items = (await db.prepare(itemsSql).bind(...params).all<any>()).results || [];

    // 2. Fetch Recent Payments
    const payments = (
      await db
        .prepare(
          `SELECT fp.*, s.name as student_name, s.roll as student_roll, c.name as class_name
           FROM fee_payments fp
           JOIN students s ON s.id = fp.student_id
           JOIN classes c ON c.id = s.class_id
           ORDER BY fp.payment_date DESC LIMIT 50`
        )
        .all<any>()
    ).results || [];

    // 3. Compute Summary Statistics
    const statsRow = await db
      .prepare(
        `SELECT
          COALESCE(SUM(amount), 0) as total_charged,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(due_amount), 0) as total_due,
          COALESCE(SUM(CASE WHEN category = 'ABSENT_FINE' THEN due_amount ELSE 0 END), 0) as absent_fine_due,
          COALESCE(SUM(CASE WHEN category = 'FAIL_FINE' THEN due_amount ELSE 0 END), 0) as fail_fine_due,
          COALESCE(SUM(CASE WHEN category = 'MONTHLY_FEE' THEN due_amount ELSE 0 END), 0) as monthly_fee_due,
          COALESCE(SUM(CASE WHEN category = 'NOTE_MATERIAL' THEN due_amount ELSE 0 END), 0) as note_due,
          COUNT(DISTINCT CASE WHEN due_amount > 0 THEN student_id ELSE NULL END) as defaulter_students_count
         FROM fee_items`
      )
      .first<any>()
      .catch(() => null);

    // 4. Fetch Active Classes & Batches & Students for Selectors
    const classes = (
      await db.prepare(`SELECT id, name FROM classes WHERE is_active = 1 ORDER BY id ASC`).all<any>()
    ).results || [];

    const batches = (
      await db
        .prepare(
          `SELECT b.id, b.name, b.class_id, c.name as class_name FROM batches b JOIN classes c ON c.id = b.class_id WHERE b.is_active = 1 ORDER BY b.id ASC`
        )
        .all<any>()
    ).results || [];

    const students = (
      await db
        .prepare(
          `SELECT s.id, s.name, s.roll, s.class_id, s.batch_id, c.name as class_name, b.name as batch_name
           FROM students s
           JOIN classes c ON c.id = s.class_id
           LEFT JOIN batches b ON b.id = s.batch_id
           WHERE c.is_active = 1
           ORDER BY c.id ASC, s.roll ASC`
        )
        .all<any>()
    ).results || [];

    return ok({
      items,
      payments,
      stats: {
        totalCharged: Number(statsRow?.total_charged || 0),
        totalPaid: Number(statsRow?.total_paid || 0),
        totalDue: Number(statsRow?.total_due || 0),
        absentFineDue: Number(statsRow?.absent_fine_due || 0),
        failFineDue: Number(statsRow?.fail_fine_due || 0),
        monthlyFeeDue: Number(statsRow?.monthly_fee_due || 0),
        noteDue: Number(statsRow?.note_due || 0),
        defaultersCount: Number(statsRow?.defaulter_students_count || 0),
      },
      classes,
      batches,
      students,
      categories: FEE_CATEGORY_LABELS,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const body = await req.json();
    const action = body.action || "CREATE_ITEM";

    if (action === "BULK_MONTHLY") {
      // Bulk monthly fee generation
      const { classId, batchId, month, year, amount, dueDate, customTitle } = body;
      if (!month || !year || !amount || Number(amount) <= 0) {
        return fail(400, "মাস, বছর এবং সঠিক টাকার পরিমাণ প্রদান করুন।");
      }

      const res = await generateMonthlyTuitionFees(db, {
        classId: classId && classId !== "all" ? Number(classId) : undefined,
        batchId: batchId && batchId !== "all" ? Number(batchId) : undefined,
        month: Number(month),
        year: Number(year),
        amount: Number(amount),
        dueDate: dueDate || undefined,
        customTitle: customTitle?.trim() || undefined,
        createdBy: user.id,
      });

      return ok({
        message: `${res.generatedCount} জন শিক্ষার্থীর জন্য মাসিক বেতন তৈরি করা হয়েছে (${res.skippedCount} জন শিক্ষার্থীর পূর্বেই যোগ করা ছিল)।`,
        ...res,
      });
    }

    if (action === "RECORD_PAYMENT") {
      // Receive fee payment
      const {
        studentId,
        feeItemId,
        amountPaid,
        discount,
        paymentMethod,
        transactionId,
        receiptNote,
      } = body;

      if (!studentId || !amountPaid || Number(amountPaid) <= 0) {
        return fail(400, "শিক্ষার্থী নির্বাচন করুন এবং পরিশোধিত টাকার পরিমাণ দিন।");
      }

      const res = await recordFeePayment(db, {
        studentId: Number(studentId),
        feeItemId: feeItemId ? Number(feeItemId) : null,
        amountPaid: Number(amountPaid),
        discount: discount ? Number(discount) : 0,
        paymentMethod: paymentMethod || "CASH",
        transactionId: transactionId?.trim() || null,
        receiptNote: receiptNote?.trim() || null,
        collectedBy: user.id,
        collectorName: user.name || "অ্যাডমিন",
      });

      return ok({
        message: `পেমেন্ট সফলভাবে সংরক্ষণ করা হয়েছে। মানি রিসিট নং: ${res.invoiceNo}`,
        ...res,
      });
    }

    if (action === "CREATE_ITEM") {
      // Add custom fee/fine/notes selling
      const {
        studentId,
        category,
        title,
        amount,
        month,
        year,
        dueDate,
        referenceNote,
      } = body;

      if (!studentId || !title || !amount || Number(amount) <= 0) {
        return fail(400, "শিক্ষার্থী, বিবরণ এবং সঠিক টাকার পরিমাণ দিন।");
      }

      const validCategories = [
        "MONTHLY_FEE",
        "EXAM_FEE",
        "ABSENT_FINE",
        "FAIL_FINE",
        "NOTE_MATERIAL",
        "ADMISSION_FEE",
        "OTHER_FINE",
        "OTHER_FEE",
      ];
      const selectedCat = validCategories.includes(category) ? category : "OTHER_FEE";

      const numAmount = Number(amount);

      await db
        .prepare(
          `INSERT INTO fee_items (
            student_id, category, title, amount, paid_amount, due_amount,
            month, year, due_date, reference_note, status, created_by
          ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'PENDING', ?)`
        )
        .bind(
          Number(studentId),
          selectedCat,
          title.trim(),
          numAmount,
          numAmount,
          month ? Number(month) : null,
          year ? Number(year) : null,
          dueDate || null,
          referenceNote?.trim() || null,
          user.id
        )
        .run();

      return ok({
        message: "ফি/জরিমানা সফলভাবে যুক্ত করা হয়েছে।",
      });
    }

    return fail(400, "অবৈধ অ্যাকশন অনুরোধ।");
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireApiUser(["ADMIN", "DIRECTOR"]);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return fail(400, "আইডি প্রদান করুন।");

    const item = await db
      .prepare(`SELECT * FROM fee_items WHERE id = ?`)
      .bind(id)
      .first<any>()
      .catch(() => null);

    if (!item) return fail(404, "ফি আইটেম পাওয়া যায়নি।");

    if (item.paid_amount > 0) {
      return fail(400, "এই আইটেমে ইতিমধ্যে পেমেন্ট গ্রহণ করা হয়েছে, তাই এটি সরাসরি মোছা যাবে না।");
    }

    await db.prepare(`DELETE FROM fee_items WHERE id = ?`).bind(id).run();

    return ok({ message: "ফি রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।" });
  } catch (err) {
    return handleError(err);
  }
}
