import { describe, expect, it } from "vitest";

import type { EconomyCpiResponse } from "@/hooks/api/economyCpiApi";
import {
  inflationCpiHeadlineFromApi,
  lastSegmentDeltaFromCpiObservations,
  momPercentFromCpiObservations,
  periodPercentFromCpiObservations,
  sortCpiObservationsChronological,
} from "@/lib/economy/inflationCpiViewModel";

const observations = [
  { date: "2026-06-01", value: 319.6 },
  { date: "2026-02-01", value: 311.08 },
  { date: "2026-05-01", value: 318.2 },
  { date: "2026-03-01", value: 313.5 },
  { date: "2026-04-01", value: 315.9 },
];

describe("sortCpiObservationsChronological", () => {
  it("orders newest-first API payloads chronologically", () => {
    const sorted = sortCpiObservationsChronological(observations);
    expect(sorted.map((row) => row.date)).toEqual([
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
    ]);
  });
});

describe("periodPercentFromCpiObservations", () => {
  it("computes change from first to last index level", () => {
    expect(periodPercentFromCpiObservations(observations)).toBeCloseTo(2.74, 1);
  });

  it("returns null when fewer than two observations exist", () => {
    expect(
      periodPercentFromCpiObservations([{ date: "2026-06-01", value: 319.6 }]),
    ).toBeNull();
  });
});

describe("lastSegmentDeltaFromCpiObservations", () => {
  it("computes the final chart segment from May to June", () => {
    const delta = lastSegmentDeltaFromCpiObservations(observations);
    expect(delta.pct).toBeCloseTo(0.44, 1);
    expect(delta.previousMonthLabel).toBe("MAY 26");
    expect(delta.latestMonthLabel).toBe("JUN 26");
    expect(delta.trendsUp).toBe(true);
    expect(delta.label).toBe("+0.4% VS MAY 26");
  });

  it("reflects a downward final segment when the latest print falls", () => {
    const delta = lastSegmentDeltaFromCpiObservations([
      { date: "2026-04-01", value: 315.9 },
      { date: "2026-05-01", value: 318.2 },
      { date: "2026-06-01", value: 316.9 },
    ]);
    expect(delta.pct).toBeCloseTo(-0.41, 1);
    expect(delta.trendsUp).toBe(false);
    expect(delta.label).toBe("-0.4% VS MAY 26");
  });
});

describe("momPercentFromCpiObservations", () => {
  it("matches the final chart segment percent", () => {
    expect(momPercentFromCpiObservations(observations)).toBeCloseTo(0.44, 1);
  });
});

describe("inflationCpiHeadlineFromApi", () => {
  it("formats period and final-segment labels from CPI index levels", () => {
    const api: EconomyCpiResponse = {
      series_id: "CPIAUCSL",
      label: "Consumer Price Index",
      unit: "Index 1982-1984=100",
      observations,
    };
    const headline = inflationCpiHeadlineFromApi(api);

    expect(headline.valueLabel).toBe("+2.7%");
    expect(headline.periodLabel).toMatch(/Feb, 2026.*Jun, 2026/);
    expect(headline.lastSegmentDelta.label).toBe("+0.4% VS MAY 26");
    expect(headline.lastSegmentDelta.trendsUp).toBe(true);
    expect(headline.unavailable).toBe(false);
    expect(headline.observations).toHaveLength(5);
  });

  it("marks headline unavailable when response is empty", () => {
    const headline = inflationCpiHeadlineFromApi(null);
    expect(headline.unavailable).toBe(true);
    expect(headline.valueLabel).toBe("—");
    expect(headline.lastSegmentDelta.label).toBe("");
  });
});
