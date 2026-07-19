/**
 * `GET {API_BASE}/api/economy/rates/key-metrics` — latest treasury yields and mortgage rate.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type RatesKeyMetric = {
  series_id: string;
  label: string;
  note: string;
  value: number | null;
  observation_date: string | null;
  error?: string;
};

export type RatesKeyMetricsResponse = {
  as_of?: string;
  metrics: RatesKeyMetric[];
};

export class RatesKeyMetricsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "RatesKeyMetricsApiError";
  }
}

function parseMetric(raw: unknown): RatesKeyMetric | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const series_id = typeof o.series_id === "string" ? o.series_id.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const note = typeof o.note === "string" ? o.note.trim() : "";
  if (!series_id || !label) {
    return null;
  }
  let value: number | null = null;
  if (typeof o.value === "number" && Number.isFinite(o.value)) {
    value = o.value;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const error =
    typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    series_id,
    label,
    note,
    value,
    observation_date,
    ...(error ? { error } : {}),
  };
}

/** Normalize `/api/economy/rates/key-metrics` JSON. */
export function parseRatesKeyMetricsResponse(raw: unknown): RatesKeyMetricsResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.metrics)) {
    return null;
  }
  const metrics = o.metrics
    .map(parseMetric)
    .filter((metric): metric is RatesKeyMetric => metric != null);
  if (metrics.length === 0) {
    return null;
  }
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  return { as_of, metrics };
}

/** GET `/api/economy/rates/key-metrics` — FRED key stays server-side. */
export async function fetchRatesKeyMetrics(
  signal?: AbortSignal,
): Promise<RatesKeyMetricsResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyRatesKeyMetrics,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new RatesKeyMetricsApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseRatesKeyMetricsResponse(body);
  if (!parsed) {
    throw new RatesKeyMetricsApiError("Invalid rates key metrics payload", 500, body);
  }
  return parsed;
}
