/**
 * Pathname segments for top-level tab screens (Expo may omit the `(tabs)` group).
 * Keep in sync with `app/(tabs)/_layout.tsx` screen names.
 */
const MAIN_TAB_SEGMENTS = new Set([
  "index",
  "economy",
  "politician",
  "explore",
]);

/**
 * True on primary tab roots only — never on stack/detail routes
 * (e.g. `/economy/labor`, `/article`, `/profile`).
 */
export function isMainTabPathname(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/(tabs)") {
    return true;
  }

  if (path.startsWith("/(tabs)/")) {
    const rest = path.slice("/(tabs)/".length);
    const first = rest.split("/").filter(Boolean)[0];
    return first === undefined || MAIN_TAB_SEGMENTS.has(first);
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    return true;
  }
  if (segments.length === 1) {
    return MAIN_TAB_SEGMENTS.has(segments[0]!);
  }

  return false;
}

/** Show the AppBanner back control on stack / detail screens (e.g. economy labor detail). */
export function appBannerShowsBack(pathname: string): boolean {
  return !isMainTabPathname(pathname);
}
