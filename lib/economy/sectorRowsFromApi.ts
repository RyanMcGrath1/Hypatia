/**
 * Adapts `/api/economy/labor/sector` payloads into the table rows rendered by
 * `LaborMarketDetailView`'s **EMPLOYMENT BY SECTOR** card.
 *
 * Inputs are FRED level series (PAYEMS and friends — thousands of persons).
 * Each row derives:
 *  - MoM change in thousands ("delta", e.g. `+52k`)
 *  - MoM growth percentage ("growth", e.g. `+1.2%`)
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
import { laborSectorDisplayName } from "@/lib/economy/laborSectorDisplayName";

/** Minimum bar width (as a fraction of the largest) so tiny moves are still visible. */
const MIN_BAR_FILL = 0.06;

type LastTwoPoints = {
  latest: { date: string; value: number };
  prior: { date: string; value: number };
};

function lastTwoNumericPoints(
  series: EconomySectorSeries,
): LastTwoPoints | null {
  const numeric: { date: string; value: number }[] = [];
  for (const p of series.points) {
    if (p.value != null && Number.isFinite(p.value)) {
      numeric.push({ date: p.date, value: p.value });
    }
  }
  if (numeric.length < 2) {
    return null;
  }
  numeric.sort((a, b) => a.date.localeCompare(b.date));
  const latest = numeric[numeric.length - 1]!;
  const prior = numeric[numeric.length - 2]!;
  return { latest, prior };
}

function formatDeltaThousands(delta: number): string {
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

function formatGrowthPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

type DerivedRow = {
  /** Order from `response.series`; sectors with errors keep their slot. */
  index: number;
  series: EconomySectorSeries;
  deltaThousands: number | null;
  growthPct: number | null;
  error?: string;
};

function deriveRows(response: EconomySectorResponse): DerivedRow[] {
  return response.series.map((series, index) => {
    if (series.error) {
      return {
        index,
        series,
        deltaThousands: null,
        growthPct: null,
        error: series.error,
      };
    }
    const pair = lastTwoNumericPoints(series);
    if (!pair) {
      return {
        index,
        series,
        deltaThousands: null,
        growthPct: null,
      };
    }
    const delta = pair.latest.value - pair.prior.value;
    const growth = pair.prior.value !== 0 ? (delta / pair.prior.value) * 100 : 0;
    return {
      index,
      series,
      deltaThousands: delta,
      growthPct: growth,
    };
  });
}

/** Build display rows for the EMPLOYMENT BY SECTOR table from the API payload. */
export function sectorRowsFromApi(
  response: EconomySectorResponse,
): LaborEmploymentSectorRow[] {
  const derived = deriveRows(response);

  const magnitudes = derived
    .map((r) => (r.deltaThousands != null ? Math.abs(r.deltaThousands) : 0))
    .filter((m) => m > 0);
  const maxMagnitude = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;

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
    const fillRaw =
      maxMagnitude > 0 ? Math.abs(row.deltaThousands) / maxMagnitude : 0;
    const barFill =
      fillRaw === 0 ? 0 : Math.max(MIN_BAR_FILL, Math.min(1, fillRaw));
    return {
      sector: sectorLabel,
      delta: formatDeltaThousands(row.deltaThousands),
      deltaPositive: isPositive ? true : isNegative ? false : null,
      growth: formatGrowthPercent(row.growthPct),
      growthPositive: isPositive ? true : isNegative ? false : null,
      barFill,
      barNegative: isNegative,
    };
  });
}
