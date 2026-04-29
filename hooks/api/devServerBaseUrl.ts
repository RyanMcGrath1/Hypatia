/**
 * Dev-server URL helpers for backends running on your machine (Flask, news API, etc.).
 *
 * Why this exists:
 * - **Simulator / Expo web**: `127.0.0.1` points at your Mac/PC — correct host for local APIs.
 * - **Physical phone**: `127.0.0.1` is the *phone*, not your laptop — you must use your laptop's LAN IP
 *   (the same machine Expo connects to for Metro). We read that from the Expo manifest.
 * - **Android emulator**: Google routes host loopback through special alias `10.0.2.2` (maps to the host OS).
 *
 * Call sites typically combine `getDevApiBaseUrlForPort(5000)` / `(5001)` with env overrides
 * (`EXPO_PUBLIC_*_BASE_URL`) in `flaskMainApi.ts` and `newsApi.ts`.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Try to discover your development machine's LAN hostname/IP from Expo's bundle/manifest.
 * Used when a **physical device** runs the app: Metro runs on your laptop; HTTP APIs must too,
 * so the API base becomes `http://<same LAN IP as Metro>:<port>`.
 *
 * Returns `null` when we can't infer it (simulators often resolve localhost differently without needing this).
 */
function getExpoDevHostIp(): string | null {
  if (!__DEV__) {
    return null;
  }

  // Older Expo manifest shape (classic manifest.debuggerHost).
  const manifest = Constants.manifest;
  if (manifest && typeof manifest === "object" && "debuggerHost" in manifest) {
    const dh = (manifest as { debuggerHost?: string }).debuggerHost;
    if (typeof dh === "string" && dh.length > 0) {
      const host = dh.split(":")[0];
      // Ignore localhost-like hosts — those won't reach your laptop from a physical phone anyway.
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return host;
      }
    }
  }

  // Newer manifest (`manifest2`): Expo Go or dev client often exposes debugger/host URI here.
  const m2 = Constants.manifest2 as
    | {
        extra?: {
          expoGo?: { debuggerHost?: string };
          expoClient?: { hostUri?: string };
        };
      }
    | null
    | undefined;

  const goDh = m2?.extra?.expoGo?.debuggerHost;
  if (typeof goDh === "string" && goDh.length > 0) {
    const host = goDh.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  const hostUri = m2?.extra?.expoClient?.hostUri;
  if (typeof hostUri === "string" && hostUri.length > 0) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

/**
 * Android emulator runs Android OS in a VM: loopback inside the emulator is not your Mac/Windows loopback.
 * `10.0.2.2` is the emulator's alias for the host machine — same role as `127.0.0.1` for localhost APIs on desktop.
 */
function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== "android") {
    return false;
  }
  const c = Platform.constants as {
    Brand?: string;
    Model?: string;
    Manufacturer?: string;
  };
  const model = (c.Model ?? "").toLowerCase();
  const brand = (c.Brand ?? "").toLowerCase();
  return (
    model.includes("google_sdk") ||
    model.includes("emulator") ||
    model.includes("sdk_gphone") ||
    model.includes("sdk") ||
    brand === "generic"
  );
}

/**
 * Build `http://<host>:<port>` with no path — intended as EXPO_PUBLIC-style API roots after stripping slashes elsewhere.
 *
 * Resolution order (first match wins):
 * 1. **Web** — browser tab shares loopback with your machine → `127.0.0.1`.
 * 2. **Android emulator** — host loopback via `10.0.2.2` (see `isProbablyAndroidEmulator`).
 * 3. **Physical device + LAN IP from Expo** — phone reaches laptop via Wi‑Fi (debugger/manifest host).
 * 4. **Fallback** — iOS simulator: `127.0.0.1`; Android non‑emulator (physical USB?): often still LAN IP from step 3,
 *    else `10.0.2.2` on Android vs `127.0.0.1` on iOS.
 */
export function getDevApiBaseUrlForPort(port: number): string {
  if (Platform.OS === "web") {
    return `http://127.0.0.1:${port}`;
  }

  if (Platform.OS === "android" && isProbablyAndroidEmulator()) {
    return `http://10.0.2.2:${port}`;
  }

  const devHost = getExpoDevHostIp();
  if (devHost) {
    return `http://${devHost}:${port}`;
  }

  return Platform.OS === "android"
    ? `http://10.0.2.2:${port}`
    : `http://127.0.0.1:${port}`;
}
