import type { ComponentType } from "react";

import { LaborMarketDetailView } from "@/components/economy/detail/labor/LaborMarketDetailView";
import {
  type EconomyPremiumDetailId,
  isEconomyPremiumDetailId,
} from "@/lib/economy/detail/premiumSectorIds";

const ECONOMY_PREMIUM_DETAIL_SCREENS: Record<EconomyPremiumDetailId, ComponentType> = {
  labor: LaborMarketDetailView,
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
