# Hypatia app ↔ hypatia-backend

The Expo app talks to a single Flask service (`hypatia-backend`, default **port 5001**).

## Frontend modules

| `Hypatia/hooks/api/` | Backend |
|----------------------|---------|
| `hypatiaPaths.ts` | Path constants (keep in sync with server routes) |
| `hypatiaBaseUrl.ts` | Base URL: `EXPO_PUBLIC_HYPATIA_BASE_URL` → `EXPO_PUBLIC_API_BASE_URL` → news URL / Metro proxy |
| `economyDashboardApi.ts` | `routes/economy/economy_controller.py` → `/api/economy/dashboard` |
| `economyGdpGrowthRateApi.ts` / `economyGdpSectorContributionApi.ts` | `routes/economy/detail.py` (GDP widgets) |
| `economyCpiApi.ts` | `routes/economy/inflation_controller.py` → `/api/economy/inflation/cpi` |
| `economyInflationPceVsTargetApi.ts` | `routes/economy/inflation_controller.py` → `/api/economy/inflation/pce-vs-target` |
| `economyInflationCpiComponentsApi.ts` | `routes/economy/inflation_controller.py` → `/api/economy/inflation/cpi-components` |
| `economyRatesFedFundsTargetApi.ts` | `routes/economy/interest_rates_controller.py` → `/api/economy/rates/fed-funds-target` |
| `economyRatesKeyMetricsApi.ts` | `routes/economy/interest_rates_controller.py` → `/api/economy/rates/key-metrics` |
| `economySectorApi.ts` | `routes/economy/labor_market_controller.py` → `/api/economy/labor/sector` |
| `economyLaborEarningsInflationApi.ts` / `economyLaborAgeMetricsApi.ts` | labor earnings + age routes |
| `fredObservations.ts` | `routes/economy/labor_market_controller.py` → `/api/economy/labor/payems/delta` |
| `newsApi.ts` | `routes/news/` |
| `fecCandidatesApi.ts` | `routes/fec/` |

Shared transport: `httpGet.ts` (`fetchApiGet`, `HttpApiError`, `X-Request-ID`).

## Backend reference

See the backend repo:

- `hypatia-backend/docs/FRONTEND_API.md` — request/response shapes
- `hypatia-backend/docs/API_STRUCTURE.md` — route package layout

## Env vars (client)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_HYPATIA_BASE_URL` | Override base for **all** Hypatia APIs |
| `EXPO_PUBLIC_NEWS_API_BASE_URL` | News/economy base if Hypatia URL unset |
| `EXPO_PUBLIC_API_BASE_URL` | Legacy Flask override (still honored) |
| `EXPO_PUBLIC_DEV_AUTH_BYPASS` | Dev-only frontend UI bypass (`true` exact). Requires `__DEV__`. Not a Session; backend auth unchanged |

Web dev uses the Metro proxy in `metro.config.js` for loopback URLs so CORS is not required for `:5001`.
