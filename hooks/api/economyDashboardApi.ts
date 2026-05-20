/**
 * Economy tab dashboard — `hypatia-backend/routes/economy/dashboard.py`
 * (`GET /api/economy/dashboard`).
 */
import { fetchApiGet } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

/**
 * Full Economy tab snapshot (`as_of`, `sections` for all overview series).
 */
export async function fetchEconomyOverview(
  signal?: AbortSignal,
  observationEnd?: string,
): Promise<unknown> {
  const searchParams: Record<string, string> | undefined =
    observationEnd?.trim()
      ? { observation_end: observationEnd.trim() }
      : undefined;
  return fetchApiGet(
    getHypatiaBackendBaseUrl(),
    HYPATIA_API_PATHS.economyDashboard,
    searchParams,
    signal,
  );
}
