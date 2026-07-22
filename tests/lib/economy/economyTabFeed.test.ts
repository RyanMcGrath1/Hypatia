import { describe, expect, it } from "vitest";

import type { EconomyOverviewApiResponse } from "@/lib/economy/economyOverviewTypes";
import { parseEconomyOverviewResponse } from "@/lib/economy/economyOverviewTypes";
import {
  buildEconomyFeedRows,
  buildEconomySentimentFallback,
  feedTrendLabel,
  formatFeedBarValue,
  getSentimentTrend,
  getTrendFromSeries,
  resolveEconomySentimentHero,
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
  it("inverts labor, inflation, and rates metric direction for sentiment", () => {
    expect(getSentimentTrend("labor", "up")).toBe("down");
    expect(getSentimentTrend("labor", "down")).toBe("up");
    expect(getSentimentTrend("inflation", "up")).toBe("down");
    expect(getSentimentTrend("rates", "down")).toBe("up");
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

describe("formatFeedBarValue", () => {
  it("formats signed YoY inflation values consistently with the headline", () => {
    expect(formatFeedBarValue(3.46, "percent", "signed-percent")).toBe("+3.5%");
    expect(formatFeedBarValue(4.2, "percent", "percent")).toBe("4.2%");
    expect(formatFeedBarValue(3.63, "percent", "percent")).toBe("3.63%");
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
      historyDates: ["2026-04-01", "2026-06-01"],
      metricTrend: "down",
      sentimentTrend: "up",
      valueFormat: "signed-percent",
    });
    expect(feedTrendLabel(inflation!.sentimentTrend)).toBe("STRENGTHENING");
  });

  it("falls back to mock YoY inflation history when overview is unavailable", () => {
    const rows = buildEconomyFeedRows(null);
    const inflation = rows.find((row) => row.id === "inflation");
    expect(inflation).toMatchObject({
      isLive: false,
      subtitle: "CPI (YoY)",
      value: "3.2%",
      valueFormat: "signed-percent",
      metricTrend: "down",
      sentimentTrend: "up",
    });
    expect(inflation?.history).toEqual([3.6, 3.5, 3.4, 3.35, 3.25, 3.2]);
  });

  it("uses live effective fed funds for rates tile with inverted easing sentiment", () => {
    const overview: EconomyOverviewApiResponse = {
      ...laborOverview,
      sections: {
        ...laborOverview.sections,
        interest_rates: {
          label: "Federal Funds Effective Rate",
          series_id: "FEDFUNDS",
          unit: "percent",
          observations: [
            { date: "2025-09-01", value: 4.22 },
            { date: "2025-11-01", value: 3.88 },
            { date: "2026-06-01", value: 3.63 },
          ],
        },
      },
    };

    const rates = buildEconomyFeedRows(overview).find((row) => row.id === "rates");
    expect(rates).toMatchObject({
      subtitle: "Effective Fed Funds",
      value: "3.63%",
      isLive: true,
      history: [4.22, 3.88, 3.63],
      historyDates: ["2025-09-01", "2025-11-01", "2026-06-01"],
      metricTrend: "down",
      sentimentTrend: "up",
      valueFormat: "percent",
    });
    expect(feedTrendLabel(rates!.sentimentTrend)).toBe("STRENGTHENING");
  });

  it("falls back to mock effective fed funds history when overview is unavailable", () => {
    const rows = buildEconomyFeedRows(null);
    const rates = rows.find((row) => row.id === "rates");
    expect(rates).toMatchObject({
      isLive: false,
      subtitle: "Effective Fed Funds",
      value: "3.63%",
      valueFormat: "percent",
      metricTrend: "down",
      sentimentTrend: "up",
    });
    expect(rates?.history).toEqual([4.22, 4.09, 3.88, 3.72, 3.64, 3.63]);
  });

  it("uses live derived QoQ GDP growth for the tile with strengthening sentiment", () => {
    const overview: EconomyOverviewApiResponse = {
      ...laborOverview,
      sections: {
        ...laborOverview.sections,
        gdp: {
          label: "Real Gross Domestic Product",
          series_id: "GDPC1",
          unit: "billions of chained 2017 dollars",
          observations: [
            { date: "2025-07-01", value: 24026.834 },
            { date: "2025-10-01", value: 24055.749 },
            { date: "2026-01-01", value: 24180.419 },
          ],
        },
      },
    };

    const gdp = buildEconomyFeedRows(overview).find((row) => row.id === "gdp");
    const q3ToQ4 = (24055.749 / 24026.834 - 1) * 400;
    const q4ToQ1 = (24180.419 / 24055.749 - 1) * 400;

    expect(gdp).toMatchObject({
      subtitle: "Real GDP (QoQ annualized)",
      isLive: true,
      historyDates: ["2025-10-01", "2026-01-01"],
      valueFormat: "signed-percent",
    });
    expect(gdp!.history[0]).toBeCloseTo(q3ToQ4, 4);
    expect(gdp!.history[1]).toBeCloseTo(q4ToQ1, 4);
    expect(gdp!.value).toBe(`+${q4ToQ1.toFixed(1)}%`);
    expect(gdp!.metricTrend).toBe("up");
    expect(gdp!.sentimentTrend).toBe("up");
    expect(feedTrendLabel(gdp!.sentimentTrend)).toBe("STRENGTHENING");
  });

  it("falls back to mock QoQ GDP history when overview is unavailable", () => {
    const rows = buildEconomyFeedRows(null);
    const gdp = rows.find((row) => row.id === "gdp");
    expect(gdp).toMatchObject({
      isLive: false,
      subtitle: "Real GDP (QoQ annualized)",
      value: "+2.1%",
      valueFormat: "signed-percent",
      metricTrend: "up",
      sentimentTrend: "up",
    });
    expect(gdp?.history).toEqual([1.9, -0.6, 3.8, 4.4, 0.5, 2.1]);
    expect(feedTrendLabel(gdp!.sentimentTrend)).toBe("STRENGTHENING");
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

  it("derives CPI YoY tile data from a live-shaped dashboard inflation section", () => {
    const raw = {
      as_of: "2026-07-22T15:11:50+00:00",
      sections: {
        inflation: {
          acceleration: "decelerating",
          label: "Consumer Price Index for All Urban Consumers: All Items",
          momInflation: -0.42,
          observations: [
            {
              acceleration: "decelerating",
              date: "2026-06-01",
              momInflation: -0.42,
              value: 332.568,
              yoyInflation: 3.46,
            },
            {
              acceleration: "decelerating",
              date: "2026-05-01",
              momInflation: 0.47,
              value: 333.979,
              yoyInflation: 4.17,
            },
            {
              acceleration: "decelerating",
              date: "2025-09-01",
              momInflation: 0.3,
              value: 324.245,
              yoyInflation: 3.02,
            },
          ],
          series_id: "CPIAUCSL",
          unit: "index",
          yoyInflation: 3.46,
        },
      },
    };

    const parsed = parseEconomyOverviewResponse(raw);
    expect(parsed).not.toBeNull();

    const sector = getEconomicSectorById("inflation");
    expect(sector).not.toBeNull();

    const display = getSectorCardDisplay(sector!, parsed);
    expect(display).toMatchObject({
      headlineLabel: "CPI (YoY)",
      headlineValue: "+3.5%",
      isLive: true,
      history: [3.02, 4.17, 3.46],
      historyDates: ["2025-09-01", "2026-05-01", "2026-06-01"],
      valueFormat: "signed-percent",
    });

    const inflation = buildEconomyFeedRows(parsed).find(
      (row) => row.id === "inflation",
    );
    expect(inflation).toMatchObject({
      subtitle: "CPI (YoY)",
      value: "+3.5%",
      metricTrend: "up",
      sentimentTrend: "down",
      isLive: true,
    });
    expect(feedTrendLabel(inflation!.sentimentTrend)).toBe("WEAKENING");
  });

  it("derives effective fed funds tile data from a live-shaped dashboard section", () => {
    const raw = {
      as_of: "2026-07-22T16:15:39+00:00",
      sections: {
        interest_rates: {
          label: "Federal Funds Effective Rate",
          series_id: "FEDFUNDS",
          unit: "percent",
          observations: [
            { date: "2026-06-01", value: 3.63 },
            { date: "2026-05-01", value: 3.63 },
            { date: "2025-09-01", value: 4.22 },
          ],
        },
      },
    };

    const parsed = parseEconomyOverviewResponse(raw);
    expect(parsed).not.toBeNull();

    const sector = getEconomicSectorById("rates");
    expect(sector).not.toBeNull();

    const display = getSectorCardDisplay(sector!, parsed);
    expect(display).toMatchObject({
      headlineLabel: "Effective Fed Funds",
      headlineValue: "3.63%",
      isLive: true,
      history: [4.22, 3.63, 3.63],
      valueFormat: "percent",
    });

    const rates = buildEconomyFeedRows(parsed).find((row) => row.id === "rates");
    expect(rates).toMatchObject({
      subtitle: "Effective Fed Funds",
      value: "3.63%",
      metricTrend: "down",
      sentimentTrend: "up",
      isLive: true,
    });
    expect(feedTrendLabel(rates!.sentimentTrend)).toBe("STRENGTHENING");
  });

  it("derives QoQ GDP tile data from a live-shaped dashboard section", () => {
    const raw = {
      as_of: "2026-07-22T16:24:41+00:00",
      sections: {
        gdp: {
          label: "Real Gross Domestic Product",
          series_id: "GDPC1",
          unit: "billions of chained 2017 dollars",
          observations: [
            { date: "2026-01-01", value: 24180.419 },
            { date: "2025-10-01", value: 24055.749 },
            { date: "2025-07-01", value: 24026.834 },
            { date: "2025-04-01", value: 23770.976 },
          ],
        },
      },
    };

    const parsed = parseEconomyOverviewResponse(raw);
    expect(parsed).not.toBeNull();

    const sector = getEconomicSectorById("gdp");
    expect(sector).not.toBeNull();

    const display = getSectorCardDisplay(sector!, parsed);
    expect(display.headlineLabel).toBe("Real GDP (QoQ annualized)");
    expect(display.isLive).toBe(true);
    expect(display.valueFormat).toBe("signed-percent");
    expect(display.history).toHaveLength(3);
    expect(display.historyDates).toEqual([
      "2025-07-01",
      "2025-10-01",
      "2026-01-01",
    ]);

    const gdp = buildEconomyFeedRows(parsed).find((row) => row.id === "gdp");
    expect(gdp?.subtitle).toBe("Real GDP (QoQ annualized)");
    expect(gdp?.isLive).toBe(true);
    expect(gdp?.history.length).toBe(3);
    expect(feedTrendLabel(gdp!.sentimentTrend)).toBeTruthy();
  });
});

describe("resolveEconomySentimentHero", () => {
  it("prefers backend sentiment payload when present", () => {
    const overview: EconomyOverviewApiResponse = {
      as_of: "2026-01-01T00:00:00+00:00",
      sections: {} as EconomyOverviewApiResponse["sections"],
      sentiment: {
        score: 72,
        volatility_pct: 2.4,
        stability: 68.2,
        status_label: "OPTIMAL",
        period_label: "MACRO INDEX",
        trend: "up",
        is_live: true,
      },
    };
    expect(resolveEconomySentimentHero(overview)).toEqual(overview.sentiment);
  });

  it("builds a composite fallback from live feed rows when sentiment is absent", () => {
    const overview: EconomyOverviewApiResponse = {
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
          observations: [
            { date: "2025-07-01", value: 22000 },
            { date: "2025-10-01", value: 22500 },
            { date: "2026-01-01", value: 23100 },
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
          observations: [
            { date: "2025-09-01", value: 4.4 },
            { date: "2025-11-01", value: 4.5 },
            { date: "2026-06-01", value: 4.2 },
          ],
        },
      },
    };

    const fallback = buildEconomySentimentFallback(overview);
    expect(fallback).toMatchObject({
      score: 75,
      status_label: "OPTIMAL",
      period_label: "MACRO INDEX",
      trend: "up",
      is_live: false,
    });
    expect(fallback?.volatility_pct).toBeUndefined();
  });
});
