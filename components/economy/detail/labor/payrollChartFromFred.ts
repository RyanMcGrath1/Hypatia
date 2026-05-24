import type { FredObservationRow } from "@/hooks/api/fredObservations";
import { payrollYtdMatchesMonthKeys } from "@/lib/economy/payrollMonthRange";

/** UI presets: YTD or trailing month window ending at the latest observation in the payload. */
export const PAYROLL_CHART_RANGE_PRESETS = [
  { key: "ytd", label: "YTD", mode: "ytd" as const },
  {
    key: "py",
    /** Prefer {@link payrollChartRangePresetDisplayLabel} in UI. */
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

/** Fixed payroll chart viewport: each month slot is 1/7 of plot width; wider ranges scroll horizontally. */
export const PAYROLL_CHART_VIEWPORT_MONTH_COUNT = 7;

export type PayrollBarPoint = {
  label: string;
  /** FRED observation_date (YYYY-MM-DD) for this month slot. */
  observationDate: string;
  /** PAYEMS monthly delta in thousands when FRED has data; null for placeholder months (YTD). */
  levelThousands: number | null;
  /** Same as `levelThousands`, kept for existing UI wiring. */
  momVsPriorThousands: number | null;
  /** 0–1 for bar height multiplier; 0 when no month-over-month delta is available. */
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
  /** Set for Jan–Dec skeleton charts (`ytd` / `py`); null for trailing windows. */
  calendarContextYear: number | null;
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
 * Net payroll change (thousands of persons) over the observations in `observations`.
 * Values must be **month-over-month deltas** from {@link getFredObservations} (`PAYEMS/delta`);
 * the net change in levels over the span is the **sum** of those deltas.
 */
export function computePayrollSpanNetLevelDeltaThousands(
  observations: FredObservationRow[],
): number | null {
  const pairs = collectSortedValidPayemsPairs(observations);
  if (pairs.length < 1) {
    return null;
  }
  let sum = 0;
  for (const p of pairs) {
    const v = parseObservationNumber(p.row.value);
    if (v != null) {
      sum += v;
    }
  }
  return sum;
}

/**
 * Same as {@link computePayrollSpanNetLevelDeltaThousands} but restricted to `calendarYear`
 * Jan–Dec (sum of every MoM delta in that calendar year).
 */
export function computeCalendarYearPayrollNetLevelDeltaThousands(
  observations: FredObservationRow[],
  calendarYear: number,
): number | null {
  const start = `${calendarYear}-01-01`;
  const end = `${calendarYear}-12-31`;
  const pairs = collectSortedValidPayemsPairs(observations).filter(
    (p) => p.date >= start && p.date <= end,
  );
  if (pairs.length < 1) {
    return null;
  }
  let sum = 0;
  for (const p of pairs) {
    const v = parseObservationNumber(p.row.value);
    if (v != null) {
      sum += v;
    }
  }
  return sum;
}

/**
 * Net payroll change (thousands) implied by the chart: **sum** of each bar’s MoM delta
 * (`PAYEMS/delta` proxy). Bar order does not matter. Requires at least one month with data.
 */
export function computeDisplayedChartNetLevelDeltaThousands(
  chart: PayrollChartFromFred,
): number | null {
  let sum = 0;
  let count = 0;
  for (const b of chart.bars) {
    if (b.hasObservation && b.levelThousands != null) {
      sum += b.levelThousands;
      count += 1;
    }
  }
  if (count < 1) {
    return null;
  }
  return sum;
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
 * Short label for payroll range filter chips (modal row title, a11y). The prior-full-year
 * preset shows the calendar year (e.g. `2025`), aligned with {@link resolvePayrollLastFullCalendarYear}
 * when the feed supports it; otherwise the local clock’s previous year.
 */
export function payrollChartRangePresetDisplayLabel(
  preset: PayrollChartRangePreset,
  observations: FredObservationRow[],
  now: Date = new Date(),
): string {
  if (preset.key !== "py") {
    return preset.label;
  }
  const y = resolvePayrollLastFullCalendarYear(observations, now);
  return String(y ?? now.getFullYear() - 1);
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
  const byMonth = new Map<string, { date: string; value: number }>();
  for (const p of pairs) {
    if (p.date < `${calendarYear}-01-01` || p.date > `${calendarYear}-12-31`) {
      continue;
    }
    const v = parseObservationNumber(p.row.value);
    if (v != null) {
      // Normalize to YYYY-MM so feeds that use non-01 day-of-month still map into the month slot.
      byMonth.set(p.date.slice(0, 7), { date: p.date, value: v });
    }
  }

  const slots: { date: string; sourceDate: string; value: number | null }[] = [];
  for (let m = 1; m <= 12; m++) {
    const date = `${calendarYear}-${String(m).padStart(2, "0")}-01`;
    const resolved = byMonth.get(date.slice(0, 7));
    slots.push({ date, sourceDate: resolved?.date ?? date, value: resolved?.value ?? null });
  }

  const populated = slots.filter(
    (s): s is { date: string; sourceDate: string; value: number } =>
      s.value != null,
  );

  let monthOverMonthThousands: number | null = null;
  let latestObservationDate = "";
  let periodLabel = `PERIOD ${calendarYear}`;
  if (populated.length >= 1) {
    const latestObs = populated[populated.length - 1]!;
    latestObservationDate = latestObs.sourceDate;
    periodLabel = formatPeriodBanner(latestObs.sourceDate);
    monthOverMonthThousands = latestObs.value;
  }
  const momLabel =
    monthOverMonthThousands != null ? formatMomThousands(monthOverMonthThousands) : null;
  const heroMetric = momLabel ?? "—";

  const deltasForScale: number[] = [];
  for (const slot of slots) {
    if (slot.value != null) {
      deltasForScale.push(Math.abs(slot.value));
    }
  }
  const maxAbsDelta = deltasForScale.length > 0 ? Math.max(...deltasForScale) : 0;

  const bars: PayrollBarPoint[] = slots.map((slot) => {
    const hasObservation = slot.value != null;
    const val = slot.value;
    const momVsPrior: number | null = hasObservation && val != null ? val : null;
    let relativeHeight = 0;
    if (momVsPrior != null) {
      const magnitude = Math.abs(momVsPrior);
      relativeHeight = maxAbsDelta === 0 ? 0.55 : 0.28 + (magnitude / maxAbsDelta) * 0.72;
    }
    return {
      label: formatMonthShort(slot.date),
      observationDate: slot.sourceDate,
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
    calendarContextYear: calendarYear,
  };
}

export type PayrollObservationWindow = {
  observationStart: string;
  observationEnd: string;
};

/**
 * Builds the payroll chart for a committed filter window. YTD uses a fixed Jan–Dec skeleton
 * (empty slots for months without a print yet); other ranges show one bar per month with data.
 */
export function buildPayrollChartForObservationWindow(
  observations: FredObservationRow[],
  fetchWindow: PayrollObservationWindow,
): PayrollChartFromFred | null {
  if (observations.length === 0) {
    return null;
  }
  const startKey = fetchWindow.observationStart.trim().slice(0, 7);
  const endKey = fetchWindow.observationEnd.trim().slice(0, 7);
  if (payrollYtdMatchesMonthKeys(startKey, endKey)) {
    const calendarYear = resolvePayrollYtdCalendarYear(observations);
    if (calendarYear != null) {
      return buildPayrollYearToDateChartWithSkeleton(calendarYear, observations);
    }
  }
  return buildPayrollChartFromFredObservations(observations, observations.length);
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
  const monthOverMonthThousands = latestObs.value;
  const momLabel =
    monthOverMonthThousands != null
      ? formatMomThousands(monthOverMonthThousands)
      : null;
  /** Always MoM when comparable; never the raw level (that belongs under a bar tooltip). */
  const heroMetric = momLabel ?? "—";
  const periodLabel = formatPeriodBanner(latestObs.date);
  const latestObservationDate = latestObs.date;

  const slice = pairs.slice(-Math.max(barCount, 1));
  const deltasForScale: number[] = [];
  for (const point of slice) {
    deltasForScale.push(Math.abs(point.value));
  }
  const maxAbsDelta = deltasForScale.length > 0 ? Math.max(...deltasForScale) : 0;

  const bars: PayrollBarPoint[] = slice.map((p) => {
    const momVsPriorThousands = p.value;
    const normalized =
      maxAbsDelta === 0
        ? 0.55
        : 0.28 + (Math.abs(momVsPriorThousands) / maxAbsDelta) * 0.72;
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
    calendarContextYear: null,
  };
}
