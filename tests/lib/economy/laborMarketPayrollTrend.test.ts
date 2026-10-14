import { describe, expect, it } from "vitest";

import {
  PAYROLL_BREAK_EVEN_THOUSANDS,
  buildPayrollAxisFromChart,
  buildPayrollHeroDisplay,
  groupBarsForAxis,
  payrollBarTone,
  payrollMovingAverage,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
import type {
  PayrollBarPoint,
  PayrollChartFromFred,
} from "@/components/economy/detail/labor/payrollChartFromFred";

function bar(date: string, value: number | null): PayrollBarPoint {
  return {
    label: date.slice(5, 7),
    observationDate: date,
    levelThousands: value,
    momVsPriorThousands: value,
    relativeHeight: 0,
    hasObservation: value != null,
  };
}

function chartOf(bars: PayrollBarPoint[]): PayrollChartFromFred {
  return {
    bars,
    monthOverMonthThousands: null,
    latestObservationDate: "",
    periodLabel: "",
    heroMetric: "",
    calendarContextYear: null,
  };
}

const colors = { mutedText: "muted", green: "green", warning: "warning", danger: "danger" };

describe("groupBarsForAxis", () => {
  const monthly = (start: string, count: number) =>
    Array.from({ length: count }, (_, i) => {
      const d = new Date(`${start}T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + i);
      const iso = d.toISOString().slice(0, 10);
      const b = bar(iso, 10);
      b.label = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      return b;
    });

  it("groups up to a year of months into calendar quarters with partial edges", () => {
    const groups = groupBarsForAxis(monthly("2025-11-01", 12));
    expect(groups.map((g) => g.text)).toEqual([
      "Nov–Dec",
      "Jan–Mar",
      "Apr–Jun",
      "Jul–Sep",
      "Oct",
    ]);
    expect(groups[1]).toMatchObject({ start: 2, end: 4 });
  });

  it("groups longer ranges by calendar year", () => {
    const groups = groupBarsForAxis(monthly("2024-07-01", 24));
    expect(groups.map((g) => g.text)).toEqual(["2024", "2025", "2026"]);
  });
});

describe("payrollBarTone", () => {
  it("splits months into losses, below break-even, and above break-even", () => {
    expect(payrollBarTone(-10)).toBe("loss");
    expect(payrollBarTone(PAYROLL_BREAK_EVEN_THOUSANDS - 1)).toBe("belowBreakEven");
    expect(payrollBarTone(PAYROLL_BREAK_EVEN_THOUSANDS)).toBe("aboveBreakEven");
  });
});

describe("payrollMovingAverage", () => {
  it("averages full trailing windows and skips windows with missing months", () => {
    const bars = [
      bar("2026-01-01", 90),
      bar("2026-02-01", 30),
      bar("2026-03-01", 60),
      bar("2026-04-01", 150),
      bar("2026-05-01", null),
      bar("2026-06-01", 10),
    ];
    expect(payrollMovingAverage(bars)).toEqual([null, null, 60, 80, null, null]);
  });
});

describe("buildPayrollAxisFromChart", () => {
  it("keeps the break-even line on scale when every month is small", () => {
    const axis = buildPayrollAxisFromChart(
      chartOf([bar("2026-01-01", 5), bar("2026-02-01", -8)]),
    );
    expect(axis.scaleMax).toBeGreaterThanOrEqual(PAYROLL_BREAK_EVEN_THOUSANDS);
  });
});

describe("buildPayrollHeroDisplay", () => {
  const chart = chartOf([
    bar("2026-01-01", 120),
    bar("2026-02-01", 30),
    bar("2026-03-01", 90),
  ]);

  it("defaults to the latest month with break-even and trend context", () => {
    const hero = buildPayrollHeroDisplay(chart, null, colors);
    expect(hero.heroMetric).toBe("+90k");
    expect(hero.contextLabel).toBe("March 2026");
    expect(hero.breakEvenLabel).toBe(
      `${90 - PAYROLL_BREAK_EVEN_THOUSANDS}k above break-even`,
    );
    expect(hero.averageLabel).toBe("3-month average +80k");
    expect(hero.trend.color).toBe("green");
  });

  it("flags positive months under break-even with the warning color", () => {
    const hero = buildPayrollHeroDisplay(chart, 1, colors);
    expect(hero.contextLabel).toBe("February 2026");
    expect(hero.breakEvenLabel).toBe(
      `${PAYROLL_BREAK_EVEN_THOUSANDS - 30}k below break-even`,
    );
    expect(hero.averageLabel).toBe("");
    expect(hero.trend.color).toBe("warning");
  });
});
