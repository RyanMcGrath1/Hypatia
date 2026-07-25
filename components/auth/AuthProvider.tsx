/**
 * App-wide owner of the opaque session credential.
 *
 * `isAuthenticated` means the frontend currently possesses a session token —
 * not that the backend has revalidated it. No profile/user fields live here.
 *
 * `isDevAuthBypass` / `canAccessApp` support local UI access without a Session.
 * Bypass is never persisted and is never a backend credential.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { resolveDevAuthBypass } from '@/lib/auth/resolveDevAuthBypass';
import {
  fingerprintSessionToken,
  subscribeToSessionInvalidation,
} from '@/lib/auth/sessionInvalidation';
import {
  clearSessionToken,
  getSessionToken,
  SessionTokenStorageError,
  setSessionToken,
} from '@/lib/auth/tokenStorage';

export type AuthSessionContextValue = {
  /** Opaque backend session token, or null when none is held locally. */
  token: string | null;
  /** True while the initial SecureStore/memory restore is in progress. */
  isRestoring: boolean;
  /**
   * True when `token !== null`.
   * Means the frontend possesses a session credential — not that the server
   * has confirmed the session is still valid.
   */
  isAuthenticated: boolean;
  /**
   * True only in a development build with `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`.
   * Frontend navigation aid only — not a backend Session.
   */
  isDevAuthBypass: boolean;
  /**
   * True when the UI may treat the user as allowed into the app shell:
   * `isAuthenticated || isDevAuthBypass`.
   */
  canAccessApp: boolean;
  /** Persist a newly obtained token (login / register / TOTP), then update state. */
  establishSession: (token: string) => Promise<void>;
  /** Persist a rotated token, then update state (password / TOTP changes). */
  replaceSession: (token: string) => Promise<void>;
  /** Clear persistent storage and local session state. */
  clearSession: () => Promise<void>;
};

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const clearingFromInvalidationRef = useRef(false);

  const isDevAuthBypass = resolveDevAuthBypass({
    isDevBuild: __DEV__,
    envValue: process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS,
  });

  tokenRef.current = token;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await getSessionToken();
        if (!cancelled) {
          setToken(stored);
        }
      } catch (e) {
        if (!cancelled) {
          setToken(null);
          if (e instanceof SessionTokenStorageError) {
            console.warn('Unable to restore session token from secure storage.');
          } else {
            console.warn('Unable to restore session token.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistThenSetToken = useCallback(async (nextToken: string) => {
    await setSessionToken(nextToken);
    setToken(nextToken);
  }, []);

  const establishSession = useCallback(
    async (nextToken: string) => {
      await persistThenSetToken(nextToken);
    },
    [persistThenSetToken],
  );

  const replaceSession = useCallback(
    async (nextToken: string) => {
      await persistThenSetToken(nextToken);
    },
    [persistThenSetToken],
  );

  const clearSession = useCallback(async () => {
    let storageError: unknown;
    try {
      await clearSessionToken();
    } catch (e) {
      storageError = e;
    }
    // Always drop in-memory auth so this process no longer treats the user as
    // authenticated, even if persistent deletion failed.
    setToken(null);
    if (storageError !== undefined) {
      throw storageError;
    }
  }, []);

  // Authenticated Bearer 401 → clear only when the rejected token is still current.
  useEffect(() => {
    return subscribeToSessionInvalidation((event) => {
      void (async () => {
        const current = tokenRef.current;
        if (current === null) {
          return;
        }
        if (clearingFromInvalidationRef.current) {
          return;
        }

        let currentFingerprint: string;
        try {
          currentFingerprint = await fingerprintSessionToken(current);
        } catch {
          return;
        }

        if (currentFingerprint !== event.tokenFingerprint) {
          // Stale 401 for a rotated-away Session — keep the replacement.
          return;
        }
        // Token may have rotated while awaiting the fingerprint.
        if (tokenRef.current !== current) {
          return;
        }

        clearingFromInvalidationRef.current = true;
        try {
          await clearSession();
        } catch {
          // clearSession already nulls in-memory token; storage errors must not
          // surface as unhandled rejections from the HTTP invalidation path.
        } finally {
          clearingFromInvalidationRef.current = false;
        }
      })();
    });
  }, [clearSession]);

  const value = useMemo<AuthSessionContextValue>(() => {
    const isAuthenticated = token !== null;
    return {
      token,
      isRestoring,
      isAuthenticated,
      isDevAuthBypass,
      canAccessApp: isAuthenticated || isDevAuthBypass,
      establishSession,
      replaceSession,
      clearSession,
    };
  }, [
    token,
    isRestoring,
    isDevAuthBypass,
    establishSession,
    replaceSession,
    clearSession,
  ]);

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}
