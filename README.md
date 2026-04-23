# Hypatia

Hypatia is an Expo + React Native app with a tab-based interface for experimenting with political profile UX.  
The current app includes a searchable **Politician Profiles** experience backed by local mock data (name suggestions, profile cards, key positions, headlines, and an approval trend chart), plus starter tabs for additional features.

## What the project does

- Provides a multi-tab mobile/web app scaffold using `expo-router`.
- Includes a fully styled `Politician` tab with:
  - type-ahead name search,
  - loading/empty/result states,
  - profile summary and metrics,
  - key positions and recent headlines,
  - approval trend visualization.
- Keeps supporting tabs (`Home`, `Explore`, and `Ryan`) for additional feature development.

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
- `npm run check` - Run typecheck + lint.

## Project structure

- `app/` - Route screens (tabs and layouts).
- `components/` - Shared UI components.
- `hooks/` - Reusable hooks.
- `constants/` - Shared constants and theme values.
- `scripts/` - Helper scripts for local tooling.

## Notes

- This project started from `create-expo-app` and has been customized for Hypatia-specific UI flows.
