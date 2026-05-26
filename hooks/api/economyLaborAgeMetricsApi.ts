/**
 * `GET {API_BASE}/api/economy/labor/age-metrics` — unemployment, participation,
 * and employment-population ratio by age group (FRED proxy, server-side key).
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";
import {
  parseLaborAgeMetricsResponse,
  type LaborAgeMetricsResponse,
} from "@/lib/economy/laborAgeMetricsParse";

export type {
  LaborAgeMetricsMetric,
  LaborAgeMetricsObservation,
  LaborAgeMetricsResponse,
  LaborAgeMetricsSeries,
} from "@/lib/economy/laborAgeMetricsParse";
export { parseLaborAgeMetricsResponse } from "@/lib/economy/laborAgeMetricsParse";

export class LaborAgeMetricsApiError extends Error {
  readonly status: number;
  readonly hint?: string;

  constructor(status: number, message: string, hint?: string) {
    super(message);
    this.name = "LaborAgeMetricsApiError";
    this.status = status;
    this.hint = hint;
  }
}

export type LaborAgeMetricsFetchParams = {
  observationStart?: string;
  observationEnd?: string;
};

/** GET `/api/economy/labor/age-metrics` — window via `start_date` / `end_date`. */
export async function fetchLaborAgeMetrics(
  signal?: AbortSignal,
  params?: LaborAgeMetricsFetchParams,
): Promise<LaborAgeMetricsResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.observationStart?.trim()) {
    searchParams.start_date = params.observationStart.trim().slice(0, 10);
  }
  if (params?.observationEnd?.trim()) {
    searchParams.end_date = params.observationEnd.trim().slice(0, 10);
  }

  try {
    const raw = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyLaborAgeMetrics,
      Object.keys(searchParams).length > 0 ? searchParams : undefined,
      signal,
    );
    return parseLaborAgeMetricsResponse(raw);
  } catch (e) {
    if (e instanceof LaborAgeMetricsApiError) {
      throw e;
    }
    if (e instanceof HttpApiError) {
      const hint =
        e.body && typeof e.body === "object" && "hint" in e.body
          ? String((e.body as { hint?: unknown }).hint ?? "")
          : undefined;
      throw new LaborAgeMetricsApiError(e.status, e.message, hint || undefined);
    }
    if (e instanceof Error) {
      throw new LaborAgeMetricsApiError(0, e.message);
    }
    throw new LaborAgeMetricsApiError(0, String(e));
  }
}
