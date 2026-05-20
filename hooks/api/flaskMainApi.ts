/**
 * Civic + health probes — `hypatia-backend/routes/civic/` and `routes/health.py`.
 * Economy dashboard lives in {@link economyDashboardApi}.
 */
import { useEffect, useState } from "react";

import { fetchEconomyOverview } from "@/hooks/api/economyDashboardApi";
import { fetchApiGet } from "@/hooks/api/httpGet";
import {
  getHypatiaBackendBaseUrl,
  getHypatiaBackendNetworkErrorMessage,
} from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export { fetchEconomyOverview } from "@/hooks/api/economyDashboardApi";

type UseFlaskHelloSearchResult = {
  isLoading: boolean;
  error: string | null;
  apiData: unknown | null;
};

/** @deprecated Use {@link getHypatiaBackendBaseUrl} */
export function getFlaskApiBaseUrl(): string {
  return getHypatiaBackendBaseUrl();
}

/** @deprecated Use {@link getHypatiaBackendNetworkErrorMessage} */
export function getFlaskHelloNetworkErrorMessage(): string {
  return getHypatiaBackendNetworkErrorMessage();
}

async function fetchHypatiaGet(
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  return fetchApiGet(getHypatiaBackendBaseUrl(), path, searchParams, signal);
}

/** `GET {base}/health` — liveness check (same JSON as legacy `/hello`). */
export async function fetchBackendHealth(signal?: AbortSignal): Promise<unknown> {
  return fetchHypatiaGet(HYPATIA_API_PATHS.health, undefined, signal);
}

/** @deprecated Use {@link fetchBackendHealth} */
export async function fetchFlaskHello(signal?: AbortSignal): Promise<unknown> {
  return fetchBackendHealth(signal);
}

export const DEFAULT_CIVIC_SAMPLE_ADDRESS =
  "1600 Pennsylvania Avenue NW Washington DC";

export async function fetchCivicRepresentatives(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchHypatiaGet(
    HYPATIA_API_PATHS.civicRepresentatives,
    { address: address.trim() },
    signal,
  );
}

export const DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS = "07834";

export async function fetchCivicDivisionsByAddress(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchHypatiaGet(
    HYPATIA_API_PATHS.civicDivisionsByAddress,
    { address: address.trim() },
    signal,
  );
}

export function useFlaskHelloSearch(query: string): UseFlaskHelloSearchResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown | null>(null);
  const apiBaseUrl = getHypatiaBackendBaseUrl();

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setIsLoading(false);
      setError(null);
      setApiData(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchBackendHealth(controller.signal);
        if (!cancelled) {
          setApiData(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(getHypatiaBackendNetworkErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBaseUrl, query]);

  return { isLoading, error, apiData };
}
