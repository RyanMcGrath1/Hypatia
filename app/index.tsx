import { Redirect, type Href } from 'expo-router';

import { useAuthSession } from '@/hooks/useAuthSession';
import { resolveRootRedirect } from '@/lib/auth/resolveRootRedirect';

/**
 * Canonical root (`/`) — explicit Login vs protected-app decision.
 *
 * Without this screen, Expo Router falls through to the first public
 * Stack utility route, which must remain a deep-link destination only —
 * never the unauthenticated default.
 *
 * Restoration is also gated in RootNavigationChrome; returning null
 * here covers the same wait contract if index mounts while restoring.
 */
export default function RootIndexScreen() {
  const { canAccessApp, isRestoring } = useAuthSession();
  const decision = resolveRootRedirect({ isRestoring, canAccessApp });

  if (decision.kind === 'wait') {
    return null;
  }

  return <Redirect href={decision.href as Href} />;
}
