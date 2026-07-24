/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useAuthSession, getProfile, updateProfile, clearSession, ProfileApiError } =
  vi.hoisted(() => {
    class ProfileApiError extends Error {
      constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown = null,
      ) {
        super(message);
        this.name = 'ProfileApiError';
      }
    }
    return {
      useAuthSession: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
      clearSession: vi.fn(),
      ProfileApiError,
    };
  });

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession,
}));

vi.mock('@/hooks/api/profileApi', () => ({
  getProfile,
  updateProfile,
  ProfileApiError,
}));

import { useProfile } from '@/hooks/useProfile';

const TOKEN_A = 'opaque_session_tok_A_111';
const TOKEN_B = 'opaque_session_tok_B_222';

const PROFILE_A = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  dateJoined: '2024-01-15T12:00:00Z',
  email: 'ada@example.com',
  passwordChangedAt: null as string | null,
  totpEnabled: false,
};

const PROFILE_B = {
  firstName: 'Grace',
  lastName: 'Hopper',
  dateJoined: '2023-05-01T00:00:00Z',
  email: 'grace@example.com',
  passwordChangedAt: '2025-01-01T00:00:00Z' as string | null,
  totpEnabled: true,
};

type AuthMock = {
  token: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  isDevAuthBypass: boolean;
  canAccessApp: boolean;
};

function mockAuth(partial: Partial<AuthMock>) {
  const value = {
    token: null as string | null,
    isAuthenticated: false,
    isRestoring: false,
    isDevAuthBypass: false,
    canAccessApp: false,
    establishSession: vi.fn(),
    replaceSession: vi.fn(),
    clearSession,
    ...partial,
  };
  useAuthSession.mockReturnValue(value);
  return value;
}

