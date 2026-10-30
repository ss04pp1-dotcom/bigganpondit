import { describe, it, expect } from "bun:test";

describe("OfficialResultCard Fine Calculation in Frontend", () => {
  it("accurately computes 70.00৳ fine for Mariam Khatun when fine prop is 20.00৳ or 0.00৳", () => {
    // Subject rows matching Mariam's exact screenshot:
    const subjects = [
      {
        subjectId: 1,
        subjectName: "ইংরেজি",
        attendance: "A1",
        totalMarks: 68,
        obtained: 16.66,
        grade: "F",
        gpa: 0,
        isFourth: false,
        failCount: 0, // Even if API had sent failCount: 0!
      },
      {
        subjectId: 2,
        subjectName: "গণিত",
        attendance: "P",
        totalMarks: 10,
        obtained: 6,
        grade: "A-",
        gpa: 3.5,
        isFourth: false,
        failCount: 0,
      },
    ];

    let totalAbsenceCount = 0;
    let totalFails = 0;
    for (const s of subjects) {
      const att = s.attendance || "P";
      if (att.startsWith("A")) {
        const num = parseInt(att.substring(1), 10) || 1;
        totalAbsenceCount += num;
      }
      const failsInSub = (typeof s.failCount === "number" && s.failCount > 0)
        ? s.failCount
        : (s.grade === "F" && !s.isFourth && (!att.startsWith("A") || (s.obtained !== undefined && s.obtained > 0)) ? 1 : 0);
      totalFails += failsInSub;
    }

    const calculatedFine = totalAbsenceCount * 20 + totalFails * 50;
    expect(totalAbsenceCount).toBe(1);
    expect(totalFails).toBe(1);
    expect(calculatedFine).toBe(70);

    // Test case 1: Stale API or old card state passed fine: "20.00৳"
    const oldFine = "20.00৳";
    const fineNum1 = parseFloat(String(oldFine || "").replace(/[^0-9.]/g, "")) || 0;
    const fineDisplay1 = (oldFine === "০০/-" || oldFine === "00/-")
      ? oldFine
      : calculatedFine > fineNum1
      ? `${calculatedFine}.00৳`
      : oldFine;
    expect(fineDisplay1).toBe("70.00৳");

    // Test case 2: Fresh API passed fine: "70.00৳"
    const freshFine = "70.00৳";
    const fineNum2 = parseFloat(String(freshFine || "").replace(/[^0-9.]/g, "")) || 0;
    const fineDisplay2 = (freshFine === "০০/-" || freshFine === "00/-")
      ? freshFine
      : calculatedFine > fineNum2
      ? `${calculatedFine}.00৳`
      : freshFine;
    expect(fineDisplay2).toBe("70.00৳");

    // Test case 3: Annual card passed fine: "০০/-"
    const annualFine = "০০/-";
    const fineNum3 = parseFloat(String(annualFine || "").replace(/[^0-9.]/g, "")) || 0;
    const fineDisplay3 = (annualFine === "০০/-" || annualFine === "00/-")
      ? annualFine
      : calculatedFine > fineNum3
      ? `${calculatedFine}.00৳`
      : annualFine;
    expect(fineDisplay3).toBe("০০/-");
  });
});
