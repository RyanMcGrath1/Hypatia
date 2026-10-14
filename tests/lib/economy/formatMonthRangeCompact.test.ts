import { describe, expect, it } from "vitest";

import { formatMonthRangeCompact } from "@/lib/economy/payrollMonthRange";

describe("formatMonthRangeCompact", () => {
  it("shares the year when the range stays within one year", () => {
    expect(formatMonthRangeCompact("2026-01-01", "2026-09-01")).toBe("Jan – Sep 2026");
  });

  it("spells out both years when the range crosses a year", () => {
    expect(formatMonthRangeCompact("2025-11-01", "2026-10-01")).toBe(
      "Nov 2025 – Oct 2026",
    );
  });

  it("collapses a single month", () => {
    expect(formatMonthRangeCompact("2026-03-01", "2026-03-01")).toBe("Mar 2026");
  });

  it("falls back to whichever bound is present", () => {
    expect(formatMonthRangeCompact(undefined, "2026-03-01")).toBe("Mar 2026");
    expect(formatMonthRangeCompact(undefined, undefined)).toBe("");
  });
});
