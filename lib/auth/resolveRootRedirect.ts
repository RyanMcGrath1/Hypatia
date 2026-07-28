/**
 * Canonical `/` destination after AuthProvider restore finishes.
 * Keeps root navigation explicit so public utility routes (e.g.
 * verify-email-change) never become the unauthenticated default via
 * Stack screen ordering.
 */

import { AppRoutes } from '@/constants/app/routes';

export type ResolveRootRedirectInput = {
  isRestoring: boolean;
  canAccessApp: boolean;
};

export type RootRedirectDecision =
  | { kind: 'wait' }
  | { kind: 'redirect'; href: typeof AppRoutes.authLogin | typeof AppRoutes.tabsRoot };

/**
 * Decide where `/` should send the user.
 *
 * - restoring → wait (do not redirect yet)
 * - canAccessApp → protected app home
 * - otherwise → Login
 */
export function resolveRootRedirect({
  isRestoring,
  canAccessApp,
}: ResolveRootRedirectInput): RootRedirectDecision {
  if (isRestoring) {
    return { kind: 'wait' };
  }
  if (canAccessApp) {
    return { kind: 'redirect', href: AppRoutes.tabsRoot };
  }
  return { kind: 'redirect', href: AppRoutes.authLogin };
}
