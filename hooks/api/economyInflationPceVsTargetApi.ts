/**
 * `GET {API_BASE}/api/economy/inflation/pce-vs-target` — headline/core PCE YoY vs Fed target.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type InflationPceMetric = {
  series_id: string;
  label: string;
  value: number | null;
  observation_date: string | null;
  error?: string;
};

export type InflationPceVsTargetResponse = {
  as_of?: string;
  target: number;
  headline: InflationPceMetric;
  core: InflationPceMetric;
};

export class InflationPceVsTargetApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "InflationPceVsTargetApiError";
  }
}

function parseMetric(raw: unknown): InflationPceMetric | null {
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
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const error = typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    series_id,
    label,
    value,
    observation_date,
    ...(error ? { error } : {}),
  };
}

/** Normalize `/api/economy/inflation/pce-vs-target` JSON. */
export function parseInflationPceVsTargetResponse(
  raw: unknown,
): InflationPceVsTargetResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const headline = parseMetric(o.headline);
  const core = parseMetric(o.core);
  if (!headline || !core) {
    return null;
  }
  if (typeof o.target !== "number" || !Number.isFinite(o.target)) {
    return null;
  }
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  return {
    as_of,
    target: o.target,
    headline,
    core,
  };
}

/** GET `/api/economy/inflation/pce-vs-target` — FRED key stays server-side. */
export async function fetchInflationPceVsTarget(
  signal?: AbortSignal,
): Promise<InflationPceVsTargetResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyInflationPceVsTarget,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new InflationPceVsTargetApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseInflationPceVsTargetResponse(body);
  if (!parsed) {
    throw new InflationPceVsTargetApiError("Invalid inflation PCE payload", 500, body);
  }
  return parsed;
}
