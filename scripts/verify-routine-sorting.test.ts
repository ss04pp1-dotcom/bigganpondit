import { describe, expect, test } from "bun:test";
import {
  bangladeshDayOrder,
  parseRoutinePeriodOrder,
  parseRoutineTimeToMinutes,
  sortRoutines,
} from "../src/lib/routine-sort";

describe("Routine chronological sorting", () => {
  test("parses 12-hour, 24-hour, and Bangla digit times accurately", () => {
    expect(parseRoutineTimeToMinutes("12:00 AM")).toBe(0);
    expect(parseRoutineTimeToMinutes("09:00 AM")).toBe(540);
    expect(parseRoutineTimeToMinutes("12:00 PM")).toBe(720);
    expect(parseRoutineTimeToMinutes("12:10 PM")).toBe(730);
    expect(parseRoutineTimeToMinutes("01:30 PM")).toBe(810);
    expect(parseRoutineTimeToMinutes("05:15 PM")).toBe(1035);
    expect(parseRoutineTimeToMinutes("14:45")).toBe(885);
    expect(parseRoutineTimeToMinutes("০৯:০০ AM")).toBe(540);
    expect(parseRoutineTimeToMinutes("০১:৩০ PM")).toBe(810);
  });

  test("places 1st period (09:00 AM) before 4th period (01:30 PM)", () => {
    const unsorted = [
      {
        id: 101,
        day_of_week: 6,
        class_name: "Exam Batch",
        period: "৪র্থ পিরিয়ড",
        start_time: "01:30 PM",
        end_time: "02:45 PM",
      },
      {
        id: 102,
        day_of_week: 6,
        class_name: "7",
        period: "১ম পিরিয়ড",
        start_time: "09:00 AM",
        end_time: "11:00 AM",
      },
    ];

    const sorted = sortRoutines(unsorted);
    expect(sorted.map((r) => r.id)).toEqual([102, 101]);
  });

  test("orders full day across morning, noon, afternoon, and evening properly", () => {
    const unsorted = [
      { id: 5, day_of_week: 6, class_name: "10", period: "৫ম পিরিয়ড", start_time: "02:00 PM", end_time: "03:00 PM" },
      { id: 4, day_of_week: 6, class_name: "10", period: "৪র্থ পিরিয়ড", start_time: "12:10 PM", end_time: "01:10 PM" },
      { id: 8, day_of_week: 6, class_name: "10", period: "৮ম পিরিয়ড", start_time: "05:15 PM", end_time: "06:15 PM" },
      { id: 1, day_of_week: 6, class_name: "10", period: "১ম পিরিয়ড", start_time: "09:00 AM", end_time: "10:00 AM" },
      { id: 3, day_of_week: 6, class_name: "10", period: "৩য় পিরিয়ড", start_time: "11:05 AM", end_time: "12:05 PM" },
      { id: 6, day_of_week: 6, class_name: "10", period: "৬ষ্ঠ পিরিয়ড", start_time: "03:05 PM", end_time: "04:05 PM" },
      { id: 2, day_of_week: 6, class_name: "10", period: "২য় পিরিয়ড", start_time: "10:00 AM", end_time: "11:00 AM" },
    ];

    const sorted = sortRoutines(unsorted);
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  test("breaks same start_time ties by period order and sorts week Saturday to Friday", () => {
    expect(parseRoutinePeriodOrder("১ম পিরিয়ড")).toBe(1);
    expect(parseRoutinePeriodOrder("৪র্থ পিরিয়ড")).toBe(4);
    expect(bangladeshDayOrder(6)).toBe(0); // Saturday
    expect(bangladeshDayOrder(0)).toBe(1); // Sunday
    expect(bangladeshDayOrder(5)).toBe(6); // Friday

    const unsorted = [
      { id: 1, day_of_week: 0, class_name: "8", period: "১ম পিরিয়ড", start_time: "09:00 AM" },
      { id: 2, day_of_week: 6, class_name: "8", period: "২য় পিরিয়ড", start_time: "09:00 AM" },
      { id: 3, day_of_week: 6, class_name: "8", period: "১ম পিরিয়ড", start_time: "09:00 AM" },
    ];

    const sorted = sortRoutines(unsorted);
    expect(sorted.map((r) => r.id)).toEqual([3, 2, 1]);
  });
});
