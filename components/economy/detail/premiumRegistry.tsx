import type { ComponentType } from "react";

import { GdpGrowthDetailView } from "@/components/economy/detail/gdp/GdpGrowthDetailView";
import { InflationDetailView } from "@/components/economy/detail/inflation/InflationDetailView";
import { LaborMarketDetailView } from "@/components/economy/detail/labor/LaborMarketDetailView";
import { MarketReactionDetailView } from "@/components/economy/detail/markets/MarketReactionDetailView";
import {
  type EconomyPremiumDetailId,
  isEconomyPremiumDetailId,
} from "@/lib/economy/detail/premiumSectorIds";

const ECONOMY_PREMIUM_DETAIL_SCREENS: Record<EconomyPremiumDetailId, ComponentType> = {
  labor: LaborMarketDetailView,
  inflation: InflationDetailView,
  markets: MarketReactionDetailView,
  gdp: GdpGrowthDetailView,
};

/**
 * Returns a no-props screen component for premium economy dashboards, or null.
 */
export function getEconomyPremiumDetailScreen(
  sectorId: string | undefined,
): ComponentType | null {
  if (!isEconomyPremiumDetailId(sectorId)) {
    return null;
  }
  return ECONOMY_PREMIUM_DETAIL_SCREENS[sectorId];
}
