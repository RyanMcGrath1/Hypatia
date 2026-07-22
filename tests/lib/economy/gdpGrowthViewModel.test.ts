import { describe, expect, it } from "vitest";

import {
  buildSparkLabels,
  gdpGrowthFromApi,
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
