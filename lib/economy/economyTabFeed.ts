import {
  US_ECONOMIC_SECTORS,
  type SectorTrend,
} from "@/constants/data/usEconomicData";
import type { EconomyOverviewApiResponse } from "@/lib/economy/economyOverviewTypes";
import {
  formatOverviewMetricValue,
  getSectorCardDisplay,
  SECTOR_ID_TO_OVERVIEW_KEY,
} from "@/lib/economy/sectorOverviewMerge";

export type FeedRow = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  /** Raw direction of the plotted metric (first → last observation). */
  metricTrend: SectorTrend;
  /** Sector-aware labor-market interpretation for labels and colors. */
  sentimentTrend: SectorTrend;
  history: number[];
  /** ISO dates aligned with `history` when observations came from the API */
  historyDates?: string[];
  /** Section unit for formatting selected bar values */
  valueUnit?: string;
  /** True when this tile id maps to an overview `sections` key (still may have zero observations). */
  overviewSectionBound: boolean;
  /** True when headline/history came from live overview API data. */
  isLive: boolean;
};

/** Matches `sections` keys from `GET /api/economy/dashboard` via sector overview merge. */
export const ECONOMY_FEED_IDS = ["labor", "inflation", "rates", "gdp"] as const;

/** Sectors where a rising metric is generally negative for conditions (unemployment, inflation, rates). */
const INVERSE_SENTIMENT_SECTORS = new Set<string>(["labor", "inflation", "rates"]);

export function getTrendFromSeries(
  values: number[],
  fallback: SectorTrend,
): SectorTrend {
  if (values.length < 2) {
    return fallback;
  }
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (last > first) {
    return "up";
  }
  if (last < first) {
    return "down";
  }
  return "flat";
}

export function getSentimentTrend(
  sectorId: string,
  metricTrend: SectorTrend,
): SectorTrend {
  if (metricTrend === "flat") {
    return "flat";
  }
  if (INVERSE_SENTIMENT_SECTORS.has(sectorId)) {
    return metricTrend === "up" ? "down" : "up";
  }
  return metricTrend;
}

export function feedTrendLabel(sentimentTrend: SectorTrend): string {
  if (sentimentTrend === "up") {
    return "STRENGTHENING";
  }
  if (sentimentTrend === "down") {
    return "WEAKENING";
  }
  return "STABLE";
}

export function metricTrendArrowIcon(trend: SectorTrend) {
  if (trend === "up") {
    return "arrow-up-right" as const;
  }
  if (trend === "down") {
    return "arrow-down-right" as const;
  }
  return "arrow-right" as const;
}

export function sentimentTrendVisual(sentimentTrend: SectorTrend, isDark: boolean) {
  if (sentimentTrend === "up") {
    return {
      color: isDark ? "#4ADE80" : "#16A34A",
    };
  }
  if (sentimentTrend === "down") {
    return {
      color: "#E26D5A",
    };
  }
  return {
    color: isDark ? "#FACC15" : "#CA8A04",
  };
}

/** @deprecated Prefer {@link metricTrendArrowIcon} + {@link sentimentTrendVisual}. */
export function trendVisual(trend: SectorTrend, isDark: boolean) {
  return {
    icon: metricTrendArrowIcon(trend),
    ...sentimentTrendVisual(trend, isDark),
  };
}

export function sentimentLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

export function normalizeBars(values: number[]) {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) {
    return values.map(() => 0.55);
  }
  return values.map((value) => {
    const normalized = (value - min) / range;
    // Keep bars visible even for lower points.
    return 0.28 + normalized * 0.72;
  });
}

export function resolveFeedBarSelectionIndex(
  rowId: string,
  barCount: number,
  map: Record<string, number>,
): number {
  if (barCount <= 0) return 0;
  const stored = map[rowId];
  if (typeof stored === "number" && stored >= 0 && stored < barCount) {
    return stored;
  }
  return barCount - 1;
}

export function formatFeedBarValue(
  raw: number,
  unit: string | undefined,
): string {
  if (unit) {
    return formatOverviewMetricValue(raw, unit);
  }
  return raw.toLocaleString("en-US", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}

export function buildEconomyFeedRows(
  economyOverview: EconomyOverviewApiResponse | null,
): FeedRow[] {
  return ECONOMY_FEED_IDS.map((id) =>
    US_ECONOMIC_SECTORS.find((sector) => sector.id === id),
  )
    .filter(
      (sector): sector is (typeof US_ECONOMIC_SECTORS)[number] =>
        sector != null,
    )
    .map((sector) => {
      const display = getSectorCardDisplay(sector, economyOverview);
      const metricTrend = getTrendFromSeries(display.history, sector.trend);
      const sentimentTrend = getSentimentTrend(sector.id, metricTrend);

      return {
        id: sector.id,
        title: display.title.toUpperCase(),
        subtitle: display.headlineLabel,
        value: display.headlineValue,
        metricTrend,
        sentimentTrend,
        history: display.history,
        historyDates: display.historyDates,
        valueUnit: display.valueUnit,
        overviewSectionBound: Boolean(SECTOR_ID_TO_OVERVIEW_KEY[sector.id]),
        isLive: display.isLive,
      };
    });
}
