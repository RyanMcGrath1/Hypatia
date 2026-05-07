/**
 * Economy tiles that use a full dashboard layout (custom header, no stack title).
 * Add ids here when a new `detail/<id>/` screen is implemented.
 */
export const ECONOMY_PREMIUM_DETAIL_IDS = ["labor", "inflation", "markets", "gdp"] as const;

export type EconomyPremiumDetailId = (typeof ECONOMY_PREMIUM_DETAIL_IDS)[number];

export function isEconomyPremiumDetailId(id: string | undefined): id is EconomyPremiumDetailId {
  return !!id && (ECONOMY_PREMIUM_DETAIL_IDS as readonly string[]).includes(id);
}
