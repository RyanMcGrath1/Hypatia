import { describe, expect, it } from "vitest";

import { parseLaborAgeMetricsResponse } from "@/lib/economy/laborAgeMetricsParse";
import { laborDemographicModelFromAgeMetrics } from "@/lib/economy/laborAgeMetricsViewModel";

const SAMPLE_PAYLOAD = {
  end_date: "2026-04-01",
  start_date: "2026-01-01",
  metrics: [
    {
      id: "unemployment_rate",
      name: "Unemployment Rate",
      series: [
        {
          age_group: "16-19",
          id: "LNS14000012",
          observations: [
            { date: "2026-01-01", value: "13.6" },
            { date: "2026-04-01", value: "14.4" },
          ],
        },
        {
          age_group: "20-24",
          id: "LNS14000036",
          observations: [
            { date: "2026-01-01", value: "7.0" },
            { date: "2026-04-01", value: "7.6" },
          ],
        },
        {
          age_group: "25-54",
          id: "LNS14000060",
          observations: [
            { date: "2026-01-01", value: "3.8" },
            { date: "2026-04-01", value: "3.7" },
          ],
        },
        {
          age_group: "55+",
          id: "LNS14024230",
          observations: [
            { date: "2026-01-01", value: "3.2" },
            { date: "2026-04-01", value: "3.0" },
          ],
        },
      ],
    },
    {
      id: "labor_force_participation",
      name: "Labor Force Participation Rate",
      series: [
        {
          age_group: "16-19",
          id: "LNS11300012",
          observations: [{ date: "2026-04-01", value: "35.8" }],
        },
        {
          age_group: "25-54",
          id: "LNS11300060",
          observations: [{ date: "2026-04-01", value: "83.8" }],
        },
      ],
    },
  ],
};

describe("parseLaborAgeMetricsResponse", () => {
  it("parses age-metrics envelope", () => {
    const res = parseLaborAgeMetricsResponse(SAMPLE_PAYLOAD);
    expect(res.startDate).toBe("2026-01-01");
    expect(res.endDate).toBe("2026-04-01");
    expect(res.metrics).toHaveLength(2);
    expect(res.metrics[0]!.series[0]!.ageGroup).toBe("16-19");
    expect(res.metrics[0]!.series[0]!.observations[1]!.value).toBe(14.4);
  });
});

describe("laborDemographicModelFromAgeMetrics", () => {
  it("builds unemployment buckets from API data", () => {
    const api = parseLaborAgeMetricsResponse(SAMPLE_PAYLOAD);
    const model = laborDemographicModelFromAgeMetrics(api, "unemployment");
    expect(model).not.toBeNull();
    expect(model!.chartTitle).toBe("Unemployment Rate (%)");
    expect(model!.buckets).toHaveLength(4);
    expect(model!.buckets[0]!.valueLabel).toBe("14.4%");
    expect(model!.buckets[2]!.valueLabel).toBe("3.7%");
    expect(model!.updateBadge).toMatch(/April 2026 Update/);
    expect(model!.varianceNorm.length).toBeGreaterThan(0);
  });

  it("maps participation tab to labor_force_participation metric", () => {
    const api = parseLaborAgeMetricsResponse(SAMPLE_PAYLOAD);
    const model = laborDemographicModelFromAgeMetrics(api, "participation");
    expect(model!.chartTitle).toBe("Labor Force Participation Rate (%)");
    expect(model!.buckets).toHaveLength(2);
  });
});
