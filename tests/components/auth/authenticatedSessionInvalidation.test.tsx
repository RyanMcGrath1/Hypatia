/**
 * @vitest-environment jsdom
 *
 * Integration: requestApi Bearer 401 → sessionInvalidation → AuthProvider
 * → useProfile clears cached Profile. Covers stale-token rotation race.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  SessionTokenStorageError,
  resolveDevAuthBypass,
} = vi.hoisted(() => {
  class SessionTokenStorageError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
      super(message, options);
      this.name = 'SessionTokenStorageError';
    }
  }
  return {
    getSessionToken: vi.fn(),
    setSessionToken: vi.fn(),
    clearSessionToken: vi.fn(),
    SessionTokenStorageError,
    resolveDevAuthBypass: vi.fn(() => false),
  };
});

vi.mock('@/lib/auth/tokenStorage', () => ({
  SessionTokenStorageError,
  getSessionToken,
  setSessionToken,
  clearSessionToken,
}));

vi.mock('@/lib/auth/resolveDevAuthBypass', () => ({
  resolveDevAuthBypass,
}));

vi.mock('@/hooks/api/hypatiaBaseUrl', () => ({
  getHypatiaBackendBaseUrl: () => 'http://127.0.0.1:5001',
}));

import { AuthProvider } from '@/components/auth/AuthProvider';
import {
  changePassword,
  verifyEmailChange,
} from '@/hooks/api/accountApi';
import { login } from '@/hooks/api/authApi';
import { requestApi } from '@/hooks/api/httpClient';
import { getProfile } from '@/hooks/api/profileApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useProfile } from '@/hooks/useProfile';
import {
  clearSessionInvalidationListenersForTests,
  fingerprintSessionToken,
  subscribeToSessionInvalidation,
} from '@/lib/auth/sessionInvalidation';

const TOKEN_A = 'opaque_session_tok_A_Finding3';
const TOKEN_B = 'opaque_session_tok_B_Finding3';

const PROFILE_A = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  date_joined: '2024-01-15T12:00:00Z',
  email: 'ada@example.com',
  password_changed_at: null,
  totp_enabled: false,
};

function mockJsonResponse(
  data: unknown,
  init: { status?: number } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: async () => JSON.stringify(data),
  } as Response;
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderAuth() {
  const hook = renderHook(() => useAuthSession(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.isRestoring).toBe(false);
  });
  return hook;
}

describe('authenticated session invalidation (Finding #3)', () => {
  beforeEach(() => {
    clearSessionInvalidationListenersForTests();
    getSessionToken.mockReset();
    setSessionToken.mockReset();
    clearSessionToken.mockReset();
    resolveDevAuthBypass.mockReset();
    getSessionToken.mockResolvedValue(null);
    setSessionToken.mockResolvedValue(undefined);
    clearSessionToken.mockResolvedValue(undefined);
    resolveDevAuthBypass.mockReturnValue(false);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    clearSessionInvalidationListenersForTests();
    vi.restoreAllMocks();
  });

  it('Bearer profile 401 clears Session and cached Profile', async () => {
    getSessionToken.mockResolvedValueOnce(TOKEN_A);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(PROFILE_A))
      .mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      );

    const { result } = renderHook(
      () => ({
        auth: useAuthSession(),
        profile: useProfile(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.auth.isRestoring).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.profile.profile).toEqual({
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateJoined: '2024-01-15T12:00:00Z',
        email: 'ada@example.com',
        passwordChangedAt: null,
        totpEnabled: false,
      });
    });

    await act(async () => {
      await expect(
        result.current.profile.refresh(),
      ).resolves.toBeUndefined();
    });

    await waitFor(() => {
      expect(result.current.auth.token).toBeNull();
    });
    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(result.current.auth.canAccessApp).toBe(false);
    expect(result.current.profile.profile).toBeNull();
    expect(clearSessionToken).toHaveBeenCalled();
  });

  it('current-token Bearer 401 clears Session via requestApi', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
    );

    await expect(
      requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/profile',
        method: 'GET',
        token: TOKEN_A,
      }),
    ).rejects.toMatchObject({ status: 401 });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('protected account mutation 401 invalidates Session', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
    );

    await expect(
      changePassword({
        token: TOKEN_A,
        currentPassword: 'oldpassword!!!!!',
        newPassword: 'newpassword!!!!!',
        confirmNewPassword: 'newpassword!!!!!',
      }),
    ).rejects.toMatchObject({ status: 401 });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
    });
  });

  it('public login 401 does not emit invalidation or clear Session', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    const listener = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(listener);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Invalid credentials' }, { status: 401 }),
    );

    await expect(
      login({ email: 'a@example.com', password: 'wrongpassword!!!' }),
    ).rejects.toMatchObject({ status: 401 });

    // Allow any accidental async invalidation to flush.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(listener).not.toHaveBeenCalled();
    expect(result.current.token).toBe(TOKEN_A);
    expect(result.current.isAuthenticated).toBe(true);
    expect(clearSessionToken).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('public email-change verify failure does not clear an unrelated Session', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    const listener = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(listener);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse(
        { error: 'Invalid or expired verification token' },
        { status: 400 },
      ),
    );

    await expect(
      verifyEmailChange({ verificationToken: 'verify-tok-xyz' }),
    ).rejects.toMatchObject({ status: 400 });

    expect(listener).not.toHaveBeenCalled();
    expect(result.current.token).toBe(TOKEN_A);
    unsubscribe();
  });

  it('authenticated non-401 errors do not clear Session', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    for (const status of [400, 429, 500] as const) {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: `fail ${status}` }, { status }),
      );
      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/profile',
          method: 'GET',
          token: TOKEN_A,
        }),
      ).rejects.toMatchObject({ status });
      expect(result.current.token).toBe(TOKEN_A);
    }
    expect(clearSessionToken).not.toHaveBeenCalled();
  });

  it('stale token-A 401 after replaceSession(B) does not clear B', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const pending = requestApi({
      baseUrl: 'http://127.0.0.1:5001',
      path: '/api/profile',
      method: 'GET',
      token: TOKEN_A,
    });

    await act(async () => {
      await result.current.replaceSession(TOKEN_B);
    });
    expect(result.current.token).toBe(TOKEN_B);
    clearSessionToken.mockClear();

    await act(async () => {
      resolveFetch(mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }));
      await expect(pending).rejects.toMatchObject({ status: 401 });
    });

    // Fingerprint correlation finishes before requestApi throws; give the
    // AuthProvider listener a turn so a buggy clear would already wipe B.
    await act(async () => {
      await fingerprintSessionToken(TOKEN_A);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.token).toBe(TOKEN_B);
    expect(result.current.isAuthenticated).toBe(true);
    expect(clearSessionToken).not.toHaveBeenCalled();
  });

  it('multiple concurrent current-token 401s clear safely once', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      );

    const rejectionSpy = vi.fn();
    const previous = process.listeners('unhandledRejection');
    process.on('unhandledRejection', rejectionSpy);

    try {
      await act(async () => {
        const results = await Promise.allSettled([
          requestApi({
            baseUrl: 'http://127.0.0.1:5001',
            path: '/api/profile',
            method: 'GET',
            token: TOKEN_A,
          }),
          getProfile({ token: TOKEN_A }),
          changePassword({
            token: TOKEN_A,
            currentPassword: 'oldpassword!!!!!',
            newPassword: 'newpassword!!!!!',
            confirmNewPassword: 'newpassword!!!!!',
          }),
        ]);
        expect(results.every((r) => r.status === 'rejected')).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.token).toBeNull();
      });
      expect(result.current.isAuthenticated).toBe(false);
      expect(clearSessionToken.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(rejectionSpy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', rejectionSpy);
      for (const listener of previous) {
        if (!process.listeners('unhandledRejection').includes(listener)) {
          process.on('unhandledRejection', listener);
        }
      }
    }
  });

  it('dev bypass: Bearer 401 clears token but keeps canAccessApp', async () => {
    resolveDevAuthBypass.mockReturnValue(true);
    getSessionToken.mockResolvedValueOnce(TOKEN_A);

    const { result } = renderHook(
      () => ({
        auth: useAuthSession(),
        profile: useProfile(),
      }),
      { wrapper },
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse(PROFILE_A),
    );

    await waitFor(() => {
      expect(result.current.profile.profile?.email).toBe('ada@example.com');
    });
    expect(result.current.auth.isDevAuthBypass).toBe(true);
    expect(result.current.auth.canAccessApp).toBe(true);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
    );

    await act(async () => {
      await result.current.profile.refresh();
    });

    await waitFor(() => {
      expect(result.current.auth.token).toBeNull();
    });
    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(result.current.auth.isDevAuthBypass).toBe(true);
    expect(result.current.auth.canAccessApp).toBe(true);
    expect(result.current.profile.profile).toBeNull();
  });

  it('storage clear failure during invalidation still nulls in-memory token', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });

    clearSessionToken.mockRejectedValueOnce(
      new SessionTokenStorageError('Unable to clear session token'),
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
    );

    const rejectionSpy = vi.fn();
    process.on('unhandledRejection', rejectionSpy);
    try {
      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/profile',
          method: 'GET',
          token: TOKEN_A,
        }),
      ).rejects.toMatchObject({ status: 401 });

      await waitFor(() => {
        expect(result.current.token).toBeNull();
      });
      expect(result.current.isAuthenticated).toBe(false);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(rejectionSpy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', rejectionSpy);
    }
  });

  it('current-token Bearer 401 invokes clearSessionToken (durable invalidation path)', async () => {
    const { result } = await renderAuth();
    await act(async () => {
      await result.current.establishSession(TOKEN_A);
    });
    clearSessionToken.mockClear();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
    );

    await expect(
      requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/profile',
        method: 'GET',
        token: TOKEN_A,
      }),
    ).rejects.toMatchObject({ status: 401 });

    await waitFor(() => {
      expect(result.current.token).toBeNull();
    });
    // Finding #11 durability lives in clearSessionToken; AuthProvider still
    // routes authenticated 401 through the same clearSession → storage clear.
    expect(clearSessionToken).toHaveBeenCalledTimes(1);
  });
});
