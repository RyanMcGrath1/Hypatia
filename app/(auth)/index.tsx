import { Redirect, type Href } from 'expo-router';

/**
 * Temporary auth entry — redirects to Registration until Login exists (Step 9).
 * Unauthenticated users land here when `(auth)` is the active protected group.
 */
export default function AuthLandingScreen() {
  return <Redirect href={'/register' as Href} />;
}
