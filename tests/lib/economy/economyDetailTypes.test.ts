import { describe, expect, it } from "vitest";

import { parseEconomyDetailResponse } from "@/lib/economy/economyDetailTypes";

describe("parseEconomyDetailResponse", () => {
  it("accepts labor detail payload from hypatia-backend", () => {
    const payload = {
      as_of: "2026-05-18T12:00:00+00:00",
      topic: "labor",
      charts: [
        {
          key: "labor",
          series_id: "UNRATE",
          label: "Unemployment Rate",
          unit: "percent",
          observations: [
            { date: "2026-03-01", value: 4.0 },
            { date: "2026-02-01", value: 4.15 },
          ],
        },
      ],
      headline: {
        chart_key: "labor",
        series_id: "UNRATE",
        label: "Unemployment Rate",
        unit: "percent",
        value: 4.0,
        observation_date: "2026-03-01",
      },
    };
    const parsed = parseEconomyDetailResponse(payload);
    expect(parsed?.topic).toBe("labor");
    expect(parsed?.charts[0]?.series_id).toBe("UNRATE");
    expect(parsed?.headline?.value).toBe(4);
  });
});
