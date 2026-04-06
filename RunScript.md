# Run this project from scratch

This app is an [Expo](https://expo.dev) (SDK 54) project using [Expo Router](https://docs.expo.dev/router/introduction/), React Native, and TypeScript. Follow the steps below on a clean machine.

## 1. Install prerequisites

### Node.js

Install a current **LTS** version of [Node.js](https://nodejs.org/) (v18 or v20 is a safe choice for Expo SDK 54). The installer includes **npm**.

Verify:

```bash
node -v
npm -v
```

### Git (optional)

If you are cloning from a repository, install [Git](https://git-scm.com/downloads).

### Mobile / desktop targets (pick what you need)

| Target | What to install |
|--------|-----------------|
| **Physical phone** | [Expo Go](https://expo.dev/go) (same Wi‑Fi as your computer, or use tunnel mode in the dev server) |
| **Android emulator** | [Android Studio](https://developer.android.com/studio) and create a virtual device |
| **iOS Simulator** | **macOS only**: Xcode from the Mac App Store |
| **Web** | A modern browser (Chrome/Edge/Firefox). On Windows, **WSL is not required** for web if Node runs natively |

> **Windows:** You cannot run the iOS Simulator locally; use a Mac, a physical iPhone with Expo Go, or EAS cloud builds for iOS.

## 2. Get the project

Clone or copy the project folder, then open a terminal **in the project root** (the directory that contains `package.json`).

```bash
cd path/to/test
```

## 3. Install dependencies

```bash
npm install
```

This installs everything listed in `package.json` (Expo, React Native, TypeScript, ESLint, etc.). No separate global Expo CLI is required; use `npx expo` as shown below.

## 4. Start the development server

```bash
npx expo start
```

Or use the npm script:

```bash
npm start
```

The terminal will show a QR code and shortcuts. Typical actions:

- Press **`w`** — open in **web** browser  
- Press **`a`** — open in **Android** emulator (if installed and running)  
- Scan the QR code with **Expo Go** (Android: Camera or Expo Go; iOS: Camera app)

If Metro misbehaves after dependency or cache changes, clear the cache:

```bash
npx expo start -c
```

## 5. Platform-specific shortcuts (optional)

From the project root, you can also run:

```bash
npm run web      # Expo dev server focused on web
npm run android  # Expo dev server focused on Android
npm run ios      # iOS (macOS + Xcode only)
```

## 6. Quality checks (optional)

```bash
npm run typecheck   # TypeScript, no emit
npm run lint        # ESLint (Expo config)
npm run check       # typecheck + lint
```

## 7. Environment and secrets

This repo does **not** ship with `.env` files. There is no mandatory API key step for a basic local run unless you add your own configuration later.

## 8. Common issues

- **`command not found: node` / `npm`:** Reinstall Node.js and restart the terminal.
- **Port already in use:** Stop other Metro/Expo processes or change the port when prompted.
- **Stuck bundler or odd errors after upgrades:** Delete `node_modules` and reinstall:  
  `rm -rf node_modules` (or remove the folder in Explorer on Windows), then `npm install`, then `npx expo start -c`.
- **Android emulator does not connect:** Ensure the emulator is running before pressing `a`, and that USB debugging / network settings match [Expo’s Android guide](https://docs.expo.dev/workflow/android-studio-emulator/).

## Reference: useful project scripts

| Script | Command |
|--------|---------|
| Start dev server | `npm start` or `npx expo start` |
| Web | `npm run web` |
| Android | `npm run android` |
| iOS | `npm run ios` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Lint + typecheck | `npm run check` |

For more on Expo workflows, see the [Expo documentation](https://docs.expo.dev/).
