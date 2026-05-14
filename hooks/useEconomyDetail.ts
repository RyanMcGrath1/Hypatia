import { useEffect, useState } from "react";

import {
  EconomyDetailApiError,
  type EconomyDetailResponse,
  type EconomyDetailTopic,
  fetchEconomyDetail,
} from "@/hooks/api/economyDetailApi";

export type UseEconomyDetailResult = {
  data: EconomyDetailResponse | null;
  isLoading: boolean;
  error: string | null;
};

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

export function useEconomyDetail(
  topic: EconomyDetailTopic,
  observationEnd?: string,
): UseEconomyDetailResult {
  const [data, setData] = useState<EconomyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetchEconomyDetail(
          { topic, observation_end: observationEnd },
          ac.signal,
        );
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (isAbort(e)) {
          return;
        }
        if (!cancelled) {
          setData(null);
          if (e instanceof EconomyDetailApiError) {
            setError(e.message);
          } else {
            setError(e instanceof Error ? e.message : String(e));
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [topic, observationEnd]);

  return { data, isLoading, error };
}
