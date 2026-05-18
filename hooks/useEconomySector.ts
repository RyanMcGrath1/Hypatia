/**
 * Cached fetcher for `GET /api/economy/labor/sector` — trailing 12 months of labor-market
 * sector observations. FRED data updates monthly, so we keep an in-memory result
 * for ~1 hour (matching the "stale time" guidance from the API contract).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  EconomySectorApiError,
  fetchEconomySector,
  type EconomySectorResponse,
} from "@/hooks/api/economySectorApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";

const STALE_TIME_MS = 60 * 60 * 1000;

type CacheEntry = {
  fetchedAt: number;
  data: EconomySectorResponse;
};

let cached: CacheEntry | null = null;

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

export function useEconomySector(): UseEconomySectorResult {
  const [data, setData] = useState<EconomySectorResponse | null>(() => {
    const c = cached;
    return c && isFresh(c, Date.now()) ? c.data : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const c = cached;
    return !(c && isFresh(c, Date.now()));
  });
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const now = Date.now();
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
        const res = await fetchEconomySector(ac.signal);
        if (cancelledRef.current) {
          return;
        }
        cached = { fetchedAt: Date.now(), data: res };
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
  }, [reloadKey]);

  const refetch = useCallback(() => {
    cached = null;
    setReloadKey((k) => k + 1);
  }, []);

  return { data, isLoading, error, refetch };
}
