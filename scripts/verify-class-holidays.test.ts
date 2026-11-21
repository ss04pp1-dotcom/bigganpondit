import { describe, expect, test } from "bun:test";
import {
  ClassHoliday,
  addDaysToIsoDate,
  findMatchingHolidays,
  formatBanglaDateRange,
  formatHolidayTargetBn,
  getUpcomingDateForDayOfWeek,
  holidayMatchesTarget,
  isValidIsoDate,
} from "../src/lib/holiday-utils";

const sampleHolidays: ClassHoliday[] = [
  {
    id: 1,
    class_name: "8",
    division: null,
    batch_id: null,
    batch_name: null,
    start_date: "2026-11-21",
    end_date: "2026-11-21",
    reason: "বৃষ্টির কারণে ছুটি",
    is_active: 1,
  },
  {
    id: 2,
    class_name: "ALL",
    division: null,
    batch_id: null,
    batch_name: null,
    start_date: "2026-11-23",
    end_date: "2026-11-25",
    reason: "বিশেষ ছুটি",
    is_active: 1,
  },
  {
    id: 3,
    class_name: "9",
    division: "SCIENCE",
    batch_id: null,
    batch_name: null,
    start_date: "2026-11-21",
    end_date: "2026-11-22",
    reason: "ল্যাব মেরামত ছুটি",
    is_active: 1,
  },
  {
    id: 4,
    class_name: "Exam Batch",
    division: null,
    batch_id: 12,
    batch_name: "Mission 27",
    start_date: "2026-11-21",
    end_date: "2026-11-21",
    reason: "পরীক্ষার প্রস্তুতি ছুটি",
    is_active: 1,
  },
];

describe("class holiday matching & date utils", () => {
  test("validates ISO calendar dates strictly", () => {
    expect(isValidIsoDate("2026-11-21")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("21-11-2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  test("maps weekdays to upcoming ISO dates accurately", () => {
    // 2026-11-21 is Saturday (day 6)
    expect(getUpcomingDateForDayOfWeek("2026-11-21", 6, 6)).toBe("2026-11-21");
    expect(getUpcomingDateForDayOfWeek("2026-11-21", 6, 0)).toBe("2026-11-22");
    expect(getUpcomingDateForDayOfWeek("2026-11-21", 6, 1)).toBe("2026-11-23");
    expect(getUpcomingDateForDayOfWeek("2026-11-21", 6, 5)).toBe("2026-11-27");
    expect(addDaysToIsoDate("2026-11-30", 1)).toBe("2026-12-01");
  });

  test("matches class-specific holiday only for that class", () => {
    const class8Today = findMatchingHolidays(sampleHolidays, "2026-11-21", {
      className: "8",
    });
    expect(class8Today.map((h) => h.id)).toEqual([1]);

    const class7Today = findMatchingHolidays(sampleHolidays, "2026-11-21", {
      className: "7",
    });
    expect(class7Today).toEqual([]);
  });

  test("matches ALL-class multi-day holiday for every class within date range", () => {
    const class7Mon = findMatchingHolidays(sampleHolidays, "2026-11-23", {
      className: "7",
    });
    expect(class7Mon.map((h) => h.id)).toEqual([2]);

    const class10Wed = findMatchingHolidays(sampleHolidays, "2026-11-25", {
      className: "10",
      division: "HUMANITIES",
    });
    expect(class10Wed.map((h) => h.id)).toEqual([2]);

    const class10Thu = findMatchingHolidays(sampleHolidays, "2026-11-26", {
      className: "10",
    });
    expect(class10Thu).toEqual([]);
  });

  test("respects division and batch restrictions", () => {
    expect(
      holidayMatchesTarget(sampleHolidays[2], { className: "9", division: "SCIENCE" })
    ).toBe(true);
    expect(
      holidayMatchesTarget(sampleHolidays[2], { className: "9", division: "HUMANITIES" })
    ).toBe(false);

    expect(
      holidayMatchesTarget(sampleHolidays[3], {
        className: "Exam Batch",
        batchId: 12,
        batchName: "Mission 27",
      })
    ).toBe(true);
    expect(
      holidayMatchesTarget(sampleHolidays[3], {
        className: "Exam Batch",
        batchId: 15,
        batchName: "Other Batch",
      })
    ).toBe(false);
  });

  test("formats Bangla date range and target labels cleanly", () => {
    expect(formatBanglaDateRange("2026-11-21", "2026-11-21")).toBe("২১ নভেম্বর ২০২৬");
    expect(formatBanglaDateRange("2026-11-23", "2026-11-25")).toBe("২৩ – ২৫ নভেম্বর ২০২৬");
    expect(formatHolidayTargetBn(sampleHolidays[1])).toBe("সকল শ্রেণি (সম্পূর্ণ একাডেমি)");
    expect(formatHolidayTargetBn(sampleHolidays[0])).toBe("অষ্টম শ্রেণি");
  });
});
