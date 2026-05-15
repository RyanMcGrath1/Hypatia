import { useEffect, useState } from "react";

import { fetchEconomyOverview } from "@/hooks/api/flaskMainApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";
import {
  type EconomyOverviewApiResponse,
  parseEconomyOverviewResponse,
} from "@/lib/economy/economyOverviewTypes";

export function useEconomyTabDashboard() {
  const [economyOverview, setEconomyOverview] =
    useState<EconomyOverviewApiResponse | null>(null);
  const [isEconomyOverviewLoading, setIsEconomyOverviewLoading] =
    useState(true);
  const [economyOverviewError, setEconomyOverviewError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        setIsEconomyOverviewLoading(true);
        setEconomyOverviewError(null);
        const raw = await fetchEconomyOverview(controller.signal);
        if (cancelled) {
          return;
        }
        const parsed = parseEconomyOverviewResponse(raw);
        if (parsed) {
          setEconomyOverview(parsed);
        } else {
          setEconomyOverview(null);
          setEconomyOverviewError("Could not parse economy overview response.");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setEconomyOverview(null);
          const message =
            err instanceof Error && err.message.startsWith("Network error")
              ? getNewsApiNetworkErrorMessage()
              : err instanceof Error
                ? err.message
                : String(err);
          setEconomyOverviewError(message);
        }
      } finally {
        if (!cancelled) {
          setIsEconomyOverviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return {
    economyOverview,
    isEconomyOverviewLoading,
    economyOverviewError,
  };
}