describe('useProfile', () => {
  beforeEach(() => {
    getProfile.mockReset();
    updateProfile.mockReset();
    clearSession.mockReset();
    useAuthSession.mockReset();
    clearSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticated initial load', () => {
    it('calls getProfile, exposes loading, then stores Profile', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });

      let resolveGet: (value: typeof PROFILE_A) => void = () => {};
      getProfile.mockImplementationOnce(
        () =>
          new Promise<typeof PROFILE_A>((resolve) => {
            resolveGet = resolve;
          }),
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(getProfile).toHaveBeenCalledTimes(1);
      });
      expect(getProfile).toHaveBeenCalledWith(
        expect.objectContaining({ token: TOKEN_A }),
      );
      expect(result.current.isLoading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.hasAuthenticatedSession).toBe(true);

      await act(async () => {
        resolveGet(PROFILE_A);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.profile).toEqual(PROFILE_A);
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('no session', () => {
    it('does not call getProfile and does not stay loading', async () => {
      mockAuth({
        token: null,
        isAuthenticated: false,
        canAccessApp: false,
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(getProfile).not.toHaveBeenCalled();
      expect(result.current.profile).toBeNull();
      expect(result.current.hasAuthenticatedSession).toBe(false);
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('dev bypass only', () => {
    it('does not fetch, invent Profile, or stay loading', async () => {
      mockAuth({
        token: null,
        isAuthenticated: false,
        isDevAuthBypass: true,
        canAccessApp: true,
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(getProfile).not.toHaveBeenCalled();
      expect(result.current.profile).toBeNull();
      expect(result.current.hasAuthenticatedSession).toBe(false);
      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('session removed', () => {
    it('clears loaded Profile when token becomes null', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValue(PROFILE_A);

      const { result, rerender } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      mockAuth({
        token: null,
        isAuthenticated: false,
        canAccessApp: false,
      });
      rerender();

      await waitFor(() => {
        expect(result.current.profile).toBeNull();
      });
      expect(result.current.hasAuthenticatedSession).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('token replaced', () => {
    it('reloads with token B and does not retain Profile A', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValueOnce(PROFILE_A);

      const { result, rerender } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      getProfile.mockResolvedValueOnce(PROFILE_B);
      mockAuth({
        token: TOKEN_B,
        isAuthenticated: true,
        canAccessApp: true,
      });
      rerender();

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_B);
      });
      expect(getProfile).toHaveBeenCalledWith(
        expect.objectContaining({ token: TOKEN_B }),
      );
      expect(result.current.profile).not.toEqual(PROFILE_A);
    });
  });

  describe('refresh', () => {
    it('calls getProfile with current token and updates Profile', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValueOnce(PROFILE_A);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      const refreshed = { ...PROFILE_A, firstName: 'Augusta' };
      getProfile.mockResolvedValueOnce(refreshed);

      await act(async () => {
        await result.current.refresh();
      });

      expect(getProfile).toHaveBeenLastCalledWith(
        expect.objectContaining({ token: TOKEN_A }),
      );
      expect(result.current.profile).toEqual(refreshed);
      expect(result.current.error).toBeNull();
    });

    it('no-ops without a real session', async () => {
      mockAuth({
        token: null,
        isAuthenticated: false,
        isDevAuthBypass: true,
        canAccessApp: true,
      });

      const { result } = renderHook(() => useProfile());

      await act(async () => {
        await result.current.refresh();
      });

      expect(getProfile).not.toHaveBeenCalled();
    });
  });

  describe('updatePersonalInfo', () => {
    it('calls updateProfile and replaces hook Profile state', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValue(PROFILE_A);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      const updated = { ...PROFILE_A, firstName: 'Matthew' };
      updateProfile.mockResolvedValueOnce(updated);

      let returned: typeof PROFILE_A | undefined;
      await act(async () => {
        returned = await result.current.updatePersonalInfo({ firstName: 'Matthew' });
      });

      expect(updateProfile).toHaveBeenCalledWith({
        token: TOKEN_A,
        firstName: 'Matthew',
        lastName: undefined,
      });
      expect(returned).toEqual(updated);
      expect(result.current.profile).toEqual(updated);
    });
  });

  describe('errors', () => {
    it('sets safe error state on initial GET failure', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockRejectedValueOnce(
        new ProfileApiError('Unauthorized', 401, { error: 'Unauthorized' }),
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeInstanceOf(ProfileApiError);
      expect((result.current.error as InstanceType<typeof ProfileApiError>).status).toBe(
        401,
      );
      expect(clearSession).not.toHaveBeenCalled();
    });

    it('keeps existing Profile when refresh fails', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValueOnce(PROFILE_A);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      getProfile.mockRejectedValueOnce(
        new ProfileApiError('Service unavailable', 503, {
          error: 'Service unavailable',
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.profile).toEqual(PROFILE_A);
      expect(result.current.error).toBeInstanceOf(ProfileApiError);
      expect((result.current.error as InstanceType<typeof ProfileApiError>).status).toBe(
        503,
      );
    });

    it('exposes 401 without calling clearSession', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockRejectedValueOnce(
        new ProfileApiError('Unauthorized', 401, { error: 'Unauthorized' }),
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(ProfileApiError);
      });
      expect((result.current.error as InstanceType<typeof ProfileApiError>).status).toBe(
        401,
      );
      expect(clearSession).not.toHaveBeenCalled();
      expect(result.current.error?.message).not.toContain(TOKEN_A);
    });
  });

  describe('abort / unmount', () => {
    it('does not apply obsolete results after unmount', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });

      let resolveGet: (value: typeof PROFILE_A) => void = () => {};
      getProfile.mockImplementationOnce(
        () =>
          new Promise<typeof PROFILE_A>((resolve) => {
            resolveGet = resolve;
          }),
      );

      const { result, unmount } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(getProfile).toHaveBeenCalledTimes(1);
      });

      unmount();

      await act(async () => {
        resolveGet(PROFILE_A);
      });

      expect(result.current.profile).toBeNull();
    });

    it('aborts prior request when token changes mid-flight', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });

      const signals: AbortSignal[] = [];
      let resolveA: (value: typeof PROFILE_A) => void = () => {};
      getProfile.mockImplementation((args: { token: string; signal?: AbortSignal }) => {
        if (args.signal) {
          signals.push(args.signal);
        }
        if (args.token === TOKEN_A) {
          return new Promise<typeof PROFILE_A>((resolve) => {
            resolveA = resolve;
          });
        }
        return Promise.resolve(PROFILE_B);
      });

      const { result, rerender } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(getProfile).toHaveBeenCalledTimes(1);
      });

      mockAuth({
        token: TOKEN_B,
        isAuthenticated: true,
        canAccessApp: true,
      });
      rerender();

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_B);
      });

      expect(signals[0]?.aborted).toBe(true);

      await act(async () => {
        resolveA(PROFILE_A);
      });

      expect(result.current.profile).toEqual(PROFILE_B);
    });
  });

  describe('security', () => {
    it('never fetches Profile from canAccessApp / bypass alone', async () => {
      mockAuth({
        token: null,
        isAuthenticated: false,
        isDevAuthBypass: true,
        canAccessApp: true,
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(getProfile).not.toHaveBeenCalled();
      expect(updateProfile).not.toHaveBeenCalled();
      expect(result.current.profile).toBeNull();
    });

    it('clears Profile when real Session disappears', async () => {
      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        canAccessApp: true,
      });
      getProfile.mockResolvedValue(PROFILE_A);

      const { result, rerender } = renderHook(() => useProfile());
      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });

      mockAuth({
        token: null,
        isAuthenticated: false,
        isDevAuthBypass: true,
        canAccessApp: true,
      });
      rerender();

      await waitFor(() => {
        expect(result.current.profile).toBeNull();
      });
      expect(result.current.hasAuthenticatedSession).toBe(false);
    });
  });

  describe('while restoring', () => {
    it('does not fetch until restore completes', async () => {
      mockAuth({
        token: null,
        isAuthenticated: false,
        isRestoring: true,
        canAccessApp: false,
      });

      const { result, rerender } = renderHook(() => useProfile());

      expect(getProfile).not.toHaveBeenCalled();

      mockAuth({
        token: TOKEN_A,
        isAuthenticated: true,
        isRestoring: false,
        canAccessApp: true,
      });
      getProfile.mockResolvedValueOnce(PROFILE_A);
      rerender();

      await waitFor(() => {
        expect(result.current.profile).toEqual(PROFILE_A);
      });
      expect(getProfile).toHaveBeenCalledTimes(1);
    });
  });
});
