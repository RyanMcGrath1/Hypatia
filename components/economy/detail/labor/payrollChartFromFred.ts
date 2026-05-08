import type { FredObservationRow } from "@/hooks/api/fredObservations";

/** UI presets: YTD or trailing month window ending at the latest observation in the payload. */
export const PAYROLL_CHART_RANGE_PRESETS = [
  { key: "ytd", label: "YTD", mode: "ytd" as const },
  {
    key: "py",
    label: "PY",
    mode: "last_full_year" as const,
  },
  { key: "1y", label: "1Y", mode: "trailing" as const, months: 12 },
  { key: "2y", label: "2Y", mode: "trailing" as const, months: 24 },
  { key: "3y", label: "3Y", mode: "trailing" as const, months: 36 },
  { key: "4y", label: "4Y", mode: "trailing" as const, months: 48 },
  { key: "5y", label: "5Y", mode: "trailing" as const, months: 60 },
] as const;

export type PayrollChartRangePreset = (typeof PAYROLL_CHART_RANGE_PRESETS)[number];
export type PayrollChartRangeKey = PayrollChartRangePreset["key"];

export type PayrollBarPoint = {
  label: string;
  /** FRED observation_date (YYYY-MM-DD) for this month slot. */
  observationDate: string;
  /** Level in thousands when FRED has data; null for placeholder months (YTD). */
  levelThousands: number | null;
  /** Change vs the prior calendar month when **both** months have data; else null. */
  momVsPriorThousands: number | null;
  /** 0–1 for bar height multiplier; 0 when no observation. */
  relativeHeight: number;
  /** False when this month has no PAYEMS print in range (YTD skeleton). */
  hasObservation: boolean;
};

