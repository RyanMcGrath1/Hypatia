import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/constants/app/routes';

/**
 * Auth entry — redirects unauthenticated users to Login.
 * Unauthenticated users land here when `(auth)` is the active protected group.
 */
export default function AuthLandingScreen() {
  return <Redirect href={AppRoutes.authLogin as Href} />;
}
