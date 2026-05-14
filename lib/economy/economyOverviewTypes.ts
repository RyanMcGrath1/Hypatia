/**
 * Per-sector `GET /api/economy/{sector}/dashboard` payloads (merged on the client) — each
 * section lists the two most recent observations (newest first) when successful.
 */
import { economyOverviewResponseSchema } from '@/lib/economy/economyOverviewSchema';

export type EconomyObservation = {
  date: string;
  value: number;
};

export type EconomySectionPayload = {
  label: string;
  observations: EconomyObservation[];
  series_id: string;
  unit: string;
};

/** Keys returned under `sections` for the current overview payload. */
export type EconomyOverviewSectionKey =
  | "consumer_spending"
  | "gdp"
  | "housing"
  | "inflation"
  | "interest_rates"
  | "labor";

export type EconomyOverviewSections = Record<
  EconomyOverviewSectionKey,
  EconomySectionPayload
>;

export type EconomyOverviewApiResponse = {
  /** ISO 8601 timestamp from the backend */
  as_of: string;
  sections: EconomyOverviewSections;
};

/** True when `sections[key]` is a success payload (not a per-series FRED error object). */
export function isEconomySectionPayload(
  section: unknown,
): section is EconomySectionPayload {
  if (typeof section !== 'object' || section === null) return false;
  if (!('observations' in section)) return false;
  return Array.isArray((section as EconomySectionPayload).observations);
}

export const ECONOMY_OVERVIEW_SECTION_KEYS = [
  "consumer_spending",
  "gdp",
  "housing",
  "inflation",
  "interest_rates",
  "labor",
] as const satisfies readonly EconomyOverviewSectionKey[];

/**
 * Narrow `fetch` JSON to the overview contract (Zod).
 * Runtime payloads may include per-section error objects from FRED; the UI falls back when `observations` is absent.
 */
export function parseEconomyOverviewResponse(
  data: unknown,
): EconomyOverviewApiResponse | null {
  const parsed = economyOverviewResponseSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  return parsed.data as EconomyOverviewApiResponse;
}

/** Latest observation for a section (API lists newest first). */
export function getLatestObservation(
  section: EconomySectionPayload | undefined,
): EconomyObservation | undefined {
  return section?.observations?.[0];
}

/** Prior observation for period-over-period style deltas (API lists newest first). */
export function getPriorObservation(
  section: EconomySectionPayload | undefined,
): EconomyObservation | undefined {
  return section?.observations?.[1];
}

/** Format `as_of` ISO string for dashboard chrome. */
export function formatOverviewAsOfDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
