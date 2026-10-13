// src/lib/fees/engine.ts
// Complete Fees, Automated Absent & Fail Fines, Billing & Notification Engine

import type { D1Database } from "@/lib/db/types";
import { MONTHS_BN, bn } from "@/lib/constants";
import { calculatePercentage, calculateGrade } from "@/lib/results/engine";

export type FeeCategory =
  | "MONTHLY_FEE"
  | "EXAM_FEE"
  | "ABSENT_FINE"
  | "FAIL_FINE"
  | "NOTE_MATERIAL"
  | "ADMISSION_FEE"
  | "OTHER_FINE"
  | "OTHER_FEE";

export const FEE_CATEGORY_LABELS: Record<FeeCategory, { label: string; color: string }> = {
  MONTHLY_FEE: { label: "মাসিক বেতন", color: "bg-blue-100 text-blue-800 border-blue-200" },
  EXAM_FEE: { label: "পরীক্ষার ফি", color: "bg-purple-100 text-purple-800 border-purple-200" },
  ABSENT_FINE: { label: "অনুপস্থিতির জরিমানা (২০৳)", color: "bg-amber-100 text-amber-800 border-amber-200" },
  FAIL_FINE: { label: "ফেল জরিমানা (৫০৳)", color: "bg-rose-100 text-rose-800 border-rose-200" },
  NOTE_MATERIAL: { label: "নোটস ও শিট বিক্রি", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ADMISSION_FEE: { label: "ভর্তি/সেশন ফি", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  OTHER_FINE: { label: "অন্যান্য জরিমানা", color: "bg-orange-100 text-orange-800 border-orange-200" },
  OTHER_FEE: { label: "বিবিধ ফি", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

export interface FeeItemRow {
  id: number;
  student_id: number;
  student_name?: string;
  student_roll?: number;
  class_name?: string;
  batch_name?: string;
  division?: string | null;
  section?: string | null;
  category: FeeCategory;
  title: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  month: number | null;
  year: number | null;
  exam_id: number | null;
  subject_id: number | null;
  reference_note: string | null;
  due_date: string | null;
  status: "PENDING" | "PARTIAL" | "PAID" | "WAIVED";
  created_at: string;
}

export interface FeePaymentRow {
  id: number;
  invoice_no: string;
  student_id: number;
  student_name?: string;
  student_roll?: number;
  class_name?: string;
  fee_item_id: number | null;
  amount_paid: number;
  discount: number;
  payment_method: string;
  transaction_id: string | null;
  receipt_note: string | null;
  collected_by: number | null;
  collector_name: string | null;
  payment_date: string;
}

/**
 * -------------------------------------------------------------
 * 1. AUTOMATED ABSENT & FAIL FINE SYNC
 * -------------------------------------------------------------
 * Automatically scans marks from exams and generates fine items:
 *  - 20৳ per absence in an exam (ABSENT)
 *  - 50৳ per fail in a subject (Grade F, not 4th subject, not absent)
 * Idempotent: Skips fine if already recorded for student + exam + category + subject.
 */
export async function syncExamAbsentAndFailFines(
  db: D1Database,
  options: {
    examId?: number;
    month?: number;
    year?: number;
    classId?: number;
    createdBy?: number;
  } = {}
): Promise<{
  createdFines: number;
  totalAbsentFines: number;
  totalFailFines: number;
  totalFineAmount: number;
  skippedExisting: number;
}> {
  let sql = `
    SELECT
      m.id as mark_id,
      m.exam_id,
      m.student_id,
      m.attendance,
      m.obtained_marks,
      e.title as exam_title,
      e.total_marks,
      e.month,
      e.year,
      e.class_id,
      s.id as subject_id,
      s.name as subject_name,
      s.is_fourth as subject_is_fourth,
      st.name as student_name,
      st.roll as student_roll,
      st.fourth_subject_id,
      c.name as class_name
    FROM marks m
    JOIN exams e ON e.id = m.exam_id
    JOIN subjects s ON s.id = e.subject_id
    JOIN students st ON st.id = m.student_id
    JOIN classes c ON c.id = e.class_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (options.examId) {
    sql += ` AND e.id = ?`;
    params.push(options.examId);
  }
  if (options.month) {
    sql += ` AND e.month = ?`;
    params.push(options.month);
  }
  if (options.year) {
    sql += ` AND e.year = ?`;
    params.push(options.year);
  }
  if (options.classId) {
    sql += ` AND e.class_id = ?`;
    params.push(options.classId);
  }

  sql += ` ORDER BY e.id DESC, st.roll ASC`;

  const rows = (await db.prepare(sql).bind(...params).all<any>()).results || [];

  let createdFines = 0;
  let totalAbsentFines = 0;
  let totalFailFines = 0;
  let totalFineAmount = 0;
  let skippedExisting = 0;

  for (const row of rows) {
    const isAbsent = row.attendance === "ABSENT";
    const monthNameBn = row.month && MONTHS_BN[row.month] ? MONTHS_BN[row.month] : "";
    const examLabel = row.exam_title || `${monthNameBn} ${row.year || ""} পরীক্ষা`;

    if (isAbsent) {
      // 1. ABSENT FINE: 20 Taka
      const existing = await db
        .prepare(
          `SELECT id FROM fee_items WHERE student_id = ? AND exam_id = ? AND category = 'ABSENT_FINE' AND (subject_id = ? OR subject_id IS NULL)`
        )
        .bind(row.student_id, row.exam_id, row.subject_id)
        .first<{ id: number }>()
        .catch(() => null);

      if (existing) {
        skippedExisting++;
      } else {
        const title = `${examLabel} — ${row.subject_name} অনুপস্থিতির জরিমানা`;
        const refNote = `অটো-জেনারেটেড: ${row.subject_name} পরীক্ষায় অনুপস্থিতির কারণে ২০৳ জরিমানা`;
        await db
          .prepare(
            `INSERT INTO fee_items (
              student_id, category, title, amount, paid_amount, due_amount,
              month, year, exam_id, subject_id, reference_note, status, created_by
            ) VALUES (?, 'ABSENT_FINE', ?, 20, 0, 20, ?, ?, ?, ?, ?, 'PENDING', ?)`
          )
          .bind(
            row.student_id,
            title,
            row.month || null,
            row.year || null,
            row.exam_id,
            row.subject_id,
            refNote,
            options.createdBy || null
          )
          .run();

        createdFines++;
        totalAbsentFines++;
        totalFineAmount += 20;
      }
    } else {
      // 2. Check for FAIL: 50 Taka
      const totalMarks = Number(row.total_marks) || 100;
      const obtained = Number(row.obtained_marks) || 0;
      const pct = calculatePercentage(obtained, totalMarks);
      const grade = calculateGrade(pct).grade;

      // Check if this subject is 4th subject for this student
      const is4th = row.subject_is_fourth === 1 || (row.fourth_subject_id && row.fourth_subject_id === row.subject_id);

      if (grade === "F" && !is4th) {
        const existing = await db
          .prepare(
            `SELECT id FROM fee_items WHERE student_id = ? AND exam_id = ? AND subject_id = ? AND category = 'FAIL_FINE'`
          )
          .bind(row.student_id, row.exam_id, row.subject_id)
          .first<{ id: number }>()
          .catch(() => null);

        if (existing) {
          skippedExisting++;
        } else {
          const title = `${examLabel} — ${row.subject_name} ফেল জরিমানা`;
          const refNote = `অটো-জেনারেটেড: ${row.subject_name} পরীক্ষায় ফেল (প্রাপ্ত: ${obtained}/${totalMarks}, গ্রেড F) হিসেবে ৫০৳ জরিমানা`;
          await db
            .prepare(
              `INSERT INTO fee_items (
                student_id, category, title, amount, paid_amount, due_amount,
                month, year, exam_id, subject_id, reference_note, status, created_by
              ) VALUES (?, 'FAIL_FINE', ?, 50, 0, 50, ?, ?, ?, ?, ?, 'PENDING', ?)`
            )
            .bind(
              row.student_id,
              title,
              row.month || null,
              row.year || null,
              row.exam_id,
              row.subject_id,
              refNote,
              options.createdBy || null
            )
            .run();

          createdFines++;
          totalFailFines++;
          totalFineAmount += 50;
        }
      }
    }
  }

  return {
    createdFines,
    totalAbsentFines,
    totalFailFines,
    totalFineAmount,
    skippedExisting,
  };
}

/**
 * -------------------------------------------------------------
 * 2. BULK MONTHLY TUITION FEE GENERATION
 * -------------------------------------------------------------
 * Generates monthly tuition fees for students in a class or batch.
 */
export async function generateMonthlyTuitionFees(
  db: D1Database,
  params: {
    classId?: number;
    batchId?: number;
    month: number;
    year: number;
    amount: number;
    dueDate?: string;
    customTitle?: string;
    createdBy?: number;
  }
): Promise<{ generatedCount: number; skippedCount: number; totalAmount: number }> {
  let studentSql = `SELECT s.id, s.name, s.roll, c.name as class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.is_active = 1`;
  const sqlParams: unknown[] = [];

  if (params.classId) {
    studentSql += ` AND s.class_id = ?`;
    sqlParams.push(params.classId);
  }
  if (params.batchId) {
    studentSql += ` AND s.batch_id = ?`;
    sqlParams.push(params.batchId);
  }

  const students = (await db.prepare(studentSql).bind(...sqlParams).all<any>()).results || [];

  const monthNameBn = MONTHS_BN[params.month] || `মাস ${params.month}`;
  const defaultTitle = params.customTitle || `${monthNameBn} ${params.year} — মাসিক টিউশন ফি`;

  let generatedCount = 0;
  let skippedCount = 0;

  for (const st of students) {
    // Check duplicate monthly fee for same student, month, year
    const existing = await db
      .prepare(
        `SELECT id FROM fee_items WHERE student_id = ? AND category = 'MONTHLY_FEE' AND month = ? AND year = ?`
      )
      .bind(st.id, params.month, params.year)
      .first<{ id: number }>()
      .catch(() => null);

    if (existing) {
      skippedCount++;
      continue;
    }

    await db
      .prepare(
        `INSERT INTO fee_items (
          student_id, category, title, amount, paid_amount, due_amount,
          month, year, due_date, status, created_by
        ) VALUES (?, 'MONTHLY_FEE', ?, ?, 0, ?, ?, ?, ?, 'PENDING', ?)`
      )
      .bind(
        st.id,
        defaultTitle,
        params.amount,
        params.amount,
        params.month,
        params.year,
        params.dueDate || null,
        params.createdBy || null
      )
      .run();

    generatedCount++;
  }

  return {
    generatedCount,
    skippedCount,
    totalAmount: generatedCount * params.amount,
  };
}

/**
 * -------------------------------------------------------------
 * 3. RECORD PAYMENT & ISSUE INVOICE
 * -------------------------------------------------------------
 */
export async function recordFeePayment(
  db: D1Database,
  params: {
    studentId: number;
    feeItemId?: number | null;
    amountPaid: number;
    discount?: number;
    paymentMethod?: string;
    transactionId?: string | null;
    receiptNote?: string | null;
    collectedBy?: number | null;
    collectorName?: string | null;
  }
): Promise<{ invoiceNo: string; paidAmount: number; discount: number; paymentId: number }> {
  const discount = Math.max(0, Number(params.discount) || 0);
  const amountPaid = Math.max(0, Number(params.amountPaid) || 0);
  const totalCovered = amountPaid + discount;

  if (totalCovered <= 0) {
    throw new Error("পরিশোধিত টাকা অথবা ছাড়ের পরিমাণ ০-এর বেশি হতে হবে।");
  }

  const invoiceNo = `BP-REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  // Record payment
  const res = await db
    .prepare(
      `INSERT INTO fee_payments (
        invoice_no, student_id, fee_item_id, amount_paid, discount,
        payment_method, transaction_id, receipt_note, collected_by, collector_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      invoiceNo,
      params.studentId,
      params.feeItemId || null,
      amountPaid,
      discount,
      params.paymentMethod || "CASH",
      params.transactionId || null,
      params.receiptNote || null,
      params.collectedBy || null,
      params.collectorName || "অ্যাডমিন"
    )
    .run();

  const paymentId = Number((res as any)?.meta?.last_row_id || 0);

  // Allocate payment to fee items
  if (params.feeItemId) {
    // Specific fee item
    const item = await db
      .prepare(`SELECT id, amount, paid_amount, due_amount FROM fee_items WHERE id = ? AND student_id = ?`)
      .bind(params.feeItemId, params.studentId)
      .first<{ id: number; amount: number; paid_amount: number; due_amount: number }>()
      .catch(() => null);

    if (item) {
      const newPaid = item.paid_amount + totalCovered;
      const newDue = Math.max(0, item.amount - newPaid);
      const newStatus = newDue === 0 ? "PAID" : "PARTIAL";

      await db
        .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newPaid, newDue, newStatus, item.id)
        .run();
    }
  } else {
    // Auto-allocate across oldest pending fee items
    let remaining = totalCovered;
    const pendingItems = (
      await db
        .prepare(
          `SELECT id, amount, paid_amount, due_amount FROM fee_items WHERE student_id = ? AND status IN ('PENDING', 'PARTIAL') ORDER BY created_at ASC`
        )
        .bind(params.studentId)
        .all<{ id: number; amount: number; paid_amount: number; due_amount: number }>()
    ).results || [];

    for (const item of pendingItems) {
      if (remaining <= 0) break;
      const alloc = Math.min(item.due_amount, remaining);
      const newPaid = item.paid_amount + alloc;
      const newDue = Math.max(0, item.amount - newPaid);
      const newStatus = newDue === 0 ? "PAID" : "PARTIAL";

      await db
        .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newPaid, newDue, newStatus, item.id)
        .run();

      remaining -= alloc;
    }
  }

  // Auto-send payment receipt alert to student
  const student = await db.prepare(`SELECT name FROM students WHERE id = ?`).bind(params.studentId).first<{ name: string }>().catch(() => null);
  await db
    .prepare(
      `INSERT INTO fee_notifications (student_id, title, message, total_due, sent_by, type)
       VALUES (?, 'পেমেন্ট রসিদ নিশ্চিতকরণ', ?, 0, ?, 'RECEIPT_ALERT')`
    )
    .bind(
      params.studentId,
      `সম্মানিত ${student?.name || "শিক্ষার্থী"}, আপনার ${bn(amountPaid)} ৳ পেমেন্ট সফলভাবে জমা হয়েছে (রসিদ নং: ${invoiceNo})। ধন্যবাদ।`,
      params.collectedBy || null
    )
    .run()
    .catch(() => null);

  return {
    invoiceNo,
    paidAmount: amountPaid,
    discount,
    paymentId,
  };
}

/**
 * -------------------------------------------------------------
 * 4. SEND MONTHLY DUE NOTIFICATIONS
 * -------------------------------------------------------------
 * Sends in-app reminders to students who have outstanding balance.
 */
export async function sendDueReminderNotifications(
  db: D1Database,
  options: {
    classId?: number;
    batchId?: number;
    studentId?: number;
    customMessage?: string;
    sentBy?: number;
  } = {}
): Promise<{ notifiedStudents: number; totalOutstanding: number }> {
  let sql = `
    SELECT
      s.id as student_id,
      s.name as student_name,
      s.roll,
      c.name as class_name,
      SUM(fi.due_amount) as total_due,
      COUNT(fi.id) as due_count
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN fee_items fi ON fi.student_id = s.id
    WHERE fi.status IN ('PENDING', 'PARTIAL') AND fi.due_amount > 0 AND s.is_active = 1
  `;
  const params: unknown[] = [];

  if (options.studentId) {
    sql += ` AND s.id = ?`;
    params.push(options.studentId);
  }
  if (options.classId) {
    sql += ` AND s.class_id = ?`;
    params.push(options.classId);
  }
  if (options.batchId) {
    sql += ` AND s.batch_id = ?`;
    params.push(options.batchId);
  }

  sql += ` GROUP BY s.id HAVING total_due > 0`;

  const dueStudents = (await db.prepare(sql).bind(...params).all<any>()).results || [];

  let notifiedStudents = 0;
  let totalOutstanding = 0;

  for (const st of dueStudents) {
    const due = Number(st.total_due) || 0;
    totalOutstanding += due;

    const message =
      options.customMessage ||
      `সম্মানিত ${st.student_name}, আপনার কোচিংয়ের মাসিক বেতন/জরিমানা/পরীক্ষার ফি বাবদ সর্বমোট ${bn(due)} ৳ বকেয়া রয়েছে (${bn(st.due_count)}টি আইটেম)। অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে অফিসে বা অনলাইনে পরিশোধ করুন।`;

    await db
      .prepare(
        `INSERT INTO fee_notifications (student_id, title, message, total_due, sent_by, type)
         VALUES (?, 'বকেয়া ফি পরিশোধের তাগিদ', ?, ?, ?, 'DUE_REMINDER')`
      )
      .bind(st.student_id, message, due, options.sentBy || null)
      .run();

    notifiedStudents++;
  }

  return { notifiedStudents, totalOutstanding };
}

/**
 * -------------------------------------------------------------
 * 5. GET STUDENT DUE BREAKDOWN & SUMMARY
 * -------------------------------------------------------------
 */
export async function getStudentFeeSummary(
  db: D1Database,
  studentId: number
): Promise<{
  totalDue: number;
  totalPaid: number;
  totalOriginal: number;
  pendingItems: FeeItemRow[];
  paidItems: FeeItemRow[];
  payments: FeePaymentRow[];
  notifications: any[];
}> {
  const items = (
    await db
      .prepare(
        `SELECT fi.*, s.name as student_name, s.roll as student_roll, c.name as class_name
         FROM fee_items fi
         JOIN students s ON s.id = fi.student_id
         JOIN classes c ON c.id = s.class_id
         WHERE fi.student_id = ?
         ORDER BY fi.created_at DESC`
      )
      .bind(studentId)
      .all<FeeItemRow>()
  ).results || [];

  const payments = (
    await db
      .prepare(
        `SELECT fp.*, s.name as student_name, s.roll as student_roll, c.name as class_name
         FROM fee_payments fp
         JOIN students s ON s.id = fp.student_id
         JOIN classes c ON c.id = s.class_id
         WHERE fp.student_id = ?
         ORDER BY fp.payment_date DESC`
      )
      .bind(studentId)
      .all<FeePaymentRow>()
  ).results || [];

  const notifications = (
    await db
      .prepare(
        `SELECT * FROM fee_notifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 15`
      )
      .bind(studentId)
      .all<any>()
  ).results || [];

  let totalDue = 0;
  let totalPaid = 0;
  let totalOriginal = 0;

  const pendingItems: FeeItemRow[] = [];
  const paidItems: FeeItemRow[] = [];

  for (const it of items) {
    totalDue += Number(it.due_amount) || 0;
    totalPaid += Number(it.paid_amount) || 0;
    totalOriginal += Number(it.amount) || 0;

    if (it.status === "PAID") {
      paidItems.push(it);
    } else {
      pendingItems.push(it);
    }
  }

  return {
    totalDue,
    totalPaid,
    totalOriginal,
    pendingItems,
    paidItems,
    payments,
    notifications,
  };
}
