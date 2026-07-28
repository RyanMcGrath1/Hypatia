/**
 * In-memory owner of temporary pre-authentication flow state.
 *
 * Holds the MFA challenge token across Login → login-totp navigation only.
 * Never persists to disk, browser storage, URL, or cookies.
 * Distinct from the Session provider, which owns authenticated Session state.
 */

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { MfaChallengeToken } from '@/hooks/api/authApi';

export type AuthFlowContextValue = {
  /** Opaque MFA challenge for TOTP completion — memory only, never a Session. */
  pendingTotpChallenge: MfaChallengeToken | null;
  /** Store a fresh MFA challenge after password Login returns totp_required. */
  beginTotpLogin: (challenge: MfaChallengeToken) => void;
  /** Drop the pending MFA challenge when the flow ends or must restart. */
  clearTotpLogin: () => void;
};

export const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

type AuthFlowProviderProps = {
  children: ReactNode;
};

export function AuthFlowProvider({ children }: AuthFlowProviderProps) {
  const [pendingTotpChallenge, setPendingTotpChallenge] =
    useState<MfaChallengeToken | null>(null);

  const beginTotpLogin = useCallback((challenge: MfaChallengeToken) => {
    setPendingTotpChallenge(challenge);
  }, []);

  const clearTotpLogin = useCallback(() => {
    setPendingTotpChallenge(null);
  }, []);

  const value = useMemo<AuthFlowContextValue>(
    () => ({
      pendingTotpChallenge,
      beginTotpLogin,
      clearTotpLogin,
    }),
    [pendingTotpChallenge, beginTotpLogin, clearTotpLogin],
  );

  return (
    <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>
  );
}
