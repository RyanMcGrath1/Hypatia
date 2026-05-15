import {
  US_ECONOMIC_SECTORS,
  type SectorTrend,
} from "@/constants/data/usEconomicData";
import {
  isEconomySectionPayload,
  type EconomyOverviewApiResponse,
} from "@/lib/economy/economyOverviewTypes";
import {
  formatObservationMonthYear,
  formatOverviewMetricValue,
  getSectorCardDisplay,
  SECTOR_ID_TO_OVERVIEW_KEY,
} from "@/lib/economy/sectorOverviewMerge";

export type FeedRow = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  trend: SectorTrend;
  history: number[];
  /** ISO dates aligned with `history` when observations came from the API */
  historyDates?: string[];
  /** Section unit for formatting selected bar values */
  valueUnit?: string;
  /** True when this tile id maps to an overview `sections` key (still may have zero observations). */
  overviewSectionBound: boolean;
};

/** Matches `sections` keys from `GET /api/economy/{id}/dashboard` via {@link SECTOR_ID_TO_OVERVIEW_KEY}. */
export const ECONOMY_FEED_IDS = ["labor", "inflation", "rates", "gdp"] as const;

export function trendVisual(trend: SectorTrend, isDark: boolean) {
  if (trend === "up") {
    return {
      icon: "arrow-up-right" as const,
      color: isDark ? "#4ADE80" : "#16A34A",
    };
  }
  if (trend === "down") {
    return {
      icon: "arrow-down-right" as const,
      color: "#E26D5A",
    };
  }
  return {
    icon: "arrow-right" as const,
    color: isDark ? "#FACC15" : "#CA8A04",
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

export function formatFeedBarValue(raw: number, unit: string | undefined): string {
  if (unit) {
    return formatOverviewMetricValue(raw, unit);
  }
  return raw.toLocaleString("en-US", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}

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
      const sectionKey = SECTOR_ID_TO_OVERVIEW_KEY[sector.id];
      const rawSection =
        sectionKey && economyOverview?.sections
          ? economyOverview.sections[sectionKey]
          : undefined;
      const section = isEconomySectionPayload(rawSection) ? rawSection : undefined;
      const sortedObs =
        section && section.observations.length > 0
          ? [...section.observations].sort((a, b) =>
              a.date.localeCompare(b.date),
            )
          : [];
      const history = sortedObs.map((o) => o.value);
      const historyDates =
        sortedObs.length > 0 ? sortedObs.map((o) => o.date) : undefined;
      return {
        id: sector.id,
        title: display.title.toUpperCase(),
        subtitle: display.headlineLabel,
        value: display.headlineValue,
        trend: getTrendFromSeries(history, sector.trend),
        history,
        historyDates,
        valueUnit: section?.unit,
        overviewSectionBound: Boolean(sectionKey),
      };
    });
}
