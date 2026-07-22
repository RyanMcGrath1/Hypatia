import { describe, expect, it } from "vitest";

import type { EconomyOverviewApiResponse } from "@/lib/economy/economyOverviewTypes";
import {
  buildEconomyFeedRows,
  feedTrendLabel,
  getSentimentTrend,
  getTrendFromSeries,
} from "@/lib/economy/economyTabFeed";
import { getSectorCardDisplay } from "@/lib/economy/sectorOverviewMerge";
import { getEconomicSectorById } from "@/constants/data/usEconomicData";

describe("getTrendFromSeries", () => {
  it("derives up/down/flat from first and last values", () => {
    expect(getTrendFromSeries([4.4, 4.2], "flat")).toBe("down");
    expect(getTrendFromSeries([4.2, 4.4], "flat")).toBe("up");
    expect(getTrendFromSeries([4.2, 4.2], "flat")).toBe("flat");
    expect(getTrendFromSeries([4.2], "up")).toBe("up");
  });
});

describe("getSentimentTrend", () => {
  it("inverts labor and inflation metric direction for sentiment", () => {
    expect(getSentimentTrend("labor", "up")).toBe("down");
    expect(getSentimentTrend("labor", "down")).toBe("up");
    expect(getSentimentTrend("inflation", "up")).toBe("down");
  });

  it("keeps gdp metric direction for sentiment", () => {
    expect(getSentimentTrend("gdp", "up")).toBe("up");
    expect(getSentimentTrend("gdp", "down")).toBe("down");
  });
});

describe("feedTrendLabel", () => {
  it("maps sentiment trend to tile copy", () => {
    expect(feedTrendLabel("up")).toBe("STRENGTHENING");
    expect(feedTrendLabel("down")).toBe("WEAKENING");
    expect(feedTrendLabel("flat")).toBe("STABLE");
  });
});

describe("buildEconomyFeedRows", () => {
  const laborOverview: EconomyOverviewApiResponse = {
    as_of: "2026-07-22T15:11:50+00:00",
    sections: {
      consumer_spending: {
        label: "PCE",
        series_id: "PCE",
        unit: "billions",
        observations: [],
      },
      gdp: {
        label: "GDP",
        series_id: "GDPC1",
        unit: "billions",
        observations: [],
      },
      housing: {
        label: "Housing",
        series_id: "CSUSHPISA",
        unit: "index",
        observations: [],
      },
      inflation: {
        label: "CPI",
        series_id: "CPIAUCSL",
        unit: "index",
        observations: [],
      },
      interest_rates: {
        label: "Fed Funds",
        series_id: "FEDFUNDS",
        unit: "percent",
        observations: [],
      },
      labor: {
        label: "Unemployment Rate",
        series_id: "UNRATE",
        unit: "percent",
        observations: [
          { date: "2025-09-01", value: 4.4 },
          { date: "2025-11-01", value: 4.5 },
          { date: "2026-06-01", value: 4.2 },
        ],
      },
    },
  };

  it("uses live labor observations for value, history, and inverted sentiment", () => {
    const rows = buildEconomyFeedRows(laborOverview);
    const labor = rows.find((row) => row.id === "labor");
    expect(labor).toMatchObject({
      subtitle: "Unemployment Rate",
      value: "4.2%",
      metricTrend: "down",
      sentimentTrend: "up",
      isLive: true,
      history: [4.4, 4.5, 4.2],
    });
    expect(feedTrendLabel(labor!.sentimentTrend)).toBe("STRENGTHENING");
  });

  it("falls back to mock sector history when overview is unavailable", () => {
    const rows = buildEconomyFeedRows(null);
    const labor = rows.find((row) => row.id === "labor");
    expect(labor?.isLive).toBe(false);
    expect(labor?.value).toBe("4.0%");
    expect(labor?.history.length).toBeGreaterThan(0);
  });

  it("uses CPI YoY for inflation tile when backend provides yoyInflation", () => {
    const overview: EconomyOverviewApiResponse = {
      ...laborOverview,
      sections: {
        ...laborOverview.sections,
        inflation: {
          label: "CPI",
          series_id: "CPIAUCSL",
          unit: "index",
          yoyInflation: 3.5,
          observations: [
            { date: "2026-04-01", value: 332, yoyInflation: 3.8 },
            { date: "2026-06-01", value: 333, yoyInflation: 3.5 },
          ],
        },
      },
    };

    const inflation = buildEconomyFeedRows(overview).find(
      (row) => row.id === "inflation",
    );
    expect(inflation).toMatchObject({
      subtitle: "CPI (YoY)",
      value: "+3.5%",
      isLive: true,
      history: [3.8, 3.5],
      metricTrend: "down",
      sentimentTrend: "up",
    });
  });
});

describe("getSectorCardDisplay", () => {
  it("computes annualized GDP growth from level observations", () => {
    const sector = getEconomicSectorById("gdp");
    expect(sector).not.toBeNull();
    const display = getSectorCardDisplay(sector!, {
      as_of: "2026-07-22T15:11:50+00:00",
      sections: {
        consumer_spending: {
          label: "PCE",
          series_id: "PCE",
          unit: "billions",
          observations: [],
        },
        gdp: {
          label: "Real GDP",
          series_id: "GDPC1",
          unit: "billions of chained 2017 dollars",
          observations: [
            { date: "2025-10-01", value: 100 },
            { date: "2026-01-01", value: 101 },
          ],
        },
        housing: {
          label: "Housing",
          series_id: "CSUSHPISA",
          unit: "index",
          observations: [],
        },
        inflation: {
          label: "CPI",
          series_id: "CPIAUCSL",
          unit: "index",
          observations: [],
        },
        interest_rates: {
          label: "Fed Funds",
          series_id: "FEDFUNDS",
          unit: "percent",
          observations: [],
        },
        labor: {
          label: "Unemployment Rate",
          series_id: "UNRATE",
          unit: "percent",
          observations: [],
        },
      },
    });

    expect(display.headlineLabel).toBe("Real GDP (QoQ annualized)");
    expect(display.headlineValue).toBe("+4.0%");
    expect(display.history[0]).toBeCloseTo(4, 5);
  });
});
