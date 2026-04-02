import React from 'react';
import { Platform } from 'react-native';

type UseFlaskHelloSearchResult = {
  isLoading: boolean;
  error: string | null;
  /** Parsed JSON object/array, or raw string if response is not JSON */
  apiData: unknown | null;
};

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

export function useFlaskHelloSearch(query: string): UseFlaskHelloSearchResult {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [apiData, setApiData] = React.useState<unknown | null>(null);
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000');

  React.useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setIsLoading(false);
      setError(null);
      setApiData(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${apiBaseUrl}/hello`, {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const text = await response.text();
        setApiData(parseResponseBody(text));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (Platform.OS === 'web') {
          setError('Unable to reach Flask (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)');
        } else {
          setError('Unable to reach Flask endpoint (check host/IP for your device)');
        }
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiBaseUrl, query]);

  return { isLoading, error, apiData };
}
