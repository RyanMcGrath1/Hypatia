import { describe, expect, it } from "vitest";

import { parseLaborAgeMetricsResponse } from "@/lib/economy/laborAgeMetricsParse";
import { buildLaborDemographicComparisonChartModel } from "@/lib/economy/laborDemographicComparisonChartModel";

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
            { date: "2026-02-01", value: "14.0" },
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
  ],
};

describe("buildLaborDemographicComparisonChartModel", () => {
  it("builds four overlapping cohort lines on a shared scale", () => {
    const api = parseLaborAgeMetricsResponse(SAMPLE_PAYLOAD);
    const metric = api.metrics[0]!;
    const model = buildLaborDemographicComparisonChartModel(metric, 320);
    expect(model).not.toBeNull();
    expect(model!.lines).toHaveLength(4);
    expect(model!.lines.map((l) => l.id)).toEqual([
      "16-19",
      "20-24",
      "25-54",
      "55+",
    ]);
    expect(model!.lines[0]!.polylinePoints.length).toBeGreaterThan(0);
    expect(model!.xTicks.length).toBeGreaterThanOrEqual(2);
    expect(model!.yTicks.length).toBeGreaterThanOrEqual(2);
  });

  it("returns null when there is only one month of data", () => {
    const api = parseLaborAgeMetricsResponse({
      ...SAMPLE_PAYLOAD,
      metrics: [
        {
          id: "labor_force_participation",
          name: "Labor Force Participation Rate",
          series: [
            {
              age_group: "16-19",
              id: "LNS11300012",
              observations: [{ date: "2026-04-01", value: "35.8" }],
            },
          ],
        },
      ],
    });
    const model = buildLaborDemographicComparisonChartModel(
      api.metrics[0]!,
      320,
    );
    expect(model).toBeNull();
  });
});
