import type { EconomicSector } from "@/constants/data/usEconomicData";

import type {
  EconomyObservation,
  EconomyOverviewApiResponse,
  EconomyOverviewSectionKey,
} from "@/lib/economy/economyOverviewTypes";

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

function observationsChronologicalValues(
  observations: EconomyObservation[],
): number[] {
  return [...observations]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) => o.value);
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
  updatedAt: string;
};

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
    return {
      title: sector.title,
      headlineLabel: sector.headlineLabel,
      headlineValue: sector.headlineValue,
      history: sector.history,
      updatedAt: sector.updatedAt,
    };
  }

  const history = observationsChronologicalValues(section.observations);
  const sortedObs = [...section.observations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const latest = sortedObs[sortedObs.length - 1]!;

  return {
    title: sector.title,
    headlineLabel: section.label,
    headlineValue: formatOverviewMetricValue(latest.value, section.unit),
    history,
    updatedAt: formatObservationMonthYear(latest.date),
  };
}
