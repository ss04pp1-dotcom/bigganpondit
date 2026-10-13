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
      LEFT JOIN classes c ON c.id = s.class_id
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
           LEFT JOIN classes c ON c.id = s.class_id
           ORDER BY fp.payment_date DESC LIMIT 50`
        )
        .all<any>()
    ).results || [];

    // 3. Compute Summary Statistics
    const statsRow = await db
      .prepare(
        `SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM fee_items) as total_charged,
          (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments) as total_paid,
          (SELECT COALESCE(SUM(due_amount), 0) FROM fee_items) as total_due,
          (SELECT COALESCE(SUM(CASE WHEN category = 'ABSENT_FINE' THEN due_amount ELSE 0 END), 0) FROM fee_items) as absent_fine_due,
          (SELECT COALESCE(SUM(CASE WHEN category = 'FAIL_FINE' THEN due_amount ELSE 0 END), 0) FROM fee_items) as fail_fine_due,
          (SELECT COALESCE(SUM(CASE WHEN category = 'MONTHLY_FEE' THEN due_amount ELSE 0 END), 0) FROM fee_items) as monthly_fee_due,
          (SELECT COALESCE(SUM(CASE WHEN category = 'NOTE_MATERIAL' THEN due_amount ELSE 0 END), 0) FROM fee_items) as note_due,
          (SELECT COUNT(DISTINCT CASE WHEN due_amount > 0 THEN student_id ELSE NULL END) FROM fee_items) as defaulter_students_count`
      )
      .first<any>()
      .catch(() => null);

    const totalPaidNum = Number(statsRow?.total_paid || 0);
    const totalDueNum = Number(statsRow?.total_due || 0);
    const totalChargedNum = Math.max(Number(statsRow?.total_charged || 0), totalPaidNum + totalDueNum);

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
           LEFT JOIN classes c ON c.id = s.class_id
           LEFT JOIN batches b ON b.id = s.batch_id
           WHERE c.is_active = 1 OR c.id IS NULL
           ORDER BY c.id ASC, s.roll ASC`
        )
        .all<any>()
    ).results || [];

    return ok({
      items,
      payments,
      stats: {
        totalCharged: totalChargedNum,
        totalPaid: totalPaidNum,
        totalDue: totalDueNum,
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
      // Receive fee payment or advance deposit
      const {
        studentId,
        feeItemId,
        amountPaid,
        discount,
        paymentMethod,
        transactionId,
        receiptNote,
        isAdvance,
        advancePurpose,
        advanceMonth,
        advanceYear,
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
        isAdvance: Boolean(isAdvance),
        advancePurpose: advancePurpose?.trim() || null,
        advanceMonth: advanceMonth ? Number(advanceMonth) : null,
        advanceYear: advanceYear ? Number(advanceYear) : null,
      });

      return ok({
        message: isAdvance
          ? `অগ্রিম / অতিরিক্ত জমা সফলভাবে সংরক্ষণ করা হয়েছে। মানি রিসিট নং: ${res.invoiceNo}`
          : `পেমেন্ট সফলভাবে সংরক্ষণ করা হয়েছে। মানি রিসিট নং: ${res.invoiceNo}`,
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
    const type = url.searchParams.get("type");
    const paymentId = url.searchParams.get("paymentId");
    const id = url.searchParams.get("id");

    // 1. DELETE PAYMENT RECORD (ভুল পেমেন্ট বা মানি রিসিট বাতিল)
    if (type === "payment" || paymentId) {
      const pid = paymentId || id;
      if (!pid) return fail(400, "পেমেন্ট আইডি প্রদান করুন।");

      const payment = await db
        .prepare(`SELECT * FROM fee_payments WHERE id = ?`)
        .bind(pid)
        .first<any>()
        .catch(() => null);

      if (!payment) return fail(404, "পেমেন্ট রেকর্ড পাওয়া যায়নি।");

      // Revert/restore linked fee item
      if (payment.fee_item_id) {
        const item = await db
          .prepare(`SELECT * FROM fee_items WHERE id = ?`)
          .bind(payment.fee_item_id)
          .first<any>()
          .catch(() => null);

        if (item) {
          // If the item was created solely for advance deposit or surplus payment, delete the item as well
          const isAdvanceOrSurplusItem =
            (item.reference_note && item.reference_note.includes("ADVANCE")) ||
            item.title.includes("অগ্রিম") ||
            item.title.includes("উদ্বৃত্ত");

          if (isAdvanceOrSurplusItem) {
            await db.prepare(`DELETE FROM fee_items WHERE id = ?`).bind(item.id).run();
          } else {
            // Restore regular fee item's due amount
            const totalToRevert = (Number(payment.amount_paid) || 0) + (Number(payment.discount) || 0);
            const restoredPaid = Math.max(0, (Number(item.paid_amount) || 0) - totalToRevert);
            const restoredDue = Math.max(0, (Number(item.amount) || 0) - restoredPaid);
            const restoredStatus = restoredDue === 0 ? "PAID" : (restoredPaid > 0 ? "PARTIAL" : "PENDING");

            await db
              .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
              .bind(restoredPaid, restoredDue, restoredStatus, item.id)
              .run();
          }
        }
      }

      // Remove receipt confirmation notification if any
      if (payment.invoice_no) {
        await db
          .prepare(`DELETE FROM fee_notifications WHERE student_id = ? AND message LIKE ?`)
          .bind(payment.student_id, `%${payment.invoice_no}%`)
          .run()
          .catch(() => null);
      }

      // Delete payment row
      await db.prepare(`DELETE FROM fee_payments WHERE id = ?`).bind(pid).run();

      return ok({
        message: `মানি রিসিট নং ${payment.invoice_no}-এর পেমেন্ট সফলভাবে বাতিল ও মুছে ফেলা হয়েছে।`,
      });
    }

    // 2. DELETE FEE ITEM RECORD (ফি রেকর্ড মুছে ফেলা - পরিশোধিত হলেও মুছে ফেলা যাবে)
    if (!id) return fail(400, "আইডি প্রদান করুন।");

    const item = await db
      .prepare(`SELECT * FROM fee_items WHERE id = ?`)
      .bind(id)
      .first<any>()
      .catch(() => null);

    if (!item) return fail(404, "ফি আইটেম পাওয়া যায়নি।");

    // If item had payments, clean up associated fee_payments
    if (item.paid_amount > 0) {
      await db.prepare(`DELETE FROM fee_payments WHERE fee_item_id = ?`).bind(id).run();
    }

    // Delete fee item
    await db.prepare(`DELETE FROM fee_items WHERE id = ?`).bind(id).run();

    return ok({ message: "ফি রেকর্ড ও সংশ্লিষ্ট পেমেন্ট সফলভাবে মুছে ফেলা হয়েছে।" });
  } catch (err) {
    return handleError(err);
  }
}
