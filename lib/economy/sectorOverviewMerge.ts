import type { EconomicSector } from "@/constants/data/usEconomicData";

import type {
  EconomyObservation,
  EconomyOverviewApiResponse,
  EconomyOverviewSectionKey,
} from "@/lib/economy/economyOverviewTypes";

/** Maps `US_ECONOMIC_SECTORS[].id` → short tile subtitle (overrides long FRED labels). */
const SECTOR_TILE_HEADLINE_LABEL: Partial<Record<string, string>> = {
  labor: "Unemployment Rate",
  rates: "Effective Fed Funds",
  inflation: "CPI (YoY)",
};

/** Format a policy/market rate in percent for overview tiles. */
export function formatPercentRate(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

/** Maps `US_ECONOMIC_SECTORS[].id` → `EconomyOverviewApiResponse.sections` key. */
export const SECTOR_ID_TO_OVERVIEW_KEY: Record<
  string,
  EconomyOverviewSectionKey
> = {
  consumer: "consumer_spending",
  gdp: "gdp",
  housing: "housing",
  inflation: "inflation",
  rates: "interest_rates",
  labor: "labor",
};

function tileHeadlineLabel(sector: EconomicSector, sectionLabel: string): string {
  return (
    SECTOR_TILE_HEADLINE_LABEL[sector.id] ??
    (sectionLabel.trim() || sector.headlineLabel)
  );
}

function sortedObservations(
  observations: EconomyObservation[],
): EconomyObservation[] {
  return [...observations].sort((a, b) => a.date.localeCompare(b.date));
}

function observationsChronologicalValues(
  observations: EconomyObservation[],
): number[] {
  return sortedObservations(observations).map((o) => o.value);
}

/** Display string for the headline figure from API `unit` + raw value. */
export function formatOverviewMetricValue(value: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u.includes("percent")) {
    return `${value}%`;
  }
  if (u.includes("billions")) {
    return `${value.toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })}B`;
  }
  if (u.includes("index")) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 3,
      minimumFractionDigits: 3,
    });
  }
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function formatSignedPercent(value: number, digits = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** How feed tiles format numeric bar/headline values. */
export type FeedValueFormat = "unit" | "percent" | "signed-percent";

/** `YYYY-MM-DD` → e.g. `Mar 2026` for card foot line. */
export function formatObservationMonthYear(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const y = parts[0];
    const m = parts[1];
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return isoDate;
}

export type SectorCardDisplay = {
  title: string;
  headlineLabel: string;
  headlineValue: string;
  history: number[];
  historyDates?: string[];
  updatedAt: string;
  /** True when headline/history came from overview API observations. */
  isLive: boolean;
  valueUnit?: string;
  valueFormat?: FeedValueFormat;
};

type DerivedSeriesPoint = { date: string; value: number };

function inflationYoySeries(
  section: { observations: EconomyObservation[]; yoyInflation?: number },
): DerivedSeriesPoint[] {
  const fromObs = sortedObservations(section.observations)
    .map((o) => {
      const yoy = o.yoyInflation;
      if (typeof yoy !== "number" || !Number.isFinite(yoy)) {
        return null;
      }
      return { date: o.date, value: yoy };
    })
    .filter((row): row is DerivedSeriesPoint => row != null);

  if (fromObs.length > 0) {
    return fromObs;
  }

  if (
    typeof section.yoyInflation === "number" &&
    Number.isFinite(section.yoyInflation)
  ) {
    const latest = sortedObservations(section.observations).at(-1);
    if (latest) {
      return [{ date: latest.date, value: section.yoyInflation }];
    }
  }

  return [];
}

function gdpQoqAnnualizedSeries(
  observations: EconomyObservation[],
): DerivedSeriesPoint[] {
  const sorted = sortedObservations(observations);
  const out: DerivedSeriesPoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!.value;
    const curr = sorted[i]!.value;
    if (prev <= 0) {
      continue;
    }
    out.push({
      date: sorted[i]!.date,
      value: (curr / prev - 1) * 400,
    });
  }
  return out;
}

