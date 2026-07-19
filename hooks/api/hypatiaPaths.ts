/**
 * Hypatia backend path constants — keep in sync with hypatia-backend `hypatia/routes/`
 * (see `hypatia-backend/docs/API_STRUCTURE.md`).
 */
export const HYPATIA_API_PATHS = {
  health: "/health",
  /** Legacy alias; backend registers the same handler as `health`. */
  hello: "/hello",
  civicDivisionsByAddress: "/api/civic/divisions-by-address",
  civicRepresentatives: "/api/civic/representatives",
  economyDashboard: "/api/economy/dashboard",
  economyDetail: "/api/economy/detail",
  economyCpi: "/api/economy/cpi",
  economyInflationPceVsTarget: "/api/economy/inflation/pce-vs-target",
  economyInflationCpiComponents: "/api/economy/inflation/cpi-components",
  economyRatesFedFundsTarget: "/api/economy/rates/fed-funds-target",
  economyRatesKeyMetrics: "/api/economy/rates/key-metrics",
  economyLaborSector: "/api/economy/labor/sector",
  economyLaborEarningsInflation: "/api/economy/labor/earnings-inflation",
  economyLaborAgeMetrics: "/api/economy/labor/age-metrics",
  economyFredObservations: "/api/economy/fred/observations",
  economyPayemsDelta: "/api/economy/fred/series/PAYEMS/delta",
  newsTopHeadlines: "/api/news/top-headlines",
  newsSearch: "/api/news/search",
  fecCandidates: "/api/fec/candidates",
} as const;
