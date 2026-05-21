import { describe, expect, it } from "vitest";

import {
  LABOR_AHE_SERIES_ID,
  LABOR_CPI_SERIES_ID,
  periodPercentFromLevelSeries,
  wagesInflationCardFromApi,
} from "@/lib/economy/laborEarningsInflationViewModel";
import type { LaborEarningsInflationResponse } from "@/hooks/api/economyLaborEarningsInflationApi";

const window = {
  observationStart: "2026-01-01",
  observationEnd: "2026-05-18",
};

function series(id: string, points: { date: string; value: number | null }[]) {
  return { id, name: id, points };
}

describe("periodPercentFromLevelSeries", () => {
  it("computes change from first to last point in the filter window", () => {
    const s = series(LABOR_AHE_SERIES_ID, [
      { date: "2025-12-01", value: 30 },
      { date: "2026-01-01", value: 35 },
      { date: "2026-05-01", value: 35.75 },
    ]);
    expect(periodPercentFromLevelSeries(s, window)).toBeCloseTo(2.14, 1);
  });

  it("returns null when fewer than two points fall in the window", () => {
    const s = series(LABOR_AHE_SERIES_ID, [{ date: "2026-03-01", value: 35 }]);
    expect(periodPercentFromLevelSeries(s, window)).toBeNull();
  });
});

describe("wagesInflationCardFromApi", () => {
  it("formats wages and CPI for the selected period", () => {
    const api: LaborEarningsInflationResponse = {
      startDate: "2026-01-01",
      endDate: "2026-05-18",
      sectors: {},
      series: [
        series(LABOR_AHE_SERIES_ID, [
          { date: "2026-01-01", value: 35 },
          { date: "2026-05-01", value: 35.75 },
        ]),
        series(LABOR_CPI_SERIES_ID, [
          { date: "2026-01-01", value: 310 },
          { date: "2026-05-01", value: 319.6 },
        ]),
      ],
    };
    const card = wagesInflationCardFromApi(api, window);
    expect(card.wages.valueLabel).toBe("+2.1%");
    expect(card.inflation.valueLabel).toBe("+3.1%");
    expect(card.wages.unavailable).toBe(false);
    expect(card.periodLabel).toMatch(/Jan.*2026/);
    expect(card.footerNote).toContain("selected period");
  });

  it("marks a side unavailable when series has error", () => {
    const api: LaborEarningsInflationResponse = {
      startDate: "2026-01-01",
      endDate: "2026-05-18",
      sectors: {},
      series: [
        { ...series(LABOR_AHE_SERIES_ID, []), error: "FRED timeout" },
        series(LABOR_CPI_SERIES_ID, [
          { date: "2026-01-01", value: 310 },
          { date: "2026-05-01", value: 319.6 },
        ]),
      ],
    };
    const card = wagesInflationCardFromApi(api, window);
    expect(card.wages.unavailable).toBe(true);
    expect(card.inflation.unavailable).toBe(false);
  });
});
