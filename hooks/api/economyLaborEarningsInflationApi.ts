/**
 * `GET {API_BASE}/api/economy/labor/earnings-inflation` — average hourly earnings + CPI.
 * Response shape matches the labor sector proxy (series + sectors map).
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";
import {
  EconomySectorApiError,
  parseEconomySectorResponse,
  type EconomySectorFetchParams,
  type EconomySectorResponse,
} from "@/hooks/api/economySectorApi";

export type LaborEarningsInflationResponse = EconomySectorResponse;

export type LaborEarningsInflationFetchParams = EconomySectorFetchParams;

/** GET `/api/economy/labor/earnings-inflation` — FRED key stays server-side. */
export async function fetchLaborEarningsInflation(
  signal?: AbortSignal,
  params?: LaborEarningsInflationFetchParams,
): Promise<LaborEarningsInflationResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.observationStart?.trim()) {
    searchParams.observation_start = params.observationStart.trim();
  }
  if (params?.observationEnd?.trim()) {
    searchParams.observation_end = params.observationEnd.trim();
  }

  try {
    const raw = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyLaborEarningsInflation,
      Object.keys(searchParams).length > 0 ? searchParams : undefined,
      signal,
    );
    return parseEconomySectorResponse(raw);
  } catch (e) {
    if (e instanceof EconomySectorApiError) {
      throw e;
    }
    if (e instanceof HttpApiError) {
      const hint =
        e.body && typeof e.body === "object" && "hint" in e.body
          ? String((e.body as { hint?: unknown }).hint ?? "")
          : undefined;
      throw new EconomySectorApiError(e.status, e.message, hint || undefined);
    }
    if (e instanceof Error) {
      throw new EconomySectorApiError(0, e.message);
    }
    throw new EconomySectorApiError(0, String(e));
  }
}
