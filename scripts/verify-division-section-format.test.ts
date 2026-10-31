import { describe, it, expect } from "bun:test";
import { divisionLabel } from "@/lib/constants";

describe("Division and Section Result Card Formatting Rules", () => {
  function formatBranch(division?: string | null, section?: string | null) {
    const divText = division ? divisionLabel(division) : "";
    const rawSec = typeof section === "string" ? section.trim() : "";
    const secText = (rawSec && rawSec !== "-" && rawSec !== "—" && rawSec.toLowerCase() !== "n/a" && rawSec.toLowerCase() !== "null") ? rawSec : "";

    let branchLabel = " শাখা";
    let branchText = "-";
    if (divText && secText) {
      branchLabel = "বিভাগ / শাখা";
      branchText = `${divText} - ${secText}`;
    } else if (divText) {
      branchLabel = "বিভাগ";
      branchText = divText;
    } else if (secText) {
      branchLabel = "শাখা";
      branchText = secText;
    } else {
      branchLabel = "শাখা";
      branchText = "-";
    }
    return { branchLabel, branchText };
  }

  it("Rule 1: If only division is present, shows only division with NO dash", () => {
    // Siyam Rana / Jemi Khatun case in Class 9 Science with section "-" or null
    const res1 = formatBranch("SCIENCE", "-");
    expect(res1.branchLabel).toBe("বিভাগ");
    expect(res1.branchText).toBe("বিজ্ঞান");

    const res2 = formatBranch("SCIENCE", null);
    expect(res2.branchLabel).toBe("বিভাগ");
    expect(res2.branchText).toBe("বিজ্ঞান");

    const res3 = formatBranch("HUMANITIES", "");
    expect(res3.branchLabel).toBe("বিভাগ");
    expect(res3.branchText).toBe("মানবিক");
  });

  it("Rule 2: If both division and section are present, shows 'বিভাগ - শাখা' with the dash", () => {
    const res = formatBranch("SCIENCE", "ক");
    expect(res.branchLabel).toBe("বিভাগ / শাখা");
    expect(res.branchText).toBe("বিজ্ঞান - ক");

    const res2 = formatBranch("HUMANITIES", "A");
    expect(res2.branchLabel).toBe("বিভাগ / শাখা");
    expect(res2.branchText).toBe("মানবিক - A");
  });

  it("Rule 3: If only section is present, shows only section with NO dash", () => {
    const res = formatBranch(null, "ক");
    expect(res.branchLabel).toBe("শাখা");
    expect(res.branchText).toBe("ক");

    const res2 = formatBranch("", "পদ্মা");
    expect(res2.branchLabel).toBe("শাখা");
    expect(res2.branchText).toBe("পদ্মা");
  });

  it("Rule 4: If neither division nor section is present, shows '-'", () => {
    const res = formatBranch(null, null);
    expect(res.branchLabel).toBe("শাখা");
    expect(res.branchText).toBe("-");

    const res2 = formatBranch("", "-");
    expect(res2.branchLabel).toBe("শাখা");
    expect(res2.branchText).toBe("-");
  });
});