export type PayrollChartFromFred = {
  bars: PayrollBarPoint[];
  /** Month-over-month change in thousands (latest − prior month), from months with data. */
  monthOverMonthThousands: number | null;
  /** Newest observation date in this chart context; empty string when no data in range. */
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

type SortedPayemsPair = { date: string; row: FredObservationRow };

function collectSortedValidPayemsPairs(observations: FredObservationRow[]): SortedPayemsPair[] {
  const pairs: SortedPayemsPair[] = [];
  for (const row of observations) {
    const v = parseObservationNumber(row.value);
    if (v == null) {
      continue;
    }
    const date = row.date.trim();
    pairs.push({
      date,
      row: { ...row, date, value: row.value.trim() },
    });
  }
  pairs.sort((a, b) => a.date.localeCompare(b.date));
  return pairs;
}

/**
 * **Year-to-date** for the **device’s current calendar year** (local): every monthly observation
 * from `YYYY-01-01` through `YYYY-12-31` present in the payload (`YYYY = today.getFullYear()`).
 * If nothing exists yet for that year (e.g. January before the first print), falls back to the same
 * Jan–Dec window for the **newest observation’s year** so the chart still fills.
 */
export function filterPayemsObservationsYearToDate(
  observations: FredObservationRow[],
  now: Date = new Date(),
): FredObservationRow[] {
  const pairs = collectSortedValidPayemsPairs(observations);
  if (pairs.length === 0) {
    return [];
  }

  const calendarYear = now.getFullYear();
  const cutoff = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;

  const inYearRange = (p: SortedPayemsPair) => p.date >= cutoff && p.date <= yearEnd;
  let out = pairs.filter(inYearRange).map((p) => p.row);

  if (out.length === 0) {
    const latestIso = pairs[pairs.length - 1]!.date;
    const latestDate = new Date(`${latestIso}T12:00:00`);
    if (Number.isNaN(latestDate.getTime())) {
      return [];
    }
    const y = latestDate.getFullYear();
    const fbStart = `${y}-01-01`;
    const fbEnd = `${y}-12-31`;
    out = pairs
      .filter((p) => p.date >= fbStart && p.date <= fbEnd)
      .map((p) => p.row);
  }

  return out;
}

/** Calendar year used for YTD skeleton: local year if the feed has any point in that year, else latest obs year. */
export function resolvePayrollYtdCalendarYear(
  observations: FredObservationRow[],
  now: Date = new Date(),
): number | null {
  const pairs = collectSortedValidPayemsPairs(observations);
  if (pairs.length === 0) {
    return null;
  }
  const calendarYear = now.getFullYear();
  const start = `${calendarYear}-01-01`;
  const end = `${calendarYear}-12-31`;
  if (pairs.some((p) => p.date >= start && p.date <= end)) {
    return calendarYear;
  }
  const latestIso = pairs[pairs.length - 1]!.date;
  const latestDate = new Date(`${latestIso}T12:00:00`);
  if (Number.isNaN(latestDate.getTime())) {
    return null;
  }
  return latestDate.getFullYear();
}

/**
 * **Prior full calendar year** for a Jan–Dec skeleton: prefers `now.getFullYear() - 1` when the feed has any
 * observation in that window (same clock/data idea as {@link resolvePayrollYtdCalendarYear}). Otherwise uses
 * the latest observation — if its month is December, that year; else the previous calendar year.
 */
export function resolvePayrollLastFullCalendarYear(
  observations: FredObservationRow[],
  now: Date = new Date(),
): number | null {
  const pairs = collectSortedValidPayemsPairs(observations);
  if (pairs.length === 0) {
    return null;
  }
  const priorClockYear = now.getFullYear() - 1;
  const start = `${priorClockYear}-01-01`;
  const end = `${priorClockYear}-12-31`;
  if (pairs.some((p) => p.date >= start && p.date <= end)) {
    return priorClockYear;
  }
  const latestIso = pairs[pairs.length - 1]!.date;
  const latestDate = new Date(`${latestIso}T12:00:00`);
  if (Number.isNaN(latestDate.getTime())) {
    return null;
  }
  const y = latestDate.getFullYear();
  const m = latestDate.getMonth();
  return m >= 11 ? y : y - 1;
}

/**
 * **12 month slots** for `calendarYear`: bars where data exists are filled; others keep labels with **no bar**
 * (`hasObservation: false`) so the full year reads as a timeline.
 */
export function buildPayrollYearToDateChartWithSkeleton(
  calendarYear: number,
  observations: FredObservationRow[],
): PayrollChartFromFred {
  const pairs = collectSortedValidPayemsPairs(observations);
  const byDate = new Map<string, number>();
  for (const p of pairs) {
    if (p.date < `${calendarYear}-01-01` || p.date > `${calendarYear}-12-31`) {
      continue;
    }
    const v = parseObservationNumber(p.row.value);
    if (v != null) {
      byDate.set(p.date, v);
    }
  }

  const slots: { date: string; value: number | null }[] = [];
  for (let m = 1; m <= 12; m++) {
    const date = `${calendarYear}-${String(m).padStart(2, "0")}-01`;
    slots.push({ date, value: byDate.get(date) ?? null });
  }

  const populated = slots.filter((s): s is { date: string; value: number } => s.value != null);

  let monthOverMonthThousands: number | null = null;
  let latestObservationDate = "";
  let periodLabel = `PERIOD ${calendarYear}`;
  if (populated.length >= 1) {
    const latestObs = populated[populated.length - 1]!;
    latestObservationDate = latestObs.date;
    periodLabel = formatPeriodBanner(latestObs.date);
    const priorObs = populated.length >= 2 ? populated[populated.length - 2]! : null;
    monthOverMonthThousands =
      priorObs != null ? latestObs.value - priorObs.value : null;
  }
  const momLabel =
    monthOverMonthThousands != null ? formatMomThousands(monthOverMonthThousands) : null;
  const heroMetric = momLabel ?? "—";

  const values = populated.map((s) => s.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min;

  const bars: PayrollBarPoint[] = slots.map((slot, i) => {
    const hasObservation = slot.value != null;
    const val = slot.value;
    let relativeHeight = 0;
    if (hasObservation && val != null) {
      relativeHeight = range === 0 ? 0.55 : 0.28 + ((val - min) / range) * 0.72;
    }
    let momVsPrior: number | null = null;
    if (hasObservation && val != null && i > 0) {
      const prev = slots[i - 1]!.value;
      if (prev != null) {
        momVsPrior = val - prev;
      }
    }
    return {
      label: formatMonthShort(slot.date),
      observationDate: slot.date,
      levelThousands: val,
      momVsPriorThousands: momVsPrior,
      relativeHeight,
      hasObservation,
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

export function filterPayemsObservationsByRangeKey(
  observations: FredObservationRow[],
  key: PayrollChartRangeKey,
): FredObservationRow[] {
  const preset = PAYROLL_CHART_RANGE_PRESETS.find((p) => p.key === key);
  if (!preset) {
    return filterPayemsObservationsByTrailingMonths(observations, 12);
  }
  switch (preset.mode) {
    case "ytd":
      return filterPayemsObservationsYearToDate(observations);
    case "last_full_year": {
      const y = resolvePayrollLastFullCalendarYear(observations);
      if (y == null) {
        return [];
      }
      const yStart = `${y}-01-01`;
      const yEnd = `${y}-12-31`;
      return collectSortedValidPayemsPairs(observations)
        .filter((p) => p.date >= yStart && p.date <= yEnd)
        .map((p) => p.row);
    }
    case "trailing":
      return filterPayemsObservationsByTrailingMonths(observations, preset.months);
  }
}

/**
 * Keeps observations from the first day of month
 * `(latestMonth − (trailingMonthCount − 1))` through the latest month (FRED dates are usually `YYYY-MM-01`).
 */
export function filterPayemsObservationsByTrailingMonths(
  observations: FredObservationRow[],
  trailingMonthCount: number,
): FredObservationRow[] {
  if (trailingMonthCount < 1) {
    return [];
  }

  const pairs = collectSortedValidPayemsPairs(observations);

  if (pairs.length === 0) {
    return [];
  }

  const latestIso = pairs[pairs.length - 1]!.date;
  const latestDate = new Date(`${latestIso}T12:00:00`);
  if (Number.isNaN(latestDate.getTime())) {
    return pairs.slice(-trailingMonthCount).map((p) => p.row);
  }

  const y = latestDate.getFullYear();
  const m = latestDate.getMonth();
  const startCal = new Date(y, m - (trailingMonthCount - 1), 1, 12, 0, 0, 0);
  const cutoff = `${startCal.getFullYear()}-${String(startCal.getMonth() + 1).padStart(2, "0")}-01`;
  return pairs.filter((p) => p.date >= cutoff).map((p) => p.row);
}

/**
 * PAYEMS is reported in thousands of persons; values are levels.
 * Headline stats use the **newest two points in the full payload**, not only the last `barCount` bars.
 * Pass observations in **chronological order** (oldest → newest), e.g. after reversing FRED `sort_order=desc` results.
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
      hasObservation: true,
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
