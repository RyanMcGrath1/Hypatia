import { describe, expect, it } from "vitest";

import {
  buildSparkLabels,
  gdpGrowthFromApi,
  gdpGrowthHeadwindsFromApi,
  quarterLabelFromDate,
  scaleSparkValues,
} from "@/lib/economy/gdpGrowthViewModel";

describe("quarterLabelFromDate", () => {
  it("maps FRED quarter-start dates to calendar quarters", () => {
    expect(quarterLabelFromDate("2026-01-01")).toBe("Q1 '26");
    expect(quarterLabelFromDate("2025-10-01")).toBe("Q4 '25");
    expect(quarterLabelFromDate("2025-07-01")).toBe("Q3 '25");
    expect(quarterLabelFromDate("2025-04-01")).toBe("Q2 '25");
  });
});

describe("scaleSparkValues", () => {
  it("maps growth rates into 0–1 chart coordinates", () => {
    const scaled = scaleSparkValues([-0.6, 3.8, 4.4, 0.5, 2.1]);
    expect(scaled).toHaveLength(5);
    for (const value of scaled) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(scaled[2]).toBeLessThan(scaled[0]);
  });
});

describe("buildSparkLabels", () => {
  it("anchors first and last labels to the chart edges", () => {
    const labels = buildSparkLabels(
      ["2024-04-01", "2024-07-01", "2024-10-01", "2025-01-01", "2025-04-01"],
    );
    expect(labels[0]).toEqual({ label: "Q2 '24", position: 0 });
    expect(labels[labels.length - 1]).toEqual({ label: "Q2 '25", position: 1 });
  });
});

describe("gdpGrowthFromApi", () => {
  it("uses the most recent eight quarters for the sparkline", () => {
    const vm = gdpGrowthFromApi({
      start_date: "2023-01-01",
      end_date: "2026-06-01",
      series_id: "A191RL1Q225SBEA",
      label: "Real GDP Growth Rate",
      unit: "percent",
      value: 2.1,
      observation_date: "2026-01-01",
      observations: [
        { date: "2026-01-01", value: 2.1 },
        { date: "2025-10-01", value: 0.5 },
        { date: "2025-07-01", value: 4.4 },
        { date: "2025-04-01", value: 3.8 },
        { date: "2025-01-01", value: -0.6 },
        { date: "2024-10-01", value: 1.9 },
        { date: "2024-07-01", value: 3.3 },
        { date: "2024-04-01", value: 3.6 },
        { date: "2024-01-01", value: 0.8 },
        { date: "2023-10-01", value: 3.4 },
      ],
    });

    expect(vm.valueLabel).toBe("+2.1%");
    expect(vm.subtitle).toBe("Quarter-over-Quarter (Q1 '26)");
    expect(vm.sparkValues).toHaveLength(8);
    expect(vm.sparkLabels[0]?.label).toBe("Q2 '24");
    expect(vm.sparkLabels[0]?.position).toBe(0);
    expect(vm.sparkLabels[vm.sparkLabels.length - 1]?.label).toBe("Q1 '26");
    expect(vm.sparkLabels[vm.sparkLabels.length - 1]?.position).toBe(1);
  });

  it("returns placeholders when API is null", () => {
    const vm = gdpGrowthFromApi(null);
    expect(vm.valueLabel).toBe("—");
    expect(vm.subtitle).toBe("Quarter-over-Quarter");
    expect(vm.sparkValues).toEqual([]);
    expect(vm.sparkLabels).toEqual([]);
  });
});

describe("gdpGrowthHeadwindsFromApi", () => {
  it("maps four live risk cards from the API", () => {
    const rows = gdpGrowthHeadwindsFromApi({
      risks: [
        {
          key: "supply_chain",
          series_id: "FRGSHPUSM649NCIS",
          title: "Supply Chain",
          value: -3.1,
          observation_date: "2026-06-01",
          body: "U.S. freight shipment volumes declined 3.1% month-over-month.",
          risk: "high",
          risk_label: "High Risk",
        },
        {
          key: "interest_rates",
          series_id: "DFEDTARU",
          title: "Interest Rates",
          value: 5.5,
          observation_date: "2026-07-17",
          body: "Fed funds target range is 5.25–5.50%.",
          risk: "high",
          risk_label: "High Risk",
        },
        {
          key: "yield_curve",
          series_id: "T10Y2Y",
          title: "Yield Curve",
          value: 0.39,
          observation_date: "2026-07-17",
          body: "10Y–2Y spread is 0.39%. Flat yield curve.",
          risk: "medium",
          risk_label: "Medium Risk",
        },
        {
          key: "inflation",
          series_id: "PCEPILFE",
          title: "Inflation",
          value: 2.8,
          observation_date: "2026-05-01",
          body: "Core PCE inflation is 2.8% YoY, above the Fed's 2% target.",
          risk: "medium",
          risk_label: "Medium Risk",
        },
      ],
    });

    expect(rows).toHaveLength(4);
    expect(rows[0]?.icon).toBe("git-branch");
    expect(rows[1]?.riskLabel).toBe("High Risk");
    expect(rows[2]?.title).toBe("Yield Curve");
  });

  it("returns placeholders when API is null", () => {
    const rows = gdpGrowthHeadwindsFromApi(null);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.body === "—")).toBe(true);
  });
});
