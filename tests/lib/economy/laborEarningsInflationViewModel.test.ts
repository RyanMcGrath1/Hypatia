import { describe, expect, it } from "vitest";

import {
  LABOR_AHE_SERIES_ID,
  LABOR_CPI_SERIES_ID,
  wagesInflationCardFromApi,
  yoyPercentFromLevelSeries,
} from "@/lib/economy/laborEarningsInflationViewModel";
import type { LaborEarningsInflationResponse } from "@/hooks/api/economyLaborEarningsInflationApi";

function series(id: string, points: { date: string; value: number | null }[]) {
  return { id, name: id, points };
}

describe("yoyPercentFromLevelSeries", () => {
  it("computes YoY from latest vs same month prior year", () => {
    const s = series(LABOR_AHE_SERIES_ID, [
      { date: "2025-04-01", value: 34 },
      { date: "2026-04-01", value: 35.36 },
    ]);
    expect(yoyPercentFromLevelSeries(s)).toBeCloseTo(4, 1);
  });

  it("returns null when year-ago month is missing", () => {
    const s = series(LABOR_AHE_SERIES_ID, [{ date: "2026-04-01", value: 35 }]);
    expect(yoyPercentFromLevelSeries(s)).toBeNull();
  });
});

describe("wagesInflationCardFromApi", () => {
  it("formats wages and CPI YoY from API series order", () => {
    const api: LaborEarningsInflationResponse = {
      startDate: "2026-01-01",
      endDate: "2026-05-18",
      sectors: {},
      series: [
        series(LABOR_AHE_SERIES_ID, [
          { date: "2025-05-01", value: 35 },
          { date: "2026-05-01", value: 35.75 },
        ]),
        series(LABOR_CPI_SERIES_ID, [
          { date: "2025-05-01", value: 310 },
          { date: "2026-05-01", value: 319.6 },
        ]),
      ],
    };
    const card = wagesInflationCardFromApi(api);
    expect(card.wages.valueLabel).toBe("+2.1%");
    expect(card.inflation.valueLabel).toBe("+3.1%");
    expect(card.wages.unavailable).toBe(false);
    expect(card.inflation.unavailable).toBe(false);
  });

  it("marks a side unavailable when series has error", () => {
    const api: LaborEarningsInflationResponse = {
      startDate: "2026-01-01",
      endDate: "2026-05-18",
      sectors: {},
      series: [
        { ...series(LABOR_AHE_SERIES_ID, []), error: "FRED timeout" },
        series(LABOR_CPI_SERIES_ID, [
          { date: "2025-05-01", value: 310 },
          { date: "2026-05-01", value: 319.6 },
        ]),
      ],
    };
    const card = wagesInflationCardFromApi(api);
    expect(card.wages.unavailable).toBe(true);
    expect(card.inflation.unavailable).toBe(false);
  });
});
