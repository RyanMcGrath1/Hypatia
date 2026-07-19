# Hypatia app ↔ hypatia-backend

The Expo app talks to a single Flask service (`hypatia-backend`, default **port 5001**).

## Frontend modules

| `Hypatia/hooks/api/` | Backend |
|----------------------|---------|
| `hypatiaPaths.ts` | Path constants (keep in sync with server routes) |
| `hypatiaBaseUrl.ts` | Base URL: `EXPO_PUBLIC_HYPATIA_BASE_URL` → `EXPO_PUBLIC_API_BASE_URL` → news URL / Metro proxy |
| `economyDashboardApi.ts` | `routes/economy/dashboard.py` |
| `economyDetailApi.ts` | `routes/economy/detail.py` |
| `economyCpiApi.ts` | `routes/economy/cpi.py` |
| `economyInflationPceVsTargetApi.ts` | `routes/economy/inflation_pce_vs_target.py` |
| `economyInflationCpiComponentsApi.ts` | `routes/economy/inflation_cpi_components.py` |
| `economySectorApi.ts` | `routes/economy/labor_sector.py` |
| `fredObservations.ts` | `routes/economy/fred.py` |
| `flaskMainApi.ts` | `routes/civic/`, `routes/health.py` |
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

Web dev uses the Metro proxy in `metro.config.js` for loopback URLs so CORS is not required for `:5001`.
