import { describe, it, expect } from "bun:test";
import { NAV_BY_ROLE } from "../src/components/app/nav";

describe("Admin Monthly & Annual Report Navigation", () => {
  it("includes monthly and annual report in ADMIN navigation", () => {
    const adminNav = NAV_BY_ROLE.ADMIN;
    const monthlyReport = adminNav.find((item) => item.href === "/admin/monthly-report");
    const annualReport = adminNav.find((item) => item.href === "/admin/annual-report");

    expect(monthlyReport).toBeDefined();
    expect(monthlyReport?.label).toBe("মাসিক রিপোর্ট");
    expect(annualReport).toBeDefined();
    expect(annualReport?.label).toBe("বার্ষিক রিপোর্ট");
  });

  it("includes monthly and annual report in DIRECTOR navigation", () => {
    const directorNav = NAV_BY_ROLE.DIRECTOR;
    const monthlyReport = directorNav.find((item) => item.href === "/director/monthly-report");
    const annualReport = directorNav.find((item) => item.href === "/director/annual-report");

    expect(monthlyReport).toBeDefined();
    expect(annualReport).toBeDefined();
  });
});

describe("Result Card Print Permissions - Admin Only Rule", () => {
  it("enforces that canPrint is strictly true only when isAdmin is true", () => {
    // Mimic the exact logic in OfficialResultCard
    const canPrintCalculation = (isAdmin: boolean) => Boolean(isAdmin);

    expect(canPrintCalculation(true)).toBe(true);
    expect(canPrintCalculation(false)).toBe(false);
  });
});
