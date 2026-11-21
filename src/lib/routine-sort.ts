/**
 * Chronological sorting utilities for class routines.
 *
 * Routines store `start_time` / `end_time` as 12-hour text strings like
 * "09:00 AM" or "01:30 PM". Sorting those strings lexicographically in SQL
 * places afternoon times ("01:30 PM".."08:59 PM") BEFORE morning times
 * ("09:00 AM".."12:59 PM"). These helpers convert times to 24-hour minutes
 * (0..1439) and sort by Bangladesh week order (Sat -> Fri), start time,
 * period number, end time, class name, and id.
 */

const BN_TO_EN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] ?? d);
}

/**
 * Parses a time string ("09:00 AM", "01:30 PM", "12:00 PM", "14:30", "০৯:০০ AM")
 * into minutes since midnight (0..1439), or null if unparseable.
 */
export function parseRoutineTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const cleaned = toEnglishDigits(timeStr).trim().toUpperCase();
  const match = cleaned.match(/(\d{1,2})\s*:\s*(\d{1,2})\s*(AM|PM)?/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (modifier === "PM") {
    if (hours < 1 || hours > 12) return null;
    if (hours < 12) hours += 12;
  } else if (modifier === "AM") {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Extracts a numeric period index from labels like "১ম পিরিয়ড", "৪র্থ পিরিয়ড",
 * "2nd Period", etc. Returns Number.MAX_SAFE_INTEGER if unavailable.
 */
export function parseRoutinePeriodOrder(period?: string | null): number {
  if (!period) return Number.MAX_SAFE_INTEGER;
  const normalized = toEnglishDigits(period).trim();
  const match = normalized.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
}

/**
 * Bangladesh academic week order: Saturday (6) -> 0, Sunday (0) -> 1, ..., Friday (5) -> 6.
 */
export function bangladeshDayOrder(dayOfWeek: number): number {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return 99;
  }
  return (dayOfWeek + 1) % 7;
}

export interface SortableRoutine {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time?: string | null;
  period?: string | null;
  class_name?: string | null;
}

export function compareRoutines(a: SortableRoutine, b: SortableRoutine): number {
  const dayDiff = bangladeshDayOrder(a.day_of_week) - bangladeshDayOrder(b.day_of_week);
  if (dayDiff !== 0) return dayDiff;

  const startA = parseRoutineTimeToMinutes(a.start_time) ?? Number.MAX_SAFE_INTEGER;
  const startB = parseRoutineTimeToMinutes(b.start_time) ?? Number.MAX_SAFE_INTEGER;
  if (startA !== startB) return startA - startB;

  const periodA = parseRoutinePeriodOrder(a.period);
  const periodB = parseRoutinePeriodOrder(b.period);
  if (periodA !== periodB) return periodA - periodB;

  const endA = parseRoutineTimeToMinutes(a.end_time) ?? Number.MAX_SAFE_INTEGER;
  const endB = parseRoutineTimeToMinutes(b.end_time) ?? Number.MAX_SAFE_INTEGER;
  if (endA !== endB) return endA - endB;

  const clsDiff = String(a.class_name || "").localeCompare(String(b.class_name || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (clsDiff !== 0) return clsDiff;

  return (a.id ?? 0) - (b.id ?? 0);
}

export function sortRoutines<T extends SortableRoutine>(items: readonly T[]): T[] {
  return [...items].sort(compareRoutines);
}
