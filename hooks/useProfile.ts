/**
 * Application-level Profile state for the authenticated Session.
 *
 * Fetches only when a real Session token exists. Dev-auth bypass alone never
 * triggers Profile API calls and never invents fake Profile data.
 *
 * Error policy:
 * - Initial GET failure → profile null, error set
 * - Refresh failure after existing data → previous profile kept, error set
 * - 401 is surfaced; this hook does not call clearSession
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getProfile,
  ProfileApiError,
  updateProfile as updateProfileApi,
  type Profile,
} from '@/hooks/api/profileApi';
import { useAuthSession } from '@/hooks/useAuthSession';

export type UpdatePersonalInfoParams = {
  firstName?: string;
  lastName?: string;
};

export type UseProfileResult = {
  profile: Profile | null;
  isLoading: boolean;
  error: ProfileApiError | Error | null;
  /**
   * True when AuthProvider holds a real Session (token + authenticated) and
   * restore has finished. False for dev-bypass-only access.
   */
  hasAuthenticatedSession: boolean;
  /** True when a Profile object is currently loaded from the backend. */
  isAvailable: boolean;
  /** Re-fetch Profile for the current Session. No-op without a real token. */
  refresh: () => Promise<void>;
  /** PATCH first/last name and replace local Profile with the server response. */
  updatePersonalInfo: (params: UpdatePersonalInfoParams) => Promise<Profile>;
};

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

function toStoredError(e: unknown): ProfileApiError | Error {
  if (e instanceof ProfileApiError || e instanceof Error) {
    return e;
  }
  return new Error(String(e));
}

export function useProfile(): UseProfileResult {
  const { token, isAuthenticated, isRestoring } = useAuthSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ProfileApiError | Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fetchGenerationRef = useRef(0);

  const hasAuthenticatedSession =
    !isRestoring && isAuthenticated && token !== null;

  const loadProfile = useCallback(
    async (
      sessionToken: string,
      options: { keepExistingOnError: boolean },
    ): Promise<void> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const generation = ++fetchGenerationRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getProfile({ token: sessionToken, signal: ac.signal });
        if (generation !== fetchGenerationRef.current) {
          return;
        }
        setProfile(data);
        setError(null);
      } catch (e) {
        if (isAbortError(e) || generation !== fetchGenerationRef.current) {
          return;
        }
        if (!options.keepExistingOnError) {
          setProfile(null);
        }
        setError(toStoredError(e));
      } finally {
        if (generation === fetchGenerationRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    if (!token || !isAuthenticated) {
      abortRef.current?.abort();
      fetchGenerationRef.current += 1;
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Drop any prior Session's Profile before loading the current token.
    setProfile(null);
    void loadProfile(token, { keepExistingOnError: false });

    return () => {
      abortRef.current?.abort();
      // Invalidate in-flight handlers so late resolves cannot update state.
      fetchGenerationRef.current += 1;
    };
  }, [token, isAuthenticated, isRestoring, loadProfile]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!token || !isAuthenticated) {
      return;
    }
    await loadProfile(token, { keepExistingOnError: true });
  }, [token, isAuthenticated, loadProfile]);

  const updatePersonalInfo = useCallback(
    async (params: UpdatePersonalInfoParams): Promise<Profile> => {
      if (!token || !isAuthenticated) {
        throw new ProfileApiError('Not authenticated', 401);
      }

      const updated = await updateProfileApi({
        token,
        firstName: params.firstName,
        lastName: params.lastName,
      });

      // Invalidate in-flight GETs so they cannot overwrite this update.
      abortRef.current?.abort();
      fetchGenerationRef.current += 1;
      setProfile(updated);
      setError(null);
      setIsLoading(false);
      return updated;
    },
    [token, isAuthenticated],
  );

  return {
    profile,
    isLoading,
    error,
    hasAuthenticatedSession,
    isAvailable: profile !== null,
    refresh,
    updatePersonalInfo,
  };
}
