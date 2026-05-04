/**
 * `GET /api/economy/overview` response — two most recent observations per section (newest first).
 */

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

export const ECONOMY_OVERVIEW_SECTION_KEYS = [
  "consumer_spending",
  "gdp",
  "housing",
  "inflation",
  "interest_rates",
  "labor",
] as const satisfies readonly EconomyOverviewSectionKey[];

/** Narrow `fetch` JSON to the overview contract (minimal structural check). */
export function parseEconomyOverviewResponse(
  data: unknown,
): EconomyOverviewApiResponse | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const row = data as Record<string, unknown>;
  if (typeof row.as_of !== "string") {
    return null;
  }
  if (typeof row.sections !== "object" || row.sections === null) {
    return null;
  }
  return data as EconomyOverviewApiResponse;
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
