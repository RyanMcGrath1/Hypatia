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
  economyLaborSector: "/api/economy/labor/sector",
  economyFredObservations: "/api/economy/fred/observations",
  economyPayemsDelta: "/api/economy/fred/series/PAYEMS/delta",
  newsTopHeadlines: "/api/news/top-headlines",
  newsSearch: "/api/news/search",
  fecCandidates: "/api/fec/candidates",
} as const;
