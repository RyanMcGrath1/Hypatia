/**
 * `GET {API_BASE}/api/economy/rates/fed-funds-target` — FOMC target range (DFEDTARL / DFEDTARU).
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type RatesFedFundsTargetObservation = {
  date: string;
  value: string | null;
};

export type RatesFedFundsTargetSeriesEntry = {
  id: string;
  name: string;
  observations: RatesFedFundsTargetObservation[];
  error?: string;
};

export type RatesFedFundsTargetResponse = {
  as_of?: string;
  start_date: string;
  end_date: string;
  target_lower: number | null;
  target_upper: number | null;
  observation_date: string | null;
  series: RatesFedFundsTargetSeriesEntry[];
};

export class RatesFedFundsTargetApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "RatesFedFundsTargetApiError";
  }
}

function parseOptionalNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  return null;
}

function parseObservationValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim();
  if (!t || t === "." || t === "..") {
    return null;
  }
  return t;
}

function parseSeriesEntry(raw: unknown): RatesFedFundsTargetSeriesEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!id || !name) {
    return null;
  }
  const observations: RatesFedFundsTargetObservation[] = [];
  if (Array.isArray(o.observations)) {
    for (const row of o.observations) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const r = row as Record<string, unknown>;
      const date = typeof r.date === "string" ? r.date.trim() : "";
      if (!date) {
        continue;
      }
      observations.push({
        date,
        value: parseObservationValue(r.value),
      });
    }
  }
  const error =
    typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    id,
    name,
    observations,
    ...(error ? { error } : {}),
  };
}

/** Normalize `/api/economy/rates/fed-funds-target` JSON. */
export function parseRatesFedFundsTargetResponse(
  raw: unknown,
): RatesFedFundsTargetResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const start_date = typeof o.start_date === "string" ? o.start_date.trim() : "";
  const end_date = typeof o.end_date === "string" ? o.end_date.trim() : "";
  if (!start_date || !end_date) {
    return null;
  }
  if (!Array.isArray(o.series)) {
    return null;
  }
  const series = o.series
    .map(parseSeriesEntry)
    .filter((entry): entry is RatesFedFundsTargetSeriesEntry => entry != null);
  if (series.length === 0) {
    return null;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  return {
    as_of,
    start_date,
    end_date,
    target_lower: parseOptionalNumber(o.target_lower),
    target_upper: parseOptionalNumber(o.target_upper),
    observation_date,
    series,
  };
}

/** GET `/api/economy/rates/fed-funds-target` — FRED key stays server-side. */
export async function fetchRatesFedFundsTarget(
  signal?: AbortSignal,
): Promise<RatesFedFundsTargetResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyRatesFedFundsTarget,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new RatesFedFundsTargetApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseRatesFedFundsTargetResponse(body);
  if (!parsed) {
    throw new RatesFedFundsTargetApiError("Invalid fed funds target payload", 500, body);
  }
  return parsed;
}
