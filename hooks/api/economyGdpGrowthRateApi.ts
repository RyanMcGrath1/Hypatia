/**
 * `GET {API_BASE}/api/economy/gdp/growth-rate` — Real GDP QoQ growth (A191RL1Q225SBEA).
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type GdpGrowthObservation = {
  date: string;
  value: number;
};

export type GdpGrowthRateResponse = {
  as_of?: string;
  start_date: string;
  end_date: string;
  series_id: string;
  label: string;
  unit: string;
  value: number | null;
  observation_date: string | null;
  observations: GdpGrowthObservation[];
  error?: string;
};

export class GdpGrowthRateApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "GdpGrowthRateApiError";
  }
}

function parseObservation(raw: unknown): GdpGrowthObservation | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const date = typeof o.date === "string" ? o.date.trim() : "";
  if (!date) {
    return null;
  }
  if (typeof o.value !== "number" || !Number.isFinite(o.value)) {
    return null;
  }
  return { date, value: o.value };
}

/** Normalize `/api/economy/gdp/growth-rate` JSON. */
export function parseGdpGrowthRateResponse(raw: unknown): GdpGrowthRateResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const series_id = typeof o.series_id === "string" ? o.series_id.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const unit = typeof o.unit === "string" ? o.unit.trim() : "";
  const start_date = typeof o.start_date === "string" ? o.start_date.trim() : "";
  const end_date = typeof o.end_date === "string" ? o.end_date.trim() : "";
  if (!series_id || !label || !unit || !start_date || !end_date) {
    return null;
  }
  if (!Array.isArray(o.observations)) {
    return null;
  }
  const observations = o.observations
    .map(parseObservation)
    .filter((row): row is GdpGrowthObservation => row != null);

  let value: number | null = null;
  if (typeof o.value === "number" && Number.isFinite(o.value)) {
    value = o.value;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  const error = typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;

  return {
    as_of,
    start_date,
    end_date,
    series_id,
    label,
    unit,
    value,
    observation_date,
    observations,
    ...(error ? { error } : {}),
  };
}

/** GET `/api/economy/gdp/growth-rate` — FRED key stays server-side. */
export async function fetchGdpGrowthRate(signal?: AbortSignal): Promise<GdpGrowthRateResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyGdpGrowthRate,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new GdpGrowthRateApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseGdpGrowthRateResponse(body);
  if (!parsed) {
    throw new GdpGrowthRateApiError("Invalid GDP growth rate payload", 500, body);
  }
  return parsed;
}
