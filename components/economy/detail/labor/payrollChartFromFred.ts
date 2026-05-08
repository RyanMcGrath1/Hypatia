import type { FredObservationRow } from "@/hooks/api/fredObservations";

export type PayrollBarPoint = {
  label: string;
  /** FRED observation_date (YYYY-MM-DD). */
  observationDate: string;
  /** Level in thousands (PAYEMS). */
  levelThousands: number;
  /** Change vs the prior bar in this chart window; null for the first bar. */
  momVsPriorThousands: number | null;
  /** 0–1 for bar height multiplier */
  relativeHeight: number;
};

export type PayrollChartFromFred = {
  bars: PayrollBarPoint[];
  /** Month-over-month change in thousands (latest − prior month), from full series. */
  monthOverMonthThousands: number | null;
  /** Date string (YYYY-MM-DD) of the newest observation in the payload. */
  latestObservationDate: string;
  /** e.g. "DECEMBER 2023" from latest observation */
  periodLabel: string;
  /** Headline month-over-month change (e.g. "+216k"); "—" if not computable. */
  heroMetric: string;
};

function parseObservationNumber(value: string): number | null {
  const t = value.trim();
  if (t === "" || t === ".") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Parse YYYY-MM-DD → stable month label */
function formatMonthShort(dateStr: string): string {
  const d = new Date(`${dateStr.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return dateStr.slice(0, 7);
  }
  return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function formatPeriodBanner(dateStr: string): string {
  const d = new Date(`${dateStr.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return `PERIOD ${dateStr}`;
  }
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const year = d.getFullYear();
  return `PERIOD ${month} ${year}`;
}

function formatMomThousands(delta: number): string {
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : "";
  if (Math.abs(rounded) >= 1000) {
    return `${sign}${(rounded / 1000).toFixed(1)}M`;
  }
  return `${sign}${rounded}k`;
}

function formatLevelCallout(levelThousands: number): string {
  const millions = levelThousands / 1000;
  return `${millions.toFixed(1)}M`;
}

/** Level as e.g. `153.3M` (PAYEMS = thousands of persons → millions). */
export function formatPayemsLevelMillionsShort(levelThousands: number): string {
  return formatLevelCallout(levelThousands);
}

/** MoM delta in thousands as e.g. `+216k`. */
export function formatPayemsMomDeltaShort(deltaThousands: number): string {
  return formatMomThousands(deltaThousands);
}

/**
 * PAYEMS is reported in thousands of persons; values are levels.
 * Headline stats use the **newest two points in the full payload**, not only the last `barCount` bars.
 */
export function buildPayrollChartFromFredObservations(
  observations: FredObservationRow[],
  barCount = 7,
): PayrollChartFromFred | null {
  const pairs: { date: string; value: number }[] = [];
  for (const row of observations) {
    const v = parseObservationNumber(row.value);
    if (v == null) {
      continue;
    }
    pairs.push({ date: row.date.trim(), value: v });
  }

  if (pairs.length === 0) {
    return null;
  }

  pairs.sort((a, b) => a.date.localeCompare(b.date));

  const latestObs = pairs[pairs.length - 1]!;
  const priorObs = pairs.length >= 2 ? pairs[pairs.length - 2]! : null;
  const monthOverMonthThousands =
    priorObs != null ? latestObs.value - priorObs.value : null;
  const momLabel =
    monthOverMonthThousands != null
      ? formatMomThousands(monthOverMonthThousands)
      : null;
  /** Always MoM when comparable; never the raw level (that belongs under a bar tooltip). */
  const heroMetric = momLabel ?? "—";
  const periodLabel = formatPeriodBanner(latestObs.date);
  const latestObservationDate = latestObs.date;

  const slice = pairs.slice(-Math.max(barCount, 1));
  const values = slice.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const bars: PayrollBarPoint[] = slice.map((p, i) => {
    const normalized =
      range === 0 ? 0.55 : 0.28 + ((p.value - min) / range) * 0.72;
    const prevInSlice = i > 0 ? slice[i - 1]! : null;
    const momVsPriorThousands =
      prevInSlice != null ? p.value - prevInSlice.value : null;
    return {
      label: formatMonthShort(p.date),
      observationDate: p.date,
      levelThousands: p.value,
      momVsPriorThousands,
      relativeHeight: normalized,
    };
  });

  return {
    bars,
    monthOverMonthThousands,
    latestObservationDate,
    periodLabel,
    heroMetric,
  };
}
