import type { FredObservationRow } from "@/hooks/api/fredObservations";

/** Left edge of the payroll filter slider (inclusive). */
export const PAYROLL_FILTER_SLIDER_FIRST_KEY = "1948-01";

const FRED_PAYEMS_LIMIT_CAP = 10_000;
const PAYEMS_FETCH_MONTH_PADDING = 6;
const PAYEMS_FETCH_MIN_LIMIT = 24;

function parseYearMonthKey(key: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key.trim().slice(0, 7));
  if (!m) {
    return null;
  }
  const y = parseInt(m[1]!, 10);
  const mo = parseInt(m[2]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
    return null;
  }
  return { y, m: mo };
}

/** Inclusive month count from `startKey` through `endKey` (`YYYY-MM`), `startKey` ≤ `endKey`. */
export function payrollMonthsInclusiveBetween(startKey: string, endKey: string): number {
  const lo = parseYearMonthKey(startKey);
  const hi = parseYearMonthKey(endKey);
  if (!lo || !hi) {
    return 1;
  }
  return Math.max(1, (hi.y - lo.y) * 12 + (hi.m - lo.m) + 1);
}

/** Default right edge of the slider before the PAYEMS “latest print” probe returns. */
export function payrollDefaultSeriesLastMonthKeyUtc(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function clampPayrollSeriesLastMonthKey(candidate: string | undefined): string {
  const t = candidate?.trim().slice(0, 7) ?? "";
  if (!t || t < PAYROLL_FILTER_SLIDER_FIRST_KEY) {
    return PAYROLL_FILTER_SLIDER_FIRST_KEY;
  }
  return t;
}

export function payrollFilterSliderPositionCount(seriesLastMonthKey: string): number {
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  return payrollMonthsInclusiveBetween(PAYROLL_FILTER_SLIDER_FIRST_KEY, last);
}

export function payrollFilterSliderStepMax(seriesLastMonthKey: string): number {
  return Math.max(0, payrollFilterSliderPositionCount(seriesLastMonthKey) - 1);
}

/** `YYYY-MM` for step `0 … stepMax` along the fixed 1948-01 … `seriesLastMonthKey` axis. */
export function monthKeyFromPayrollFilterSliderStep(
  step: number,
  seriesLastMonthKey: string,
): string {
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  const stepMax = payrollFilterSliderStepMax(last);
  const s = Math.max(0, Math.min(stepMax, Math.floor(step)));
  const y = 1948 + Math.floor(s / 12);
  const mo = 1 + (s % 12);
  const key = `${y}-${String(mo).padStart(2, "0")}`;
  return key > last ? last : key;
}

export function clampPayrollFilterSliderStep(step: number, seriesLastMonthKey: string): number {
  const stepMax = payrollFilterSliderStepMax(seriesLastMonthKey);
  return Math.max(0, Math.min(stepMax, Math.floor(step)));
}

/** Shift a month key along the PAYEMS axis and clamp to `[1948-01 … seriesLast]`. */
export function addPayrollMonthsWithinSeries(
  monthKey: string,
  deltaMonths: number,
  seriesLastMonthKey: string,
): string {
  const step = payrollFilterSliderStepFromMonthKey(monthKey, seriesLastMonthKey);
  const next = clampPayrollFilterSliderStep(step + deltaMonths, seriesLastMonthKey);
  return monthKeyFromPayrollFilterSliderStep(next, seriesLastMonthKey);
}

/** Single-line description of inclusive calendar span (`startKey` ≤ `endKey`, `YYYY-MM`). */
export function describePayrollInclusiveMonthSpanPretty(
  startKey: string,
  endKey: string,
): string {
  const lo = startKey <= endKey ? startKey : endKey;
  const hi = startKey <= endKey ? endKey : startKey;
  const total = payrollMonthsInclusiveBetween(lo, hi);
  const years = Math.floor(total / 12);
  const mo = total % 12;
  if (years === 0) {
    return `${mo} month${mo === 1 ? "" : "s"}`;
  }
  if (mo === 0) {
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${years} year${years === 1 ? "" : "s"} and ${mo} month${mo === 1 ? "" : "s"}`;
}

export function payrollFilterSliderStepFromMonthKey(
  monthKey: string,
  seriesLastMonthKey: string,
): number {
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  const t = monthKey.trim().slice(0, 7);
  let k = t;
  if (!parseYearMonthKey(k)) {
    return 0;
  }
  if (k < PAYROLL_FILTER_SLIDER_FIRST_KEY) {
    k = PAYROLL_FILTER_SLIDER_FIRST_KEY;
  }
  if (k > last) {
    k = last;
  }
  const origin = parseYearMonthKey(PAYROLL_FILTER_SLIDER_FIRST_KEY)!;
  const cur = parseYearMonthKey(k)!;
  const delta = (cur.y - origin.y) * 12 + (cur.m - origin.m);
  return clampPayrollFilterSliderStep(delta, seriesLastMonthKey);
}

function isoLastDayOfMonth(monthKey: string): string {
  const p = parseYearMonthKey(monthKey);
  if (!p) {
    return `${monthKey}-01`;
  }
  const dd = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** FRED `/delta` observation window (`YYYY-MM-DD`) from inclusive month endpoints. */
export function payrollObservationWindowFromMonthKeys(monthKeyLo: string, monthKeyHi: string): {
  observationStart: string;
  observationEnd: string;
} {
  let a = monthKeyLo.trim().slice(0, 7);
  let b = monthKeyHi.trim().slice(0, 7);
  if (!parseYearMonthKey(a)) {
    a = PAYROLL_FILTER_SLIDER_FIRST_KEY;
  }
  if (!parseYearMonthKey(b)) {
    b = a;
  }
  const [startKey, endKey] = a <= b ? [a, b] : [b, a];
  return {
    observationStart: `${startKey}-01`,
    observationEnd: isoLastDayOfMonth(endKey),
  };
}

function monthKeysFromObservationBounds(
  observationStart: string,
  observationEnd: string,
): [string, string] {
  const k0 =
    parseYearMonthKey(observationStart.trim().slice(0, 7)) != null
      ? observationStart.trim().slice(0, 7)
      : monthKeyFromObservationDate(observationStart);
  const k1 =
    parseYearMonthKey(observationEnd.trim().slice(0, 7)) != null
      ? observationEnd.trim().slice(0, 7)
      : monthKeyFromObservationDate(observationEnd);
  const a = k0 || PAYROLL_FILTER_SLIDER_FIRST_KEY;
  const b = k1 || a;
  return a <= b ? [a, b] : [b, a];
}

/** Row `limit` for PAYEMS so the API returns the full requested window (capped at 10_000). */
export function payrollFredObservationFetchLimit(
  observationStart: string,
  observationEnd: string,
): number {
  const [lo, hi] = monthKeysFromObservationBounds(observationStart, observationEnd);
  const months = payrollMonthsInclusiveBetween(lo, hi);
  return Math.min(
    FRED_PAYEMS_LIMIT_CAP,
    Math.max(PAYEMS_FETCH_MIN_LIMIT, months + PAYEMS_FETCH_MONTH_PADDING),
  );
}

/** `YYYY-MM` from FRED `YYYY-MM-DD` (or prefix). Internal sort key. */
export function monthKeyFromObservationDate(date: string | undefined): string {
  if (!date?.trim()) {
    return "";
  }
  return date.trim().slice(0, 7);
}

/** e.g. `Jan, 2026` for filter fields and labels (en-US short month + year). */
export function formatMonthYearShortDisplay(date: string | undefined): string {
  if (!date?.trim()) {
    return "";
  }
  const d = new Date(`${date.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${mon}, ${year}`;
}

export function parseMonthKeyInput(raw: string): string | null {
  const t = raw.trim().replace(/\//g, "-");
  const m = /^(\d{4})-(\d{1,2})/.exec(t);
  if (!m) {
    return null;
  }
  const y = m[1];
  const moNum = Math.min(12, Math.max(1, parseInt(m[2]!, 10)));
  const mo = String(moNum).padStart(2, "0");
  return `${y}-${mo}`;
}

const ABBREV_TO_MONTH: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Parses filter text: `Jan, 2026` / `January 2026` / `Jan 2026`, or legacy `YYYY-MM`.
 * Returns internal `YYYY-MM` for {@link findPayrollStartIndex} / {@link findPayrollEndIndex}.
 */
export function parsePayrollFilterMonthInput(raw: string): string | null {
  const legacy = parseMonthKeyInput(raw);
  if (legacy) {
    return legacy;
  }
  const t = raw.trim().replace(/\s+/g, " ");
  const m = /^([A-Za-z]+)\s*,?\s*(\d{4})\s*$/.exec(t);
  if (!m) {
    return null;
  }
  const name = m[1]!.trim();
  const y = m[2]!;
  const yearNum = parseInt(y, 10);
  if (!Number.isFinite(yearNum) || yearNum < 1000 || yearNum > 9999) {
    return null;
  }
  const key = name.toLowerCase().slice(0, 3);
  const fromAbbrev = ABBREV_TO_MONTH[key];
  if (fromAbbrev != null) {
    return `${y}-${String(fromAbbrev).padStart(2, "0")}`;
  }
  const d = new Date(`${name} 1, ${y}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const mo = d.getMonth() + 1;
  const yr = d.getFullYear();
  if (yr !== yearNum) {
    return null;
  }
  return `${yr}-${String(mo).padStart(2, "0")}`;
}

/** First index whose month is >= `key` (`YYYY-MM`). Observations oldest → newest. */
export function findPayrollStartIndex(
  observations: FredObservationRow[],
  monthKey: string,
): number {
  if (observations.length === 0) {
    return 0;
  }
  const i = observations.findIndex(
    (r) => monthKeyFromObservationDate(r.date) >= monthKey,
  );
  return i === -1 ? observations.length - 1 : i;
}

/** Last index whose month is <= `key` (`YYYY-MM`). */
export function findPayrollEndIndex(
  observations: FredObservationRow[],
  monthKey: string,
): number {
  if (observations.length === 0) {
    return 0;
  }
  for (let i = observations.length - 1; i >= 0; i--) {
    if (monthKeyFromObservationDate(observations[i]!.date) <= monthKey) {
      return i;
    }
  }
  return 0;
}

export function clampPayrollRangeIndices(
  observations: FredObservationRow[],
  startIdx: number,
  endIdx: number,
): { lo: number; hi: number } {
  const n = observations.length;
  if (n === 0) {
    return { lo: 0, hi: 0 };
  }
  const hi = Math.max(0, Math.min(endIdx, n - 1));
  const lo = Math.max(0, Math.min(startIdx, hi));
  return { lo, hi };
}

/** UTC year-to-date: Jan 1 through today (`YYYY-MM-DD`). */
export function payrollDefaultYtdBoundsUtc(now: Date = new Date()): {
  observationStart: string;
  observationEnd: string;
} {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return { observationStart: `${y}-01-01`, observationEnd: `${y}-${m}-${d}` };
}

/** Month keys for the YTD quick preset (same window as {@link payrollDefaultYtdBoundsUtc}). */
export function payrollYtdMonthKeysUtc(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const { observationStart, observationEnd } = payrollDefaultYtdBoundsUtc(now);
  return {
    start: observationStart.slice(0, 7),
    end: observationEnd.slice(0, 7),
  };
}

export function payrollYtdMatchesMonthKeys(
  monthKeyLo: string,
  monthKeyHi: string,
  now: Date = new Date(),
): boolean {
  const ytd = payrollYtdMonthKeysUtc(now);
  const lo = monthKeyLo.trim().slice(0, 7);
  const hi = monthKeyHi.trim().slice(0, 7);
  const start = lo <= hi ? lo : hi;
  const end = lo <= hi ? hi : lo;
  return start === ytd.start && end === ytd.end;
}