function displayFromDerivedSeries(
  sector: EconomicSector,
  series: DerivedSeriesPoint[],
  options: {
    headlineLabel?: string;
    valueUnit?: string;
    valueFormat?: FeedValueFormat;
    formatValue?: (value: number) => string;
  } = {},
): SectorCardDisplay | null {
  if (series.length === 0) {
    return null;
  }
  const latest = series[series.length - 1]!;
  const formatValue =
    options.formatValue ??
    ((value: number) => formatSignedPercent(value));
  return {
    title: sector.title,
    headlineLabel: options.headlineLabel ?? sector.headlineLabel,
    headlineValue: formatValue(latest.value),
    history: series.map((point) => point.value),
    historyDates: series.map((point) => point.date),
    updatedAt: formatObservationMonthYear(latest.date),
    isLive: true,
    valueUnit: options.valueUnit ?? "percent",
    valueFormat: options.valueFormat ?? "signed-percent",
  };
}

function mockSectorDisplay(sector: EconomicSector): SectorCardDisplay {
  const valueFormat: FeedValueFormat | undefined =
    sector.id === "inflation" || sector.id === "gdp"
      ? "signed-percent"
      : sector.id === "labor" || sector.id === "rates"
        ? "percent"
        : undefined;
  return {
    title: sector.title,
    headlineLabel: tileHeadlineLabel(sector, sector.headlineLabel),
    headlineValue: sector.headlineValue,
    history: sector.history,
    updatedAt: sector.updatedAt,
    isLive: false,
    valueUnit:
      valueFormat === "percent" || sector.id === "rates" ? "percent" : undefined,
    valueFormat,
  };
}

/**
 * Merge overview API rows into tile copy when available; otherwise use mock `sector` fields.
 */
export function getSectorCardDisplay(
  sector: EconomicSector,
  overview: EconomyOverviewApiResponse | null,
): SectorCardDisplay {
  const key = SECTOR_ID_TO_OVERVIEW_KEY[sector.id];
  const section =
    key && overview?.sections ? overview.sections[key] : undefined;

  if (
    !section ||
    !Array.isArray(section.observations) ||
    section.observations.length === 0
  ) {
    return mockSectorDisplay(sector);
  }

  if (sector.id === "inflation") {
    const yoySeries = inflationYoySeries(section);
    const derived = displayFromDerivedSeries(sector, yoySeries, {
      headlineLabel: tileHeadlineLabel(sector, section.label),
      valueUnit: "percent",
      valueFormat: "signed-percent",
    });
    if (derived) {
      return derived;
    }
  }

  if (sector.id === "gdp") {
    const qoqSeries = gdpQoqAnnualizedSeries(section.observations);
    const derived = displayFromDerivedSeries(sector, qoqSeries, {
      headlineLabel: sector.headlineLabel,
      valueUnit: "percent",
      valueFormat: "signed-percent",
    });
    if (derived) {
      return derived;
    }
  }

  const sortedObs = sortedObservations(section.observations);
  const latest = sortedObs[sortedObs.length - 1]!;
  const history = observationsChronologicalValues(section.observations);
  const isPercentUnit = section.unit.toLowerCase().includes("percent");
  const headlineValue =
    sector.id === "rates" && isPercentUnit
      ? formatPercentRate(latest.value)
      : formatOverviewMetricValue(latest.value, section.unit);

  return {
    title: sector.title,
    headlineLabel: tileHeadlineLabel(sector, section.label),
    headlineValue,
    history,
    historyDates: sortedObs.map((o) => o.date),
    updatedAt: formatObservationMonthYear(latest.date),
    isLive: true,
    valueUnit: section.unit,
    valueFormat: isPercentUnit ? "percent" : "unit",
  };
}
