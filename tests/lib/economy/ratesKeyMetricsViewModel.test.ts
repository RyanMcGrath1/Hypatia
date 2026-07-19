import { describe, expect, it } from "vitest";

import type { RatesKeyMetricsResponse } from "@/hooks/api/economyRatesKeyMetricsApi";
import { ratesKeyMetricsFromApi } from "@/lib/economy/ratesKeyMetricsViewModel";

describe("ratesKeyMetricsFromApi", () => {
  it("maps API metrics into display rows", () => {
    const api: RatesKeyMetricsResponse = {
      as_of: "2026-07-18T12:00:00+00:00",
      metrics: [
        {
          series_id: "DGS10",
          label: "10Y Treasury",
          note: "Benchmark long rate",
          value: 4.25,
          observation_date: "2026-07-17",
        },
        {
          series_id: "MORTGAGE30US",
          label: "30Y Mortgage",
          note: "Constrained affordability",
          value: 6.81,
          observation_date: "2026-07-10",
        },
        {
          series_id: "DGS2",
          label: "2Y Treasury",
          note: "Policy-sensitive yield",
          value: 4.72,
          observation_date: "2026-07-17",
        },
      ],
    };

    const vm = ratesKeyMetricsFromApi(api);
    expect(vm.metrics).toEqual([
      {
        key: "DGS10",
        label: "10Y Treasury",
        valueLabel: "4.25%",
        note: "Benchmark long rate",
      },
      {
        key: "MORTGAGE30US",
        label: "30Y Mortgage",
        valueLabel: "6.81%",
        note: "Constrained affordability",
      },
      {
        key: "DGS2",
        label: "2Y Treasury",
        valueLabel: "4.72%",
        note: "Policy-sensitive yield",
      },
    ]);
  });

  it("shows placeholders when api is null", () => {
    const vm = ratesKeyMetricsFromApi(null);
    expect(vm.metrics).toHaveLength(3);
    expect(vm.metrics.every((row) => row.valueLabel === "—")).toBe(true);
    expect(vm.metrics[0]?.label).toBe("10Y Treasury");
  });

  it("shows dash for failed metric values", () => {
    const api: RatesKeyMetricsResponse = {
      metrics: [
        {
          series_id: "DGS10",
          label: "10Y Treasury",
          note: "Benchmark long rate",
          value: null,
          observation_date: null,
          error: "FRED returned HTTP 404",
        },
      ],
    };

    const vm = ratesKeyMetricsFromApi(api);
    expect(vm.metrics[0]?.valueLabel).toBe("—");
  });
});
