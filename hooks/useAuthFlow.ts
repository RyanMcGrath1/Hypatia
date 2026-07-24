import { useContext } from 'react';

import {
  AuthFlowContext,
  type AuthFlowContextValue,
} from '@/components/auth/AuthFlowProvider';

export type { AuthFlowContextValue };

/**
 * Access temporary auth-flow state owned by {@link AuthFlowProvider}.
 * Throws if used outside the provider (auth route group only).
 */
export function useAuthFlow(): AuthFlowContextValue {
  const value = useContext(AuthFlowContext);
  if (!value) {
    throw new Error('useAuthFlow must be used within an AuthFlowProvider');
  }
  return value;
}
