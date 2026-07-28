/**
 * Pathname helpers for AppBanner back affordance.
 * Route groups like `(app)` / `(tabs)` are stripped so nested moves stay stable.
 */

/** Drop Expo Router group segments such as `(app)` or `(tabs)`. */
function withoutRouteGroups(pathname: string): string {
  const cleaned = pathname
    .split('/')
    .filter((segment) => {
      if (!segment) {
        return false;
      }
      return !(segment.startsWith('(') && segment.endsWith(')'));
    })
    .join('/');
  return cleaned ? `/${cleaned}` : '/';
}

/**
 * Pathname segments for top-level tab screens.
 * Keep in sync with `app/(app)/(tabs)/_layout.tsx` screen names.
 */
const MAIN_TAB_SEGMENTS = new Set([
  'index',
  'economy',
  'politician',
  'explore',
]);

/**
 * True on primary tab roots only — never on stack/detail routes
 * (e.g. `/economy/labor`, `/article`, `/profile`).
 */
export function isMainTabPathname(pathname: string): boolean {
  const path = withoutRouteGroups(pathname.replace(/\/$/, '') || '/');

  if (path === '/' || path === '/index') {
    return true;
  }

  const segments = path.split('/').filter(Boolean);
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
