// src/lib/holiday-utils.ts — Pure utilities for class holiday matching & Bangla formatting

import { bn, classLabel, divisionLabel, MONTHS_BN } from "@/lib/constants";

export interface ClassHoliday {
  id: number;
  class_name: string; // 'ALL' or exact class name (e.g. '8', '10', 'Exam Batch')
  division: string | null; // null | 'SCIENCE' | 'HUMANITIES'
  batch_id: number | null;
  batch_name: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  created_by?: number | null;
  created_by_name?: string | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayTarget {
  className?: string | null;
  division?: string | null;
  batchId?: number | null;
  batchName?: string | null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates that a string is a real YYYY-MM-DD calendar date. */
export function isValidIsoDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || !ISO_DATE_RE.test(dateStr.trim())) return false;
  const [yStr, mStr, dStr] = dateStr.trim().split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Shifts a YYYY-MM-DD date string by `deltaDays` using pure UTC calendar math. */
export function addDaysToIsoDate(dateStr: string, deltaDays: number): string {
  if (!isValidIsoDate(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = String(dt.getUTCFullYear()).padStart(4, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Maps a weekday `targetDayOfWeek` (0=Sun..6=Sat) to today or the next
 * upcoming date within the 7-day window starting from `todayDateStr`.
 */
export function getUpcomingDateForDayOfWeek(
  todayDateStr: string,
  todayDayOfWeek: number,
  targetDayOfWeek: number
): string {
  const delta = (((targetDayOfWeek - todayDayOfWeek) % 7) + 7) % 7;
  return addDaysToIsoDate(todayDateStr, delta);
}

/** Inclusive check: startDate <= dateStr <= endDate (YYYY-MM-DD strings). */
export function isDateInRange(
  dateStr: string,
  startDate: string,
  endDate: string
): boolean {
  if (!dateStr || !startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

function normalizeOptionalDiv(div: string | null | undefined): string | null {
  if (!div) return null;
  const cleaned = div.trim().toUpperCase();
  if (!cleaned || ["NONE", "ALL", "GENERAL", "-"].includes(cleaned)) return null;
  return cleaned;
}

function normalizeOptionalBatchName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = name.trim();
  if (!cleaned || ["all", "NONE", "-"].includes(cleaned)) return null;
  return cleaned.toLowerCase();
}

/**
 * Determines whether a holiday applies to a specific class/division/batch
 * (such as a student's profile or a specific routine entry).
 */
export function holidayMatchesTarget(
  holiday: ClassHoliday,
  target: HolidayTarget
): boolean {
  if (!holiday || holiday.is_active === 0) return false;

  const hClass = String(holiday.class_name || "").trim();
  if (!hClass) return false;

  // 'ALL' applies to every class, division, and batch in the academy
  if (hClass.toUpperCase() === "ALL") {
    return true;
  }

  const tClass = target.className ? String(target.className).trim() : "";
  if (!tClass) return false;

  if (hClass.toLowerCase() !== tClass.toLowerCase()) {
    return false;
  }

  // Optional division restriction on holiday
  const hDiv = normalizeOptionalDiv(holiday.division);
  const tDiv = normalizeOptionalDiv(target.division);
  if (hDiv && tDiv && hDiv !== tDiv) {
    return false;
  }
  // If holiday is restricted to a division (e.g. SCIENCE) and target has no division,
  // still treat as non-matching only if target explicitly belongs to another division;
  // for class-wide routines without division, keep showing if class matches or hide?
  // For students without division (e.g. class 8), division won't be set on the holiday anyway.
  if (hDiv && !tDiv) {
    return false;
  }

  // Optional batch restriction on holiday
  const hBatchId = holiday.batch_id && Number(holiday.batch_id) > 0 ? Number(holiday.batch_id) : null;
  const hBatchName = normalizeOptionalBatchName(holiday.batch_name);
  if (hBatchId || hBatchName) {
    const tBatchId = target.batchId && Number(target.batchId) > 0 ? Number(target.batchId) : null;
    const tBatchName = normalizeOptionalBatchName(target.batchName);
    const idMatch = Boolean(hBatchId && tBatchId && hBatchId === tBatchId);
    const nameMatch = Boolean(hBatchName && tBatchName && hBatchName === tBatchName);
    if (!idMatch && !nameMatch) {
      return false;
    }
  }

  return true;
}

/** Finds all active holidays matching a date and optional class/division/batch target. */
export function findMatchingHolidays(
  holidays: ClassHoliday[],
  dateStr: string,
  target?: HolidayTarget
): ClassHoliday[] {
  if (!holidays || holidays.length === 0 || !dateStr) return [];
  return holidays.filter((h) => {
    if (h.is_active === 0) return false;
    if (!isDateInRange(dateStr, h.start_date, h.end_date)) return false;
    if (!target) return true;
    return holidayMatchesTarget(h, target);
  });
}

/** Formats a single YYYY-MM-DD date in Bengali, e.g. "২১ নভেম্বর ২০২৬". */
export function formatBanglaIsoDate(dateStr: string): string {
  if (!isValidIsoDate(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const monthBn = MONTHS_BN[m - 1] ?? String(m);
  return `${bn(d)} ${monthBn} ${bn(y)}`;
}

/** Formats a start..end date range cleanly in Bengali. */
export function formatBanglaDateRange(startDate: string, endDate: string): string {
  if (!startDate) return "";
  if (!endDate || startDate === endDate) {
    return formatBanglaIsoDate(startDate);
  }
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  if (sy === ey && sm === em) {
    const monthBn = MONTHS_BN[sm - 1] ?? String(sm);
    return `${bn(sd)} – ${bn(ed)} ${monthBn} ${bn(sy)}`;
  }
  return `${formatBanglaIsoDate(startDate)} – ${formatBanglaIsoDate(endDate)}`;
}

/** Human-readable target label for a holiday badge. */
export function formatHolidayTargetBn(holiday: ClassHoliday): string {
  const hClass = String(holiday.class_name || "").trim();
  if (hClass.toUpperCase() === "ALL") {
    return "সকল শ্রেণি (সম্পূর্ণ একাডেমি)";
  }
  const parts: string[] = [classLabel(hClass)];
  if (holiday.division) {
    parts.push(divisionLabel(holiday.division));
  }
  if (holiday.batch_name) {
    parts.push(`ব্যাচ: ${holiday.batch_name}`);
  }
  return parts.join(" • ");
}
