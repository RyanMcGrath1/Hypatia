import { describe, expect, it } from "vitest";

import { gdpSectorContributionFromApi } from "@/lib/economy/gdpSectorContributionViewModel";

describe("gdpSectorContributionFromApi", () => {
  it("maps sector shares into bar rows", () => {
    const vm = gdpSectorContributionFromApi(
      {
        unit: "percent of real GDP",
        gdp_series_id: "GDPC1",
        observation_date: "2026-01-01",
        sectors: [
          {
            key: "services",
            series_id: "RVASPI",
            label: "Services",
            value: 68.2,
            observation_date: "2026-01-01",
          },
          {
            key: "manufacturing",
            series_id: "RVAMA",
            label: "Manufacturing",
            value: 18.1,
            observation_date: "2026-01-01",
          },
          {
            key: "agriculture",
            series_id: "RVAAFH",
            label: "Agriculture",
            value: 0.9,
            observation_date: "2026-01-01",
          },
        ],
      },
      "#4A6CF7",
    );

    expect(vm.observationDateLabel).toBe("Q1 2026");
    expect(vm.rows).toHaveLength(3);
    expect(vm.rows[0]).toMatchObject({
      key: "services",
      valueLabel: "68.2%",
      barWidthPct: 68.2,
      color: "#4A6CF7",
    });
    expect(vm.rows[1]?.barWidthPct).toBe(18.1);
    expect(vm.rows[2]?.valueLabel).toBe("0.9%");
  });

  it("returns empty rows when api is null", () => {
    const vm = gdpSectorContributionFromApi(null, "#4A6CF7");
    expect(vm.rows).toEqual([]);
    expect(vm.observationDateLabel).toBe("");
  });
});
