/**
 * `GET {API_BASE}/api/economy/inflation/cpi-components` — headline CPI + component YoY.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type InflationCpiMetric = {
  series_id: string;
  label: string;
  value: number | null;
  observation_date: string | null;
  previous_value?: number | null;
  previous_observation_date?: string | null;
  delta?: number | null;
  error?: string;
};

export type InflationCpiComponentMetric = InflationCpiMetric & {
  key: string;
  includes_in?: string[];
};

export type InflationCpiComponentsResponse = {
  as_of?: string;
  observation_date: string | null;
  headline: InflationCpiMetric;
  components: InflationCpiComponentMetric[];
};

export class InflationCpiComponentsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "InflationCpiComponentsApiError";
  }
}

function parseMetric(raw: unknown): InflationCpiMetric | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const series_id = typeof o.series_id === "string" ? o.series_id.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  if (!series_id || !label) {
    return null;
  }
  let value: number | null = null;
  if (typeof o.value === "number" && Number.isFinite(o.value)) {
    value = o.value;
  }
  let previous_value: number | null = null;
  if (typeof o.previous_value === "number" && Number.isFinite(o.previous_value)) {
    previous_value = o.previous_value;
  }
  let delta: number | null = null;
  if (typeof o.delta === "number" && Number.isFinite(o.delta)) {
    delta = o.delta;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const previous_observation_date =
    typeof o.previous_observation_date === "string" && o.previous_observation_date.trim() !== ""
      ? o.previous_observation_date.trim()
      : null;
  const error = typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    series_id,
    label,
    value,
    observation_date,
    previous_value,
    previous_observation_date,
    delta,
    ...(error ? { error } : {}),
  };
}

function parseComponent(raw: unknown): InflationCpiComponentMetric | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key.trim() : "";
  const metric = parseMetric(raw);
  if (!key || !metric) {
    return null;
  }
  let includes_in: string[] | undefined;
  if (Array.isArray(o.includes_in)) {
    const cleaned = o.includes_in
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .map((item) => item.trim());
    if (cleaned.length > 0) {
      includes_in = cleaned;
    }
  }
  return {
    ...metric,
    key,
    ...(includes_in ? { includes_in } : {}),
  };
}

/** Normalize `/api/economy/inflation/cpi-components` JSON. */
export function parseInflationCpiComponentsResponse(
  raw: unknown,
): InflationCpiComponentsResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const headline = parseMetric(o.headline);
  if (!headline) {
    return null;
  }
  if (!Array.isArray(o.components)) {
    return null;
  }
  const components = o.components
    .map((item) => parseComponent(item))
    .filter((item): item is InflationCpiComponentMetric => item != null);
  if (components.length === 0) {
    return null;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  return {
    as_of,
    observation_date,
    headline,
    components,
  };
}

/** GET `/api/economy/inflation/cpi-components` — FRED key stays server-side. */
export async function fetchInflationCpiComponents(
  signal?: AbortSignal,
): Promise<InflationCpiComponentsResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyInflationCpiComponents,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new InflationCpiComponentsApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseInflationCpiComponentsResponse(body);
  if (!parsed) {
    throw new InflationCpiComponentsApiError("Invalid inflation CPI components payload", 500, body);
  }
  return parsed;
}
