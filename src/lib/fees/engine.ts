// src/lib/fees/engine.ts
// Complete Fees, Automated Absent & Fail Fines, Billing & Notification Engine

import type { D1Database } from "@/lib/db/types";
import { MONTHS_BN, bn, currentMonthDhaka, currentYearDhaka, todayISODateDhaka } from "@/lib/constants";
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
  photo_key?: string | null;
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
  // Dynamic evaluation fields
  is_overdue?: boolean;
  is_current?: boolean;
  due_status_label?: string;
  badge_class?: string;
  type_label?: string;
}

export interface FeeItemDueStatus {
  isOverdue: boolean;
  isCurrent: boolean;
  isPaid: boolean;
  statusLabel: string;
  badgeClass: string;
  typeLabel: string; // "বর্তমান মাসের বেতন" | "চলতি ফি" | "বকেয়া" | "পরিশোধিত"
  deadlineText: string;
}

/**
 * Evaluates whether an unpaid fee item is 'Current Month Fee / চলতি ফি'
 * or 'Overdue / বকেয়া'.
 */
export function evaluateFeeDueStatus(item: {
  status: string;
  category?: string;
  due_date?: string | null;
  month?: number | null;
  year?: number | null;
  created_at?: string;
}): FeeItemDueStatus {
  if (item.status === "PAID") {
    return {
      isOverdue: false,
      isCurrent: false,
      isPaid: true,
      statusLabel: "পরিশোধিত",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      typeLabel: "পরিশোধিত",
      deadlineText: "পরিশোধ সম্পন্ন",
    };
  }

  const currentYear = currentYearDhaka();
  const currentMonth = currentMonthDhaka();
  const todayStr = todayISODateDhaka();
  const itemMonthName = item.month && MONTHS_BN[item.month - 1] ? MONTHS_BN[item.month - 1] : null;
  const curMonthName = MONTHS_BN[currentMonth - 1] || "অক্টোবর";

  let isOverdue = false;
  let isFutureMonth = false;
  let deadlineText = "অফিস সময়ে";

  if (item.year && item.month) {
    if (item.year > currentYear || (item.year === currentYear && item.month > currentMonth)) {
      isFutureMonth = true;
    }
  }

  if (item.due_date && item.due_date.trim()) {
    const cleanDueDate = item.due_date.trim().split("T")[0];
    isOverdue = cleanDueDate < todayStr;
    deadlineText = isOverdue ? `মেয়াদ শেষ (${cleanDueDate})` : `শেষ তারিখ: ${cleanDueDate}`;
  } else if (item.year && item.month) {
    if (item.year < currentYear) {
      isOverdue = true;
      deadlineText = `পূর্ববর্তী মাস (${itemMonthName || item.month}/${bn(item.year)})`;
    } else if (item.year === currentYear) {
      if (item.month < currentMonth) {
        isOverdue = true;
        deadlineText = `পূর্ববর্তী মাস (${itemMonthName || item.month}/${bn(item.year)})`;
      } else if (item.month === currentMonth) {
        isOverdue = false;
        deadlineText = `চলতি মাস (${curMonthName})`;
      } else {
        isOverdue = false;
        deadlineText = `অগ্রিম মাস (${itemMonthName || item.month})`;
      }
    } else {
      isOverdue = false;
      deadlineText = "ভবিষ্যৎ শিক্ষাবর্ষ";
    }
  }

  const isCurrent = !isOverdue && !isFutureMonth;
  const isMonthly = item.category === "MONTHLY_FEE";

  const resolvedMonthlyLabel = isFutureMonth
    ? `অগ্রিম মাস (${itemMonthName || ""})`
    : item.month && item.month !== currentMonth
    ? `${itemMonthName} মাসের বেতন`
    : `চলতি মাসের বেতন (${curMonthName})`;

  if (item.status === "PARTIAL") {
    if (isOverdue) {
      return {
        isOverdue: true,
        isCurrent: false,
        isPaid: false,
        statusLabel: "আংশিক বকেয়া (মেয়াদোত্তীর্ণ)",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        typeLabel: "বকেয়া",
        deadlineText,
      };
    }
    return {
      isOverdue: false,
      isCurrent,
      isPaid: false,
      statusLabel: isMonthly ? `আংশিক পরিশোধিত (${resolvedMonthlyLabel})` : "আংশিক পরিশোধিত (চলতি ফি)",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      typeLabel: isMonthly ? resolvedMonthlyLabel : "চলতি ফি",
      deadlineText,
    };
  }

  // PENDING status
  if (isOverdue) {
    return {
      isOverdue: true,
      isCurrent: false,
      isPaid: false,
      statusLabel: "বকেয়া",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
      typeLabel: "বকেয়া",
      deadlineText,
    };
  }

  return {
    isOverdue: false,
    isCurrent,
    isPaid: false,
    statusLabel: isMonthly ? resolvedMonthlyLabel : "চলতি ফি (নির্ধারিত সময়ের মধ্যে)",
    badgeClass: isMonthly
      ? "bg-sky-100 text-sky-800 border-sky-200"
      : "bg-indigo-100 text-indigo-800 border-indigo-200",
    typeLabel: isMonthly ? resolvedMonthlyLabel : "চলতি ফি",
    deadlineText,
  };
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
      s.is_fourth_subject as subject_is_fourth,
      st.name as student_name,
      st.roll as student_roll,
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

  // Track per-student per-subject monthly aggregation for Option 1 subject-level FAIL_FINE (50৳)
  const subjectMonthlyMap = new Map<
    string,
    {
      student_id: number;
      subject_id: number;
      subject_name: string;
      is4th: boolean;
      month: number | null;
      year: number | null;
      total_marks: number;
      obtained_marks: number;
      latest_exam_id: number;
      exam_label: string;
    }
  >();

  for (const row of rows) {
    const isAbsent = row.attendance === "ABSENT";
    const monthNameBn = row.month && MONTHS_BN[row.month - 1] ? MONTHS_BN[row.month - 1] : "";
    const examLabel = row.exam_title || `${monthNameBn} ${row.year || ""} পরীক্ষা`;

    if (isAbsent) {
      // 1. ABSENT FINE: 20 Taka per absent exam
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
    }

    // Aggregate marks per (student, subject, month, year) for subject-level FAIL_FINE check
    const key = `${row.student_id}:${row.subject_id}:${row.month || 0}:${row.year || 0}`;
    const totalMarks = Number(row.total_marks) || 0;
    const obtained = isAbsent ? 0 : (Number(row.obtained_marks) || 0);
    const is4th = Number(row.subject_is_fourth) === 1;

    const prev = subjectMonthlyMap.get(key);
    if (!prev) {
      subjectMonthlyMap.set(key, {
        student_id: row.student_id,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        is4th,
        month: row.month || null,
        year: row.year || null,
        total_marks: totalMarks,
        obtained_marks: obtained,
        latest_exam_id: row.exam_id,
        exam_label: `${monthNameBn} ${row.year || ""}`.trim() || examLabel,
      });
    } else {
      prev.total_marks += totalMarks;
      prev.obtained_marks += obtained;
    }
  }

  // 2. Subject-level FAIL_FINE (50 Taka) — if overall subject grade in the month is F (and compulsory),
  // regardless of whether the student failed by low marks or by absence (A1 -> 0 marks -> F).
  for (const agg of subjectMonthlyMap.values()) {
    if (agg.is4th || agg.total_marks <= 0) continue;
    const pct = calculatePercentage(agg.obtained_marks, agg.total_marks);
    const grade = calculateGrade(pct).grade;

    if (grade === "F") {
      const existing = await db
        .prepare(
          `SELECT id FROM fee_items
           WHERE student_id = ? AND subject_id = ? AND category = 'FAIL_FINE'
             AND (month = ? OR (month IS NULL AND ? IS NULL))
             AND (year = ? OR (year IS NULL AND ? IS NULL))`
        )
        .bind(agg.student_id, agg.subject_id, agg.month, agg.month, agg.year, agg.year)
        .first<{ id: number }>()
        .catch(() => null);

      if (existing) {
        skippedExisting++;
      } else {
        const title = `${agg.exam_label} — ${agg.subject_name} ফেল জরিমানা`;
        const refNote = `অটো-জেনারেটেড: ${agg.subject_name} বিষয়ে ফেল (প্রাপ্ত: ${agg.obtained_marks}/${agg.total_marks}, গ্রেড F) হিসেবে ৫০৳ জরিমানা`;
        await db
          .prepare(
            `INSERT INTO fee_items (
              student_id, category, title, amount, paid_amount, due_amount,
              month, year, exam_id, subject_id, reference_note, status, created_by
            ) VALUES (?, 'FAIL_FINE', ?, 50, 0, 50, ?, ?, ?, ?, ?, 'PENDING', ?)`
          )
          .bind(
            agg.student_id,
            title,
            agg.month,
            agg.year,
            agg.latest_exam_id,
            agg.subject_id,
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
 * 2. BULK FEE ASSIGNMENT (ALL STUDENTS IN CLASS/BATCH)
 * -------------------------------------------------------------
 * Assigns fee (monthly tuition, exam fee, notes, etc.) to all students
 * in a selected class or batch with one click.
 */
export async function assignBulkFees(
  db: D1Database,
  params: {
    classId?: number;
    batchId?: number;
    category: FeeCategory;
    title: string;
    amount: number;
    month?: number | null;
    year?: number | null;
    dueDate?: string | null;
    referenceNote?: string | null;
    createdBy?: number | null;
  }
): Promise<{
  generatedCount: number;
  skippedCount: number;
  totalAmount: number;
  studentsCount: number;
}> {
  let studentSql = `
    SELECT s.id, s.name, s.roll, c.name as class_name, b.name as batch_name
    FROM students s
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN batches b ON b.id = s.batch_id
    WHERE c.is_active = 1
  `;
  const sqlParams: unknown[] = [];

  if (params.classId) {
    studentSql += ` AND s.class_id = ?`;
    sqlParams.push(params.classId);
  }
  if (params.batchId) {
    studentSql += ` AND s.batch_id = ?`;
    sqlParams.push(params.batchId);
  }

  studentSql += ` ORDER BY s.class_id ASC, s.roll ASC`;

  const students = (await db.prepare(studentSql).bind(...sqlParams).all<any>()).results || [];

  let generatedCount = 0;
  let skippedCount = 0;

  for (const st of students) {
    // Check duplicate
    let checkSql = `SELECT id FROM fee_items WHERE student_id = ? AND category = ?`;
    const checkParams: unknown[] = [st.id, params.category];

    if (params.category === "MONTHLY_FEE" && params.month && params.year) {
      checkSql += ` AND month = ? AND year = ?`;
      checkParams.push(params.month, params.year);
    } else {
      checkSql += ` AND title = ?`;
      checkParams.push(params.title.trim());
      if (params.month && params.year) {
        checkSql += ` AND month = ? AND year = ?`;
        checkParams.push(params.month, params.year);
      }
    }

    const existing = await db
      .prepare(checkSql)
      .bind(...checkParams)
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
          month, year, due_date, reference_note, status, created_by
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'PENDING', ?)`
      )
      .bind(
        st.id,
        params.category,
        params.title.trim(),
        params.amount,
        params.amount,
        params.month || null,
        params.year || null,
        params.dueDate || null,
        params.referenceNote?.trim() || null,
        params.createdBy || null
      )
      .run();

    generatedCount++;
  }

  return {
    generatedCount,
    skippedCount,
    totalAmount: generatedCount * params.amount,
    studentsCount: students.length,
  };
}

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
): Promise<{ generatedCount: number; skippedCount: number; totalAmount: number; studentsCount?: number }> {
  const monthNameBn = MONTHS_BN[params.month - 1] || `মাস ${params.month}`;
  const defaultTitle = params.customTitle || `${monthNameBn} ${params.year} — মাসিক টিউশন ফি`;

  return assignBulkFees(db, {
    classId: params.classId,
    batchId: params.batchId,
    category: "MONTHLY_FEE",
    title: defaultTitle,
    amount: params.amount,
    month: params.month,
    year: params.year,
    dueDate: params.dueDate,
    createdBy: params.createdBy,
  });
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
    feeItemIds?: number[] | null;
    amountPaid: number;
    discount?: number;
    paymentMethod?: string;
    transactionId?: string | null;
    receiptNote?: string | null;
    collectedBy?: number | null;
    collectorName?: string | null;
    isAdvance?: boolean;
    advancePurpose?: string | null;
    advanceMonth?: number | null;
    advanceYear?: number | null;
  }
): Promise<{ invoiceNo: string; paidAmount: number; discount: number; paymentId: number; feeItemId?: number; isAdvance?: boolean; advanceSurplus?: number }> {
  const discount = Math.max(0, Number(params.discount) || 0);
  let amountPaid = Math.max(0, Number(params.amountPaid) || 0);

  const invoiceNo = `BP-REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  let linkedFeeItemId = params.feeItemId || null;
  let surplusRemaining = 0;

  // 1. If explicit advance deposit or extra payment
  if (params.isAdvance) {
    const totalCovered = amountPaid;
    if (totalCovered <= 0) {
      throw new Error("অগ্রিম জমার টাকার পরিমাণ ০-এর বেশি হতে হবে।");
    }
    const purpose = params.advancePurpose?.trim() || "অগ্রিম / অতিরিক্ত জমা";
    const currentMonth = params.advanceMonth || currentMonthDhaka();
    const currentYear = params.advanceYear || currentYearDhaka();
    const itemTitle = `অগ্রিম জমা: ${purpose}`;

    const insertItemRes = await db
      .prepare(
        `INSERT INTO fee_items (
          student_id, category, title, amount, paid_amount, due_amount,
          month, year, status, reference_note, created_by
        ) VALUES (?, 'OTHER_FEE', ?, ?, ?, 0, ?, ?, 'PAID', ?, ?)`
      )
      .bind(
        params.studentId,
        itemTitle,
        totalCovered,
        totalCovered,
        currentMonth,
        currentYear,
        `ADVANCE_DEPOSIT - মানি রিসিট: ${invoiceNo}`,
        params.collectedBy || null
      )
      .run();

    const createdItemId = Number((insertItemRes as any)?.meta?.last_row_id || 0);
    linkedFeeItemId = createdItemId;
  } else if (params.feeItemIds && params.feeItemIds.length > 0) {
    // 2a. Multi-item selected fee dues settlement (All selected fees in one receipt)
    const placeholders = params.feeItemIds.map(() => "?").join(",");
    const targetItems = (
      await db
        .prepare(
          `SELECT id, amount, paid_amount, due_amount, reference_note FROM fee_items WHERE id IN (${placeholders}) AND student_id = ? ORDER BY created_at ASC`
        )
        .bind(...params.feeItemIds, params.studentId)
        .all<{ id: number; amount: number; paid_amount: number; due_amount: number; reference_note: string | null }>()
    ).results || [];

    const totalTargetDue = targetItems.reduce((acc, it) => acc + Number(it.due_amount || 0), 0);

    // If user passed original total due as amountPaid while giving discount, normalize amountPaid to net cash
    if (discount > 0) {
      const netCashExpected = Math.max(0, totalTargetDue - discount);
      if (amountPaid >= totalTargetDue || (amountPaid + discount >= totalTargetDue && amountPaid > netCashExpected)) {
        amountPaid = netCashExpected;
      }
    }

    const totalCovered = amountPaid + discount;
    if (totalCovered <= 0) {
      throw new Error("পরিশোধিত টাকা অথবা ছাড়ের পরিমাণ ০-এর বেশি হতে হবে।");
    }

    let cashRemaining = amountPaid;
    let discRemaining = discount;

    for (const item of targetItems) {
      if (cashRemaining <= 0 && discRemaining <= 0) break;
      const itemDue = Math.max(0, Number(item.due_amount) || 0);
      if (itemDue <= 0) continue;

      const discAlloc = Math.min(itemDue, discRemaining);
      const cashAlloc = Math.min(Math.max(0, itemDue - discAlloc), cashRemaining);
      if (discAlloc <= 0 && cashAlloc <= 0) continue;

      // CRITICAL: paid_amount ONLY increases by actual cash deposited (cashAlloc), NEVER by discount!
      // due_amount decreases by BOTH cashAlloc and discAlloc!
      const newPaid = (Number(item.paid_amount) || 0) + cashAlloc;
      const newDue = Math.max(0, itemDue - cashAlloc - discAlloc);
      const newStatus = newDue === 0 ? "PAID" : "PARTIAL";
      const discText = discAlloc > 0
        ? ` [${bn(cashAlloc)} ৳ জমার সময় ${bn(discAlloc)} ৳ ছাড় দেওয়া হয়েছিল]`
        : "";

      const updatedRefNote = item.reference_note
        ? (discText && !item.reference_note.includes(discText.trim()) ? `${item.reference_note}${discText}` : item.reference_note)
        : (discText ? discText.trim() : null);

      await db
        .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, reference_note = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newPaid, newDue, newStatus, updatedRefNote, item.id)
        .run();

      if (!linkedFeeItemId) {
        linkedFeeItemId = item.id;
      }
      discRemaining = Math.max(0, discRemaining - discAlloc);
      cashRemaining = Math.max(0, cashRemaining - cashAlloc);
    }

    // Surplus can ONLY be genuine cash paid above (totalTargetDue - discount), discount alone must NEVER create surplus!
    const cashSurplus = discount > 0 ? 0 : Math.max(0, cashRemaining);
    surplusRemaining = cashSurplus;

    if (cashSurplus > 0) {
      const currentMonth = currentMonthDhaka();
      const currentYear = currentYearDhaka();
      const insertItemRes = await db
        .prepare(
          `INSERT INTO fee_items (
            student_id, category, title, amount, paid_amount, due_amount,
            month, year, status, reference_note, created_by
          ) VALUES (?, 'OTHER_FEE', ?, ?, ?, 0, ?, ?, 'PAID', ?, ?)`
        )
        .bind(
          params.studentId,
          params.receiptNote ? `অতিরিক্ত / অগ্রিম জমা (${params.receiptNote})` : "অতিরিক্ত / অগ্রিম জমা (উদ্বৃত্ত)",
          cashSurplus,
          cashSurplus,
          currentMonth,
          currentYear,
          `ADVANCE_SURPLUS - মানি রিসিট: ${invoiceNo}`,
          params.collectedBy || null
        )
        .run();

      const createdItemId = Number((insertItemRes as any)?.meta?.last_row_id || 0);
      if (!linkedFeeItemId && createdItemId) {
        linkedFeeItemId = createdItemId;
      }
    }
  } else if (params.feeItemId) {
    // 2b. Specific fee item due settlement
    const item = await db
      .prepare(`SELECT id, amount, paid_amount, due_amount, reference_note FROM fee_items WHERE id = ? AND student_id = ?`)
      .bind(params.feeItemId, params.studentId)
      .first<{ id: number; amount: number; paid_amount: number; due_amount: number; reference_note: string | null }>()
      .catch(() => null);

    if (item) {
      const itemDue = Math.max(0, Number(item.due_amount) || 0);
      if (discount > 0) {
        const netCashExpected = Math.max(0, itemDue - discount);
        if (amountPaid >= itemDue || (amountPaid + discount >= itemDue && amountPaid > netCashExpected)) {
          amountPaid = netCashExpected;
        }
      }
      const totalCovered = amountPaid + discount;
      if (totalCovered <= 0) {
        throw new Error("পরিশোধিত টাকা অথবা ছাড়ের পরিমাণ ০-এর বেশি হতে হবে।");
      }
      const discAlloc = Math.min(itemDue, discount);
      const cashAlloc = Math.min(Math.max(0, itemDue - discAlloc), amountPaid);
      const newPaid = (Number(item.paid_amount) || 0) + cashAlloc;
      const newDue = Math.max(0, itemDue - cashAlloc - discAlloc);
      const newStatus = newDue === 0 ? "PAID" : "PARTIAL";
      const discText = discAlloc > 0
        ? ` [${bn(cashAlloc)} ৳ জমার সময় ${bn(discAlloc)} ৳ ছাড় দেওয়া হয়েছিল]`
        : "";
      const updatedRefNote = item.reference_note
        ? (discText && !item.reference_note.includes(discText.trim()) ? `${item.reference_note}${discText}` : item.reference_note)
        : (discText ? discText.trim() : null);

      await db
        .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, reference_note = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newPaid, newDue, newStatus, updatedRefNote, item.id)
        .run();

      const netCashNeeded = Math.max(0, itemDue - discount);
      surplusRemaining = discount > 0 ? 0 : Math.max(0, amountPaid - netCashNeeded);
    }
  } else {
    // 3. Auto-allocate across oldest pending fee items
    const pendingItems = (
      await db
        .prepare(
          `SELECT id, amount, paid_amount, due_amount, reference_note FROM fee_items WHERE student_id = ? AND status IN ('PENDING', 'PARTIAL') ORDER BY created_at ASC`
        )
        .bind(params.studentId)
        .all<{ id: number; amount: number; paid_amount: number; due_amount: number; reference_note: string | null }>()
    ).results || [];

    const totalTargetDue = pendingItems.reduce((acc, it) => acc + Number(it.due_amount || 0), 0);
    if (discount > 0) {
      const netCashExpected = Math.max(0, totalTargetDue - discount);
      if (amountPaid >= totalTargetDue || (amountPaid + discount >= totalTargetDue && amountPaid > netCashExpected)) {
        amountPaid = netCashExpected;
      }
    }
    const totalCovered = amountPaid + discount;
    if (totalCovered <= 0) {
      throw new Error("পরিশোধিত টাকা অথবা ছাড়ের পরিমাণ ০-এর বেশি হতে হবে।");
    }

    let cashRemaining = amountPaid;
    let discRemaining = discount;

    for (const item of pendingItems) {
      if (cashRemaining <= 0 && discRemaining <= 0) break;
      const itemDue = Math.max(0, Number(item.due_amount) || 0);
      if (itemDue <= 0) continue;

      const discAlloc = Math.min(itemDue, discRemaining);
      const cashAlloc = Math.min(Math.max(0, itemDue - discAlloc), cashRemaining);
      if (discAlloc <= 0 && cashAlloc <= 0) continue;

      const newPaid = (Number(item.paid_amount) || 0) + cashAlloc;
      const newDue = Math.max(0, itemDue - cashAlloc - discAlloc);
      const newStatus = newDue === 0 ? "PAID" : "PARTIAL";
      const discText = discAlloc > 0
        ? ` [${bn(cashAlloc)} ৳ জমার সময় ${bn(discAlloc)} ৳ ছাড় দেওয়া হয়েছিল]`
        : "";
      const updatedRefNote = item.reference_note
        ? (discText && !item.reference_note.includes(discText.trim()) ? `${item.reference_note}${discText}` : item.reference_note)
        : (discText ? discText.trim() : null);

      await db
        .prepare(`UPDATE fee_items SET paid_amount = ?, due_amount = ?, status = ?, reference_note = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(newPaid, newDue, newStatus, updatedRefNote, item.id)
        .run();

      if (!linkedFeeItemId) {
        linkedFeeItemId = item.id;
      }
      discRemaining = Math.max(0, discRemaining - discAlloc);
      cashRemaining = Math.max(0, cashRemaining - cashAlloc);
    }

    const cashSurplus = discount > 0 ? 0 : Math.max(0, cashRemaining);
    surplusRemaining = cashSurplus;

    if (cashSurplus > 0) {
      const currentMonth = currentMonthDhaka();
      const currentYear = currentYearDhaka();
      const insertItemRes = await db
        .prepare(
          `INSERT INTO fee_items (
            student_id, category, title, amount, paid_amount, due_amount,
            month, year, status, reference_note, created_by
          ) VALUES (?, 'OTHER_FEE', ?, ?, ?, 0, ?, ?, 'PAID', ?, ?)`
        )
        .bind(
          params.studentId,
          params.receiptNote ? `অতিরিক্ত / অগ্রিম জমা (${params.receiptNote})` : "অতিরিক্ত / অগ্রিম জমা (উদ্বৃত্ত)",
          cashSurplus,
          cashSurplus,
          currentMonth,
          currentYear,
          `ADVANCE_SURPLUS - মানি রিসিট: ${invoiceNo}`,
          params.collectedBy || null
        )
        .run();

      const createdItemId = Number((insertItemRes as any)?.meta?.last_row_id || 0);
      if (!linkedFeeItemId && createdItemId) {
        linkedFeeItemId = createdItemId;
      }
    }
  }

  // Record payment in ledger with clear discount audit note
  const discountAuditNote = discount > 0 ? `${bn(amountPaid)} ৳ জমার সময় ${bn(discount)} ৳ ছাড় দেওয়া হয়েছিল` : "";
  const finalReceiptNote = params.isAdvance
    ? (params.receiptNote ? `[অগ্রিম জমা] ${params.advancePurpose || 'অগ্রিম ফি'} - ${params.receiptNote}` : `[অগ্রিম জমা] ${params.advancePurpose || 'অগ্রিম ফি'}`)
    : (params.receiptNote && params.receiptNote.trim()
        ? (discount > 0 && !params.receiptNote.includes("ছাড়") ? `${params.receiptNote.trim()} (${discountAuditNote})` : params.receiptNote.trim())
        : (discountAuditNote || null));

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
      linkedFeeItemId,
      amountPaid,
      discount,
      params.paymentMethod || "CASH",
      params.transactionId || null,
      finalReceiptNote,
      params.collectedBy || null,
      params.collectorName || "অ্যাডমিন"
    )
    .run();

  const paymentId = Number((res as any)?.meta?.last_row_id || 0);

  // Auto-send payment receipt alert to student
  const student = await db.prepare(`SELECT name FROM students WHERE id = ?`).bind(params.studentId).first<{ name: string }>().catch(() => null);
  let notifMsg: string;
  if (params.isAdvance) {
    notifMsg = `সম্মানিত ${student?.name || "শিক্ষার্থী"}, আপনার ${bn(amountPaid)} ৳ অগ্রিম / অতিরিক্ত জমা সফলভাবে গৃহীত হয়েছে (রসিদ নং: ${invoiceNo})। এই টাকা আপনার হিসেবে সংরক্ষিত থাকবে। ধন্যবাদ।`;
  } else if (surplusRemaining > 0) {
    notifMsg = `সম্মানিত ${student?.name || "শিক্ষার্থী"}, আপনার বকেয়া পরিশোধ হয়েছে এবং অতিরিক্ত ${bn(surplusRemaining)} ৳ অগ্রিম জমা হিসেবে অ্যাকাউন্টে সংরক্ষিত রইল (রসিদ নং: ${invoiceNo})। নগদ জমা: ${bn(amountPaid)} ৳${discount > 0 ? `, বিশেষ ছাড়: ${bn(discount)} ৳` : ""}। ধন্যবাদ।`;
  } else {
    notifMsg = `সম্মানিত ${student?.name || "শিক্ষার্থী"}, আপনার ${bn(amountPaid)} ৳ পেমেন্ট সফলভাবে জমা হয়েছে${discount > 0 ? ` (${bn(amountPaid)} ৳ জমার সময় ${bn(discount)} ৳ ছাড় দেওয়া হয়েছিল)` : ""} (রসিদ নং: ${invoiceNo})। ধন্যবাদ।`;
  }

  await db
    .prepare(
      `INSERT INTO fee_notifications (student_id, title, message, total_due, sent_by, type)
       VALUES (?, 'পেমেন্ট রসিদ নিশ্চিতকরণ', ?, 0, ?, 'RECEIPT_ALERT')`
    )
    .bind(
      params.studentId,
      notifMsg,
      params.collectedBy || null
    )
    .run()
    .catch(() => null);

  return {
    invoiceNo,
    paidAmount: amountPaid,
    discount,
    paymentId,
    feeItemId: linkedFeeItemId || undefined,
    isAdvance: Boolean(params.isAdvance),
    advanceSurplus: surplusRemaining > 0 ? surplusRemaining : 0,
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
    WHERE fi.status IN ('PENDING', 'PARTIAL') AND fi.due_amount > 0 AND c.is_active = 1
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

    // Check if student has overdue items vs current unexpired items
    const studentItems = (
      await db
        .prepare(`SELECT * FROM fee_items WHERE student_id = ? AND status IN ('PENDING', 'PARTIAL') AND due_amount > 0`)
        .bind(st.student_id)
        .all<any>()
    ).results || [];

    const hasOverdue = studentItems.some((it: any) => evaluateFeeDueStatus(it).isOverdue);

    const title = hasOverdue ? "মেয়াদোত্তীর্ণ বকেয়া ফি পরিশোধের তাগিদ" : "বর্তমান মাসের বেতন পরিশোধের স্মারক";

    const defaultMsg = hasOverdue
      ? `সম্মানিত ${st.student_name}, আপনার নির্ধারিত সময় পার হওয়া বকেয়া বাবদ সর্বমোট ${bn(due)} ৳ রয়েছে (${bn(st.due_count)}টি আইটেম)। অনুগ্রহ করে দ্রুত অফিসে বা অনলাইনে পরিশোধ করুন।`
      : `সম্মানিত ${st.student_name}, আপনার বর্তমান মাসের বেতন/চলতি ফি বাবদ ${bn(due)} ৳ প্রদেয় রয়েছে। অনুগ্রহ করে নির্ধারিত শেষ তারিখের মধ্যে অফিসে বা অনলাইনে পরিশোধ করুন।`;

    const message = options.customMessage || defaultMsg;

    await db
      .prepare(
        `INSERT INTO fee_notifications (student_id, title, message, total_due, sent_by, type)
         VALUES (?, ?, ?, ?, ?, 'DUE_REMINDER')`
      )
      .bind(st.student_id, title, message, due, options.sentBy || null)
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
export interface MonthFeeSummary {
  month: number;
  year: number;
  monthName: string;
  totalCharged: number;
  totalPaid: number;
  totalDiscount: number;
  totalDue: number;
  isCurrentMonth: boolean;
  isFutureMonth?: boolean;
  isOverdue: boolean;
  dueDate: string | null;
  statusLabel: string;
  items: FeeItemRow[];
}

export async function getStudentFeeSummary(
  db: D1Database,
  studentId: number
): Promise<{
  totalDue: number;
  overdueDue: number;
  currentMonthDue: number;
  currentOtherDue: number;
  previousMonthsDue: number;
  totalCurrentPayable: number;
  totalPaid: number;
  totalDiscount: number;
  totalOriginal: number;
  pendingItems: FeeItemRow[];
  paidItems: FeeItemRow[];
  payments: FeePaymentRow[];
  notifications: any[];
  monthlyBreakdown: MonthFeeSummary[];
}> {
  const items = (
    await db
      .prepare(
        `SELECT fi.*, s.name as student_name, s.roll as student_roll, s.photo_key, c.name as class_name
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
        `SELECT fp.*, s.name as student_name, s.roll as student_roll, s.photo_key, c.name as class_name
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

  const currentYear = currentYearDhaka();
  const currentMonth = currentMonthDhaka();

  let totalDue = 0;
  let overdueDue = 0;
  let currentMonthDue = 0;
  let currentOtherDue = 0;
  let totalPaid = 0;
  let totalOriginal = 0;

  const pendingItems: FeeItemRow[] = [];
  const paidItems: FeeItemRow[] = [];

  for (const it of items) {
    const dueAmt = Number(it.due_amount) || 0;
    const paidAmt = Number(it.paid_amount) || 0;
    const origAmt = Number(it.amount) || 0;

    totalDue += dueAmt;
    totalPaid += paidAmt;
    totalOriginal += origAmt;

    const evaluation = evaluateFeeDueStatus(it);

    if (it.status === "PAID") {
      paidItems.push({
        ...it,
        is_overdue: false,
        is_current: false,
        due_status_label: "পরিশোধিত",
        badge_class: evaluation.badgeClass,
        type_label: "পরিশোধিত",
      });
    } else {
      if (evaluation.isOverdue) {
        overdueDue += dueAmt;
      } else {
        if (it.category === "MONTHLY_FEE") {
          currentMonthDue += dueAmt;
        } else {
          currentOtherDue += dueAmt;
        }
      }

      pendingItems.push({
        ...it,
        is_overdue: evaluation.isOverdue,
        is_current: evaluation.isCurrent,
        due_status_label: evaluation.statusLabel,
        badge_class: evaluation.badgeClass,
        type_label: evaluation.typeLabel,
      });
    }
  }

  // Ensure totalPaid accounts for all recorded cash payments (never inflated by discounts)
  const paymentsTotal = payments.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);
  const totalDiscount = payments.reduce((acc, p) => acc + (Number(p.discount) || 0), 0);
  if (paymentsTotal > 0) {
    totalPaid = paymentsTotal;
  }
  if (totalPaid + totalDiscount + totalDue > totalOriginal) {
    totalOriginal = totalPaid + totalDiscount + totalDue;
  }

  let previousMonthsDue = 0;

  // Monthly breakdown map keyed by `${year}-${month}`
  const monthMap = new Map<string, MonthFeeSummary>();
  const allEnrichedItems = [...pendingItems, ...paidItems];

  for (const it of allEnrichedItems) {
    let y = it.year;
    let m = it.month;
    if (!y || !m) {
      if (it.created_at) {
        const d = new Date(it.created_at);
        y = d.getFullYear();
        m = d.getMonth() + 1;
      } else {
        y = currentYear;
        m = currentMonth;
      }
    }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const mName = `${MONTHS_BN[m - 1] || `মাস ${m}`} ${bn(y)}`;
    const isCur = y === currentYear && m === currentMonth;
    const isFuture = y > currentYear || (y === currentYear && m > currentMonth);

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: m,
        year: y,
        monthName: mName,
        totalCharged: 0,
        totalPaid: 0,
        totalDiscount: 0,
        totalDue: 0,
        isCurrentMonth: isCur,
        isFutureMonth: isFuture,
        isOverdue: false,
        dueDate: it.due_date || null,
        statusLabel: "পরিশোধিত",
        items: [],
      });
    }

    const entry = monthMap.get(key)!;
    const itemCharged = Number(it.amount) || 0;
    const itemPaid = Number(it.paid_amount) || 0;
    const itemDue = Number(it.due_amount) || 0;
    const itemImplicitDiscount = Math.max(0, itemCharged - itemPaid - itemDue);
    entry.totalCharged += itemCharged;
    entry.totalPaid += itemPaid;
    entry.totalDiscount += itemImplicitDiscount;
    entry.totalDue += itemDue;
    if (it.due_date && !entry.dueDate) {
      entry.dueDate = it.due_date;
    }
    if (it.is_overdue) {
      entry.isOverdue = true;
    }
    entry.items.push(it);
  }

  // Resolve status labels and sort months descending
  const monthlyBreakdown = Array.from(monthMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .map((mb) => {
      if (mb.totalDue <= 0) {
        mb.statusLabel = "পরিশোধিত";
      } else if (mb.isOverdue) {
        mb.statusLabel = "বকেয়া (মেয়াদোত্তীর্ণ)";
      } else if (mb.isFutureMonth) {
        mb.statusLabel = `${MONTHS_BN[mb.month - 1] || ""} মাসের অগ্রিম ফি (নির্ধারিত সময়ের মধ্যে)`;
      } else {
        mb.statusLabel = "চলতি (জমার সময় বাকি)";
      }
      return mb;
    });

  for (const mb of monthlyBreakdown) {
    const isPast = mb.year < currentYear || (mb.year === currentYear && mb.month < currentMonth) || mb.isOverdue;
    if (isPast) {
      previousMonthsDue += mb.totalDue;
    }
  }

  return {
    totalDue,
    overdueDue,
    currentMonthDue,
    currentOtherDue,
    previousMonthsDue,
    totalCurrentPayable: currentMonthDue + currentOtherDue,
    totalPaid,
    totalDiscount,
    totalOriginal,
    pendingItems,
    paidItems,
    payments,
    notifications,
    monthlyBreakdown,
  };
}
