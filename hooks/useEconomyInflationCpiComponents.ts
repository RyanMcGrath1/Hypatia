/**
 * Cached fetcher for `GET /api/economy/inflation/cpi-components`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchInflationCpiComponents,
  InflationCpiComponentsApiError,
  type InflationCpiComponentsResponse,
} from "@/hooks/api/economyInflationCpiComponentsApi";
import { getHypatiaBackendNetworkErrorMessage } from "@/hooks/api/hypatiaBaseUrl";

const STALE_TIME_MS = 60 * 60 * 1000;

type CacheEntry = {
  fetchedAt: number;
  data: InflationCpiComponentsResponse;
};

let cache: CacheEntry | null = null;

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

function isFresh(entry: CacheEntry, now: number): boolean {
  return now - entry.fetchedAt < STALE_TIME_MS;
}

function errorMessageFromCaught(e: unknown): string {
  if (e instanceof InflationCpiComponentsApiError) {
    if (e.status === 503) {
      return "Economy data unavailable";
    }
    return e.message;
  }
  if (e instanceof Error) {
    if (e.message.startsWith("Network error")) {
      return getHypatiaBackendNetworkErrorMessage();
    }
    return e.message;
  }
  return String(e);
}

export type UseEconomyInflationCpiComponentsResult = {
  data: InflationCpiComponentsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useEconomyInflationCpiComponents(): UseEconomyInflationCpiComponentsResult {
  const [data, setData] = useState<InflationCpiComponentsResponse | null>(() => {
    return cache && isFresh(cache, Date.now()) ? cache.data : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !(cache && isFresh(cache, Date.now()));
  });
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const now = Date.now();
    if (cache && isFresh(cache, now)) {
      setData(cache.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setData(null);
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetchInflationCpiComponents(ac.signal);
        if (cancelledRef.current) {
          return;
        }
        cache = { fetchedAt: Date.now(), data: res };
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
    cache = null;
    setReloadKey((k) => k + 1);
  }, []);

  return { data, isLoading, error, refetch };
}
