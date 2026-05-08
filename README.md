![Hypatia logo](./assets/images/light-logo.png)

Hypatia is an Expo + React Native app with a tab-first mobile UX for exploring economic signals, political intelligence, and AI-curated news.

The app currently includes:

- a redesigned **Economy Dashboard** with sentiment hero, API-driven indicator cards, and sector drilldowns,
- a dedicated **Economy Detail** flow with stack navigation and gesture back,
- a redesigned **Politician Intelligence** tab with trending cards, legislative actions, and financial analytics,
- a news-first **Home** tab with sticky topic filters and article category stamps,
- a redesigned **Explore/Discover** tab for quick entry into major app domains.

## Core features

### Economy

- `app/(tabs)/economy.tsx`: high-level dashboard with:
  - sentiment hero gauge and summary stats,
  - indicator cards with trend states (green up, red down, yellow neutral),
  - API-backed mini bar charts in each indicator card,
  - CTA rows that route to sector details.
- `app/economy/[sectorId].tsx`: sector deep-dive screen with:
  - header configured via stack options,
  - interpretation + key metrics,
  - swipe-back enabled through stack navigation.

### News (Home tab)

- `app/(tabs)/index.tsx` provides:
  - paginated top-headlines feed,
  - sticky category chips while scrolling,
  - per-article category stamp (top-right),
  - source/time metadata split styling (source accent + relative timestamp),
  - pull-to-refresh and infinite scroll states.

### Politician

- `app/(tabs)/politician.tsx` provides:
  - discover-style top layout (filters, trending now carousel, legislative actions, financial analytics),
  - type-ahead name search,
  - loading/empty/result states,
  - profile summary and metrics,
  - key positions and recent headlines,
  - trend chart visualization.

### Explore (Discover)

- `app/(tabs)/explore.tsx` provides:
  - top-level discovery dashboard,
  - domain cards linking to economy/politician/news tabs,
  - featured insight and quick-action cards.

## UX and design system direction

Recent improvements introduced:

- shared route constants in `constants/app/routes.ts`,
- semantic theme tokens in `constants/theme/ThemeTokens.ts`,
- reusable primitives in `components/layout/ScreenHeader.tsx`, `components/surfaces/SectionCard.tsx`, and `components/surfaces/EmptyState.tsx`,
- accessibility-friendly tab metadata with icon-first presentation,
- docked bottom tab bar anchored to the screen bottom.

## Tech stack

- [Expo](https://expo.dev) + React Native
- [expo-router](https://docs.expo.dev/router/introduction/) for file-based routing
- TypeScript

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file from the template:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start the development server:

   ```bash
   npx expo start
   ```

4. Open the app in Expo Go, simulator, emulator, or web from the Expo CLI menu.

## Environment variables and API keys

- `EXPO_PUBLIC_*` variables are bundled into the client and are public.
- Use `.env` for local client config (for example `EXPO_PUBLIC_API_BASE_URL`).
- Store secret API keys only in your backend/Flask environment, never in the Expo app.

## Useful scripts

- `npm run start` - Start Expo.
- `npm run android` - Open Android target.
- `npm run ios` - Open iOS target.
- `npm run web` - Run web target.
- `npm run typecheck` - Run TypeScript checks.
- `npm run lint` - Run linting.
- `npm run test:navigation-smoke` - Verify economy route/navigation contract.
- `npm run check` - Run typecheck + lint + navigation smoke checks.

## Project structure

- `app/` - Route screens, tab layout, and stack detail screens.
- `components/` - Shared UI: `theme/`, `surfaces/`, `layout/`, `navigation/`, `charts/`, and `ui/` (tab bar, icons).
- `hooks/` - Reusable hooks; feature hooks live under `hooks/feed/`.
- `constants/` - `app/` (routes, config), `theme/` (colors, tokens, typography), `data/` (static datasets).
- `scripts/` - Local helper scripts and smoke checks.

## Notes

- The project started from `create-expo-app` and has been customized for Hypatia-specific UX flows.
