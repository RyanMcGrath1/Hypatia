import { describe, expect, it } from "vitest";

import { buildPayrollChartForObservationWindow } from "@/components/economy/detail/labor/payrollChartFromFred";
import { payrollDefaultYtdBoundsUtc } from "@/lib/economy/payrollMonthRange";

describe("buildPayrollChartForObservationWindow", () => {
  it("renders all 12 calendar months for YTD with skeleton slots for missing prints", () => {
    const now = new Date("2026-05-19T12:00:00Z");
    const window = payrollDefaultYtdBoundsUtc(now);
    const observations = [
      { date: "2026-01-01", value: "120" },
      { date: "2026-02-01", value: "-45" },
      { date: "2026-03-01", value: "80" },
    ];

    const chart = buildPayrollChartForObservationWindow(observations, window);

    expect(chart).not.toBeNull();
    expect(chart!.bars).toHaveLength(12);
    expect(chart!.bars.filter((b) => b.hasObservation)).toHaveLength(3);
    expect(chart!.bars.filter((b) => !b.hasObservation)).toHaveLength(9);
    expect(chart!.calendarContextYear).toBe(2026);
    expect(chart!.bars[0]!.label).toBe("JAN");
    expect(chart!.bars[11]!.label).toBe("DEC");
  });

  it("uses one bar per observation for non-YTD windows", () => {
    const observations = [
      { date: "2024-01-01", value: "10" },
      { date: "2024-02-01", value: "20" },
      { date: "2024-03-01", value: "30" },
    ];

    const chart = buildPayrollChartForObservationWindow(observations, {
      observationStart: "2024-01-01",
      observationEnd: "2024-03-31",
    });

    expect(chart!.bars).toHaveLength(3);
    expect(chart!.calendarContextYear).toBeNull();
  });
});
