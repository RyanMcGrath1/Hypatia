/**
 * Pure routing access decision for the root protected Stack.
 * Separates restore gating from auth vs app group selection.
 */

export type AppRouteAccess = 'restoring' | 'auth' | 'app';

export type ResolveAppRouteAccessInput = {
  isRestoring: boolean;
  canAccessApp: boolean;
};

/** Which shell may be shown once restore finishes. */
export function resolveAppRouteAccess({
  isRestoring,
  canAccessApp,
}: ResolveAppRouteAccessInput): AppRouteAccess {
  if (isRestoring) {
    return 'restoring';
  }
  return canAccessApp ? 'app' : 'auth';
}

/** `Stack.Protected` guard for the `(auth)` group. */
export function authRouteGroupGuard(canAccessApp: boolean): boolean {
  return !canAccessApp;
}

/** `Stack.Protected` guard for the `(app)` group. */
export function appRouteGroupGuard(canAccessApp: boolean): boolean {
  return canAccessApp;
}
