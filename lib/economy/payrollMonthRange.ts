import type { FredObservationRow } from "@/hooks/api/fredObservations";

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
  const i = observations.findIndex((r) => monthKeyFromObservationDate(r.date) >= monthKey);
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
export function payrollDefaultYtdBoundsUtc(): {
  observationStart: string;
  observationEnd: string;
} {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return { observationStart: `${y}-01-01`, observationEnd: `${y}-${m}-${d}` };
}
