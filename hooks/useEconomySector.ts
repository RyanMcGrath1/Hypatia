/**
 * Cached fetcher for `GET /api/economy/labor/sector` — labor-market sector observations
 * for a date window (backend default: YTD UTC). FRED data updates monthly, so we keep
 * an in-memory result for ~1 hour per window (matching the API contract).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  EconomySectorApiError,
  fetchEconomySector,
  type EconomySectorFetchParams,
  type EconomySectorResponse,
} from "@/hooks/api/economySectorApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";

const STALE_TIME_MS = 60 * 60 * 1000;

type CacheEntry = {
  fetchedAt: number;
  data: EconomySectorResponse;
};

const cacheByWindow = new Map<string, CacheEntry>();

function windowCacheKey(params?: EconomySectorFetchParams): string {
  const start = params?.observationStart?.trim() ?? "";
  const end = params?.observationEnd?.trim() ?? "";
  return `${start}|${end}`;
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

function isFresh(entry: CacheEntry, now: number): boolean {
  return now - entry.fetchedAt < STALE_TIME_MS;
}

function errorMessageFromCaught(e: unknown): string {
  if (e instanceof EconomySectorApiError) {
    if (e.status === 503) {
      return "Economy data unavailable";
    }
    return e.hint ? `${e.message} ${e.hint}` : e.message;
  }
  if (e instanceof Error) {
    if (e.message.startsWith("Network error")) {
      return getNewsApiNetworkErrorMessage();
    }
    return e.message;
  }
  return String(e);
}

export type UseEconomySectorResult = {
  data: EconomySectorResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useEconomySector(
  params?: EconomySectorFetchParams,
): UseEconomySectorResult {
  const cacheKey = windowCacheKey(params);

  const [data, setData] = useState<EconomySectorResponse | null>(() => {
    const c = cacheByWindow.get(cacheKey);
    return c && isFresh(c, Date.now()) ? c.data : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const c = cacheByWindow.get(cacheKey);
    return !(c && isFresh(c, Date.now()));
  });
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const now = Date.now();
    const cached = cacheByWindow.get(cacheKey);
    if (cached && isFresh(cached, now)) {
      setData(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetchEconomySector(ac.signal, params);
        if (cancelledRef.current) {
          return;
        }
        cacheByWindow.set(cacheKey, { fetchedAt: Date.now(), data: res });
        setData(res);
        setError(null);
      } catch (e) {
        if (isAbort(e) || cancelledRef.current) {
          return;
        }
        setData(null);
        setError(errorMessageFromCaught(e));
      } finally {
        if (!cancelledRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
      ac.abort();
    };
  }, [cacheKey, reloadKey, params?.observationStart, params?.observationEnd]);

  const refetch = useCallback(() => {
    cacheByWindow.delete(cacheKey);
    setReloadKey((k) => k + 1);
  }, [cacheKey]);

  return { data, isLoading, error, refetch };
}
