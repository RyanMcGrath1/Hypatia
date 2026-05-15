import { useEffect, useState } from "react";

import { fetchEconomySectorDashboard } from "@/hooks/api/flaskMainApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";
import {
  type EconomyOverviewApiResponse,
} from "@/lib/economy/economyOverviewTypes";
import { mergeEconomySectorDashboardResponses } from "@/lib/economy/mergeEconomySectorDashboardResponses";
import { ECONOMY_FEED_IDS } from "@/lib/economy/economyTabFeed";

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
        const settled = await Promise.allSettled(
          ECONOMY_FEED_IDS.map((id) =>
            fetchEconomySectorDashboard(id, controller.signal),
          ),
        );
        if (!cancelled) {
          const merged = mergeEconomySectorDashboardResponses(settled);
          if (merged) {
            setEconomyOverview(merged);
          } else {
            setEconomyOverview(null);
            const firstRejection = settled.find(
              (r): r is PromiseRejectedResult => r.status === "rejected",
            );
            const reason =
              firstRejection?.reason instanceof Error
                ? firstRejection.reason.message
                : "Could not load economy sector dashboards.";
            setEconomyOverviewError(reason);
          }
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
