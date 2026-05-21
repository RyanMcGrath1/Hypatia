import { describe, expect, it } from "vitest";

import {
  deriveLaborSectorBreakdown,
  laborSectorNumericPoints,
  sectorRowsFromApi,
} from "@/lib/economy/sectorRowsFromApi";
import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";

describe("deriveLaborSectorBreakdown", () => {
  it("uses first-to-last change within the API window, not latest MoM", () => {
    const response: EconomySectorResponse = {
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      sectors: {},
      series: [
        {
          id: "MANEMP",
          name: "Manufacturing",
          points: [
            { date: "2025-12-01", value: 11000 },
            { date: "2026-01-01", value: 12000 },
            { date: "2026-02-01", value: 12050 },
            { date: "2026-03-01", value: 12100 },
          ],
        },
      ],
    };
    const [row] = deriveLaborSectorBreakdown(response);
    expect(row!.deltaThousands).toBe(100);
    expect(row!.growthPct).toBeCloseTo(0.833, 2);
  });

  it("clips observations outside start_date and end_date", () => {
    const series = {
      id: "USEHS",
      name: "Health",
      points: [
        { date: "2025-11-01", value: 1 },
        { date: "2026-01-01", value: 100 },
        { date: "2026-03-01", value: 130 },
        { date: "2026-04-01", value: 999 },
      ],
    };
    const pts = laborSectorNumericPoints(series, {
      startDate: "2026-01-01",
      endDate: "2026-03-01",
    });
    expect(pts.map((p) => p.date)).toEqual(["2026-01-01", "2026-03-01"]);
  });

  it("sorts list rows by period growth greatest to least", () => {
    const response: EconomySectorResponse = {
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      sectors: {},
      series: [
        {
          id: "MANEMP",
          name: "Manufacturing",
          points: [
            { date: "2026-01-01", value: 12000 },
            { date: "2026-03-01", value: 12100 },
          ],
        },
        {
          id: "USEHS",
          name: "Education & Health Services",
          points: [
            { date: "2026-01-01", value: 20000 },
            { date: "2026-03-01", value: 21000 },
          ],
        },
      ],
    };
    const rows = sectorRowsFromApi(response);
    expect(rows[0]!.sector).toBe("Healthcare");
    expect(rows[1]!.sector).toBe("Manufacturing");
  });

  it("sets distribution bar fill to share of total absolute job change", () => {
    const response: EconomySectorResponse = {
      startDate: "2026-01-01",
      endDate: "2026-03-01",
      sectors: {},
      series: [
        {
          id: "MANEMP",
          name: "Manufacturing",
          points: [
            { date: "2026-01-01", value: 100 },
            { date: "2026-03-01", value: 130 },
          ],
        },
        {
          id: "USEHS",
          name: "Health",
          points: [
            { date: "2026-01-01", value: 200 },
            { date: "2026-03-01", value: 270 },
          ],
        },
      ],
    };
    const rows = sectorRowsFromApi(response);
    expect(rows[0]!.barFill).toBeCloseTo(70 / 100, 5);
    expect(rows[1]!.barFill).toBeCloseTo(30 / 100, 5);
  });
});
