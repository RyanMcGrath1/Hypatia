/**
 * Main Flask service (default port 5000): `/hello`, civic APIs, and sample `/hello` hook.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { fetchApiGet } from '@/hooks/api/httpGet';
import { getDevApiBaseUrlForPort } from '@/hooks/api/devServerBaseUrl';

type UseFlaskHelloSearchResult = {
  isLoading: boolean;
  error: string | null;
  /** Parsed JSON object/array, or raw string if response is not JSON */
  apiData: unknown | null;
};

export function getFlaskApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return getDevApiBaseUrlForPort(5000);
}

export function getFlaskHelloNetworkErrorMessage(): string {
  if (Platform.OS === 'web') {
    return 'Unable to reach Flask (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)';
  }
  return `Unable to reach Flask at ${getFlaskApiBaseUrl()}. On a real device, the app uses your dev machine's LAN IP (same as Metro). Run Flask bound to all interfaces, e.g. flask run --host=0.0.0.0 --port=5000, or set EXPO_PUBLIC_API_BASE_URL.`;
}

async function fetchFlaskGet(
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  return fetchApiGet(getFlaskApiBaseUrl(), path, searchParams, signal);
}

/** `GET {base}/hello` — same contract as `curl http://127.0.0.1:5000/hello` when using default base on web/simulator. */
export async function fetchFlaskHello(signal?: AbortSignal): Promise<unknown> {
  return fetchFlaskGet('/hello', undefined, signal);
}

/** Sample address matching `curl "http://127.0.0.1:5000/api/civic/representatives?address=1600%20Pennsylvania%20..."`. */
export const DEFAULT_CIVIC_SAMPLE_ADDRESS =
  '1600 Pennsylvania Avenue NW Washington DC';

/** `GET {base}/api/civic/representatives?address=...` — base URL follows the same rules as `/hello`. */
export async function fetchCivicRepresentatives(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchFlaskGet(
    '/api/civic/representatives',
    { address: address.trim() },
    signal,
  );
}

/** Sample address for divisions-by-address (e.g. ZIP `07834`), matching Postman `?address=07834`. */
export const DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS = '07834';

/** `GET {base}/api/civic/divisions-by-address?address=...` — base URL follows the same rules as `/hello`. */
export async function fetchCivicDivisionsByAddress(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchFlaskGet(
    '/api/civic/divisions-by-address',
    { address: address.trim() },
    signal,
  );
}

export function useFlaskHelloSearch(query: string): UseFlaskHelloSearchResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown | null>(null);
  const apiBaseUrl = getFlaskApiBaseUrl();

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

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchFlaskHello(controller.signal);
        if (!cancelled) {
          setApiData(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (!cancelled) {
          setError(getFlaskHelloNetworkErrorMessage());
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
