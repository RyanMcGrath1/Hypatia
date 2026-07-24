import { useContext } from 'react';

import {
  AuthSessionContext,
  type AuthSessionContextValue,
} from '@/components/auth/AuthProvider';

export type { AuthSessionContextValue };

/**
 * Access the app-wide auth session owned by {@link AuthProvider}.
 * Throws if used outside the provider.
 */
export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error('useAuthSession must be used within an AuthProvider');
  }
  return value;
}
