/**
 * Hypatia backend path constants — keep in sync with hypatia-backend `hypatia/routes/`
 * (see `hypatia-backend/docs/API_STRUCTURE.md`).
 */
export const HYPATIA_API_PATHS = {
  health: "/health",
  economyDashboard: "/api/economy/dashboard",
  economyGdpGrowthRate: "/api/economy/gdp/growth-rate",
  economyGdpGrowthHeadwinds: "/api/economy/gdp/growth-headwinds",
  economyGdpSectorContribution: "/api/economy/gdp/sector-contribution",
  economyCpi: "/api/economy/cpi",
  economyInflationPceVsTarget: "/api/economy/inflation/pce-vs-target",
  economyInflationCpiComponents: "/api/economy/inflation/cpi-components",
  economyRatesFedFundsTarget: "/api/economy/rates/fed-funds-target",
  economyRatesKeyMetrics: "/api/economy/rates/key-metrics",
  economyLaborSector: "/api/economy/labor/sector",
  economyLaborEarningsInflation: "/api/economy/labor/earnings-inflation",
  economyLaborAgeMetrics: "/api/economy/labor/age-metrics",
  economyPayemsDelta: "/api/economy/fred/series/PAYEMS/delta",
  newsTopHeadlines: "/api/news/top-headlines",
  fecCandidates: "/api/fec/candidates",
} as const;
