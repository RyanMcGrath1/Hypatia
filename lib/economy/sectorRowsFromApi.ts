/**
 * Adapts `/api/economy/labor/sector` payloads into the table rows rendered by
 * `LaborMarketDetailView`'s **EMPLOYMENT BY SECTOR** card.
 *
 * Inputs are FRED level series (PAYEMS and friends — thousands of persons).
 * Each row derives over the API date window (first → last observation):
 *  - Net change in thousands ("delta", e.g. `+52k`)
 *  - Period growth percentage ("growth", e.g. `+1.2%`)
 *  - Bar fill normalized against the largest |delta| in the visible set
 *
 * Sectors flagged with a per-series `error` string render as an "Unavailable"
 * row instead of being dropped, per the API contract.
 */
import type { LaborEmploymentSectorRow } from "@/components/economy/detail/labor/laborDetailData";
import type {
  EconomySectorResponse,
  EconomySectorSeries,
} from "@/hooks/api/economySectorApi";
import {
  excludeFromLaborSectorBreakdown,
  laborSectorDisplayName,
} from "@/lib/economy/laborSectorDisplayName";

/** Minimum bar width when a row has non-zero change but would otherwise be invisible. */
const MIN_BAR_FILL = 0.04;

type PeriodBounds = {
  start: { date: string; value: number };
  end: { date: string; value: number };
};

export type LaborSectorObservationWindow = {
  startDate?: string;
  endDate?: string;
};

/** Sorted numeric observations from a sector series, clipped to the API window. */
export function laborSectorNumericPoints(
  series: EconomySectorSeries,
  window?: LaborSectorObservationWindow,
): { date: string; value: number }[] {
  const numeric: { date: string; value: number }[] = [];
  for (const p of series.points) {
    if (p.value != null && Number.isFinite(p.value)) {
      numeric.push({ date: p.date, value: p.value });
    }
  }
  const startKey = window?.startDate?.trim().slice(0, 10);
  const endKey = window?.endDate?.trim().slice(0, 10);
  const clipped = numeric.filter((p) => {
    const d = p.date.slice(0, 10);
    if (startKey && d < startKey) {
      return false;
    }
    if (endKey && d > endKey) {
      return false;
    }
    return true;
  });
  clipped.sort((a, b) => a.date.localeCompare(b.date));
  return clipped;
}

/** First and last observation in the filtered window (matches payroll date range). */
function firstLastNumericPoints(
  series: EconomySectorSeries,
  window?: LaborSectorObservationWindow,
): PeriodBounds | null {
  const numeric = laborSectorNumericPoints(series, window);
  if (numeric.length < 2) {
    return null;
  }
  return {
    start: numeric[0]!,
    end: numeric[numeric.length - 1]!,
  };
}

/** % change vs. period start at each month (for sparklines). */
export function periodGrowthPctSeries(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const base = values[0]!;
  if (base === 0) {
    return values.map(() => 0);
  }
  return values.map((v) => ((v / base) - 1) * 100);
}

export function formatLaborSectorDeltaThousands(delta: number): string {
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const magnitude = Math.abs(rounded);
  if (magnitude >= 1000) {
    const inMillions = magnitude / 1000;
    const formatted = inMillions.toLocaleString("en-US", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
    return `${sign}${formatted}M`;
  }
  return `${sign}${magnitude.toLocaleString("en-US")}k`;
}

export function formatLaborSectorGrowthPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export type LaborSectorDerivedRow = {
  /** Order from `response.series`; sectors with errors keep their slot. */
  index: number;
  series: EconomySectorSeries;
  deltaThousands: number | null;
  growthPct: number | null;
  error?: string;
};

function formatMonthYearShort(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Human-readable window from `/api/economy/labor/sector` `start_date` / `end_date`. */
export function laborSectorPeriodRangeLabel(response: EconomySectorResponse): string {
  if (!response.startDate || !response.endDate) {
    return "";
  }
  const a = formatMonthYearShort(response.startDate);
  const b = formatMonthYearShort(response.endDate);
  return `${a} – ${b}`;
}

/** Net jobs and period % change per breakdown series for the API date window. */
export function deriveLaborSectorBreakdown(
  response: EconomySectorResponse,
): LaborSectorDerivedRow[] {
  const observationWindow: LaborSectorObservationWindow = {
    startDate: response.startDate,
    endDate: response.endDate,
  };
  const breakdownSeries = response.series.filter(
    (series) => !excludeFromLaborSectorBreakdown(series),
  );
  return breakdownSeries.map((series, index) => {
    if (series.error) {
      return {
        index,
        series,
        deltaThousands: null,
        growthPct: null,
        error: series.error,
      };
    }
    const bounds = firstLastNumericPoints(series, observationWindow);
    if (!bounds) {
      return {
        index,
        series,
        deltaThousands: null,
        growthPct: null,
      };
    }
    const delta = bounds.end.value - bounds.start.value;
    const growth =
      bounds.start.value !== 0 ? (delta / bounds.start.value) * 100 : 0;
    return {
      index,
      series,
      deltaThousands: delta,
      growthPct: growth,
    };
  });
}

/** Greatest period growth % first; unavailable rows sink to the bottom. */
export function sortDerivedByPeriodGrowth(
  derived: LaborSectorDerivedRow[],
): LaborSectorDerivedRow[] {
  return [...derived].sort((a, b) => {
    const av = a.growthPct ?? -Infinity;
    const bv = b.growthPct ?? -Infinity;
    return bv - av;
  });
}

/** Build display rows for the EMPLOYMENT BY SECTOR table from the API payload. */
export function sectorRowsFromApi(
  response: EconomySectorResponse,
): LaborEmploymentSectorRow[] {
  const derived = sortDerivedByPeriodGrowth(deriveLaborSectorBreakdown(response));

  const totalAbsDelta = derived.reduce(
    (sum, r) =>
      sum + (r.deltaThousands != null ? Math.abs(r.deltaThousands) : 0),
    0,
  );

  return derived.map((row) => {
    const sectorLabel = laborSectorDisplayName(row.series);
    if (row.error != null) {
      return {
        sector: sectorLabel,
        delta: "Unavailable",
        deltaPositive: null,
        growth: "—",
        growthPositive: null,
        barFill: 0,
      };
    }
    if (row.deltaThousands == null || row.growthPct == null) {
      return {
        sector: sectorLabel,
        delta: "—",
        deltaPositive: null,
        growth: "—",
        growthPositive: null,
        barFill: 0,
      };
    }
    const isPositive = row.deltaThousands > 0;
    const isNegative = row.deltaThousands < 0;
    const absDelta = Math.abs(row.deltaThousands);
    const fillRaw =
      totalAbsDelta > 0 ? absDelta / totalAbsDelta : 0;
    const barFill =
      fillRaw === 0
        ? 0
        : fillRaw < MIN_BAR_FILL
          ? MIN_BAR_FILL
          : Math.min(1, fillRaw);
    return {
      sector: sectorLabel,
      delta: formatLaborSectorDeltaThousands(row.deltaThousands),
      deltaPositive: isPositive ? true : isNegative ? false : null,
      growth: formatLaborSectorGrowthPercent(row.growthPct),
      growthPositive: isPositive ? true : isNegative ? false : null,
      barFill,
      barNegative: isNegative,
    };
  });
}
