/**
 * @vitest-environment jsdom
 *
 * Integration: AuthProvider ↔ useProfile ↔ profileApi ↔ requestApi ↔ fetch.
 *
 * Proves Session token ownership propagates into authenticated Profile HTTP
 * (real Bearer headers) and that rotation / clear update Profile state.
 *
 * Finding #3 (Bearer 401 → sessionInvalidation → clear Session + Profile) is
 * already covered in authenticatedSessionInvalidation.test.tsx — not duplicated.
 */
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  platformState,
  resolveDevAuthBypass,
} = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  platformState: { OS: 'ios' as string },
  resolveDevAuthBypass: vi.fn(() => false),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => getItemAsync(...args),
  setItemAsync: (...args: unknown[]) => setItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => deleteItemAsync(...args),
}));

vi.mock('react-native', () => ({
  Platform: platformState,
}));

vi.mock('@/lib/auth/resolveDevAuthBypass', () => ({
  resolveDevAuthBypass,
}));

vi.mock('@/hooks/api/hypatiaBaseUrl', () => ({
  getHypatiaBackendBaseUrl: () => 'http://127.0.0.1:5001',
}));

import { AuthProvider } from '@/components/auth/AuthProvider';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useProfile } from '@/hooks/useProfile';
import { clearSessionInvalidationListenersForTests } from '@/lib/auth/sessionInvalidation';

const TOKEN_A = 'opaque_session_tok_A_integration';
const TOKEN_B = 'opaque_session_tok_B_integration';

const BACKEND_PROFILE_A = {
  first_name: 'Alice',
  last_name: 'Example',
  date_joined: '2024-02-01T10:00:00Z',
  email: 'alice@example.com',
  password_changed_at: null,
  totp_enabled: false,
};

const BACKEND_PROFILE_B = {
  first_name: 'Bob',
  last_name: 'Rotated',
  date_joined: '2023-08-20T08:00:00Z',
  email: 'bob@example.com',
  password_changed_at: '2025-03-01T12:00:00Z',
  totp_enabled: true,
};

const FRONTEND_PROFILE_A = {
  firstName: 'Alice',
  lastName: 'Example',
  dateJoined: '2024-02-01T10:00:00Z',
  email: 'alice@example.com',
  passwordChangedAt: null as string | null,
  totpEnabled: false,
};

const FRONTEND_PROFILE_B = {
  firstName: 'Bob',
  lastName: 'Rotated',
  dateJoined: '2023-08-20T08:00:00Z',
  email: 'bob@example.com',
  passwordChangedAt: '2025-03-01T12:00:00Z' as string | null,
  totpEnabled: true,
};

type HarnessSnapshot = {
  token: string | null;
  isRestoring: boolean;
  isAuthenticated: boolean;
  isDevAuthBypass: boolean;
  canAccessApp: boolean;
  profile: typeof FRONTEND_PROFILE_A | null;
  isLoading: boolean;
  hasAuthenticatedSession: boolean;
  isAvailable: boolean;
  establishSession: (token: string) => Promise<void>;
  replaceSession: (token: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

/** Test-only harness: real AuthProvider children reading public hooks. */
function AuthProfileHarness({
  onSnapshot,
}: {
  onSnapshot: (snap: HarnessSnapshot) => void;
}) {
  const auth = useAuthSession();
  const profile = useProfile();

  // Publish latest public-hook state for assertions (test-only; not production).
  onSnapshot({
    token: auth.token,
    isRestoring: auth.isRestoring,
    isAuthenticated: auth.isAuthenticated,
    isDevAuthBypass: auth.isDevAuthBypass,
    canAccessApp: auth.canAccessApp,
    profile: profile.profile,
    isLoading: profile.isLoading,
    hasAuthenticatedSession: profile.hasAuthenticatedSession,
    isAvailable: profile.isAvailable,
    establishSession: auth.establishSession,
    replaceSession: auth.replaceSession,
    clearSession: auth.clearSession,
  });

  return (
    <div>
      <span data-testid="auth-restoring">{auth.isRestoring ? 'yes' : 'no'}</span>
      <span data-testid="auth-authenticated">
        {auth.isAuthenticated ? 'yes' : 'no'}
      </span>
      <span data-testid="auth-can-access">{auth.canAccessApp ? 'yes' : 'no'}</span>
      <span data-testid="profile-available">
        {profile.isAvailable ? 'yes' : 'no'}
      </span>
      <span data-testid="profile-loading">{profile.isLoading ? 'yes' : 'no'}</span>
      <span data-testid="profile-email">{profile.profile?.email ?? ''}</span>
      <span data-testid="profile-first-name">
        {profile.profile?.firstName ?? ''}
      </span>
      <button
        type="button"
        data-testid="btn-establish-a"
        onClick={() => {
          void auth.establishSession(TOKEN_A);
        }}
      >
        Establish A
      </button>
      <button
        type="button"
        data-testid="btn-replace-b"
        onClick={() => {
          void auth.replaceSession(TOKEN_B);
        }}
      >
        Replace B
      </button>
      <button
        type="button"
        data-testid="btn-clear"
        onClick={() => {
          void auth.clearSession();
        }}
      >
        Clear
      </button>
    </div>
  );
}

function installMapBackedSecureStore(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  getItemAsync.mockImplementation(async (key: string) => store.get(key) ?? null);
  setItemAsync.mockImplementation(async (key: string, value: string) => {
    store.set(key, value);
  });
  deleteItemAsync.mockImplementation(async (key: string) => {
    store.delete(key);
  });
  return store;
}

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

function profileGetCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url, init]) => {
    const method = (init as RequestInit | undefined)?.method ?? 'GET';
    return String(url).includes('/api/profile') && method === 'GET';
  });
}

function authorizationHeader(call: unknown[]): string | undefined {
  const headers = (call[1] as RequestInit).headers as Record<string, string>;
  return headers.Authorization;
}

async function mountHarness() {
  let latest: HarnessSnapshot | null = null;
  const view = render(
    <AuthProfileHarness
      onSnapshot={(snap) => {
        latest = snap;
      }}
    />,
    { wrapper },
  );

  await waitFor(() => {
    expect(view.getByTestId('auth-restoring').textContent).toBe('no');
  });

  return {
    get snap() {
      if (!latest) {
        throw new Error('Harness snapshot unavailable');
      }
      return latest;
    },
    view,
  };
}

describe('AuthProvider + useProfile integration', () => {
  beforeEach(() => {
    clearSessionInvalidationListenersForTests();
    platformState.OS = 'ios';
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    deleteItemAsync.mockReset();
    resolveDevAuthBypass.mockReset();
    resolveDevAuthBypass.mockReturnValue(false);
    installMapBackedSecureStore();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    clearSessionInvalidationListenersForTests();
    vi.restoreAllMocks();
  });

  it('unauthenticated mount restores with null Profile and no Profile fetch', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const harness = await mountHarness();

    expect(harness.snap.token).toBeNull();
    expect(harness.snap.isAuthenticated).toBe(false);
    expect(harness.snap.canAccessApp).toBe(false);
    expect(harness.snap.profile).toBeNull();
    expect(harness.snap.hasAuthenticatedSession).toBe(false);
    expect(harness.snap.isAvailable).toBe(false);
    expect(harness.view.getByTestId('profile-email').textContent).toBe('');
    expect(profileGetCalls(fetchMock)).toHaveLength(0);
  });

  it('establishSession(token A) loads Profile A via Bearer token-a', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(mockJsonResponse(BACKEND_PROFILE_A));

    const harness = await mountHarness();

    await act(async () => {
      await harness.snap.establishSession(TOKEN_A);
    });

    await waitFor(() => {
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_A);
    });

    expect(harness.snap.token).toBe(TOKEN_A);
    expect(harness.snap.isAuthenticated).toBe(true);
    expect(harness.snap.hasAuthenticatedSession).toBe(true);
    expect(harness.view.getByTestId('auth-authenticated').textContent).toBe(
      'yes',
    );
    expect(harness.view.getByTestId('profile-email').textContent).toBe(
      'alice@example.com',
    );
    expect(harness.view.getByTestId('profile-first-name').textContent).toBe(
      'Alice',
    );

    const gets = profileGetCalls(fetchMock);
    expect(gets.length).toBeGreaterThanOrEqual(1);
    expect(String(gets[0]![0])).toContain('/api/profile');
    expect(authorizationHeader(gets[0]!)).toBe(`Bearer ${TOKEN_A}`);
    for (const call of gets) {
      expect(authorizationHeader(call)).toBe(`Bearer ${TOKEN_A}`);
    }
  });

  it('replaceSession(A → B) reloads Profile B with Bearer token-b and drops A', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      const auth = headers.Authorization;
      if (auth === `Bearer ${TOKEN_A}`) {
        return mockJsonResponse(BACKEND_PROFILE_A);
      }
      if (auth === `Bearer ${TOKEN_B}`) {
        return mockJsonResponse(BACKEND_PROFILE_B);
      }
      return mockJsonResponse({ error: 'Unexpected token' }, { status: 500 });
    });

    const harness = await mountHarness();

    await act(async () => {
      await harness.snap.establishSession(TOKEN_A);
    });
    await waitFor(() => {
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_A);
    });

    // Intended useProfile behavior: clear prior Session Profile on token change.
    await act(async () => {
      await harness.snap.replaceSession(TOKEN_B);
    });

    await waitFor(() => {
      expect(harness.snap.token).toBe(TOKEN_B);
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_B);
    });

    expect(harness.snap.isAuthenticated).toBe(true);
    expect(harness.snap.profile).not.toEqual(FRONTEND_PROFILE_A);
    expect(harness.view.getByTestId('profile-email').textContent).toBe(
      'bob@example.com',
    );
    expect(harness.view.getByTestId('profile-first-name').textContent).toBe(
      'Bob',
    );

    const gets = profileGetCalls(fetchMock);
    const bearerA = gets.filter(
      (c) => authorizationHeader(c) === `Bearer ${TOKEN_A}`,
    );
    const bearerB = gets.filter(
      (c) => authorizationHeader(c) === `Bearer ${TOKEN_B}`,
    );
    expect(bearerA.length).toBeGreaterThanOrEqual(1);
    expect(bearerB.length).toBeGreaterThanOrEqual(1);

    // After replacement, no subsequent Profile GET may still use token A.
    const firstBIndex = gets.findIndex(
      (c) => authorizationHeader(c) === `Bearer ${TOKEN_B}`,
    );
    expect(firstBIndex).toBeGreaterThanOrEqual(0);
    for (const call of gets.slice(firstBIndex)) {
      expect(authorizationHeader(call)).toBe(`Bearer ${TOKEN_B}`);
    }
  });

  it('clearSession clears Profile and performs no further authenticated fetch', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      if (headers.Authorization === `Bearer ${TOKEN_A}`) {
        return mockJsonResponse(BACKEND_PROFILE_A);
      }
      if (headers.Authorization === `Bearer ${TOKEN_B}`) {
        return mockJsonResponse(BACKEND_PROFILE_B);
      }
      return mockJsonResponse({ error: 'Unexpected' }, { status: 500 });
    });

    const harness = await mountHarness();

    await act(async () => {
      await harness.snap.establishSession(TOKEN_A);
    });
    await waitFor(() => {
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_A);
    });

    await act(async () => {
      await harness.snap.replaceSession(TOKEN_B);
    });
    await waitFor(() => {
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_B);
    });

    const callsBeforeClear = profileGetCalls(fetchMock).length;

    await act(async () => {
      await harness.snap.clearSession();
    });

    await waitFor(() => {
      expect(harness.snap.token).toBeNull();
      expect(harness.snap.profile).toBeNull();
    });

    expect(harness.snap.isAuthenticated).toBe(false);
    expect(harness.snap.hasAuthenticatedSession).toBe(false);
    expect(harness.snap.isAvailable).toBe(false);
    expect(harness.view.getByTestId('auth-authenticated').textContent).toBe(
      'no',
    );
    expect(harness.view.getByTestId('profile-email').textContent).toBe('');
    expect(harness.view.getByTestId('profile-first-name').textContent).toBe(
      '',
    );
    expect(profileGetCalls(fetchMock).length).toBe(callsBeforeClear);
  });

  it('late Profile A response after replaceSession(B) cannot overwrite Profile B', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    let resolveA: ((value: Response) => void) | null = null;
    let resolveB: ((value: Response) => void) | null = null;

    fetchMock.mockImplementation((_url, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      if (headers.Authorization === `Bearer ${TOKEN_A}`) {
        return new Promise<Response>((resolve) => {
          resolveA = resolve;
        });
      }
      if (headers.Authorization === `Bearer ${TOKEN_B}`) {
        return new Promise<Response>((resolve) => {
          resolveB = resolve;
        });
      }
      return Promise.resolve(
        mockJsonResponse({ error: 'Unexpected' }, { status: 500 }),
      );
    });

    const harness = await mountHarness();

    await act(async () => {
      await harness.snap.establishSession(TOKEN_A);
    });
    await waitFor(() => {
      expect(resolveA).not.toBeNull();
    });

    await act(async () => {
      await harness.snap.replaceSession(TOKEN_B);
    });
    await waitFor(() => {
      expect(harness.snap.token).toBe(TOKEN_B);
      expect(resolveB).not.toBeNull();
    });

    // Profile A must not remain authoritative after Session identity changes.
    expect(harness.snap.profile).toBeNull();

    await act(async () => {
      resolveB!(mockJsonResponse(BACKEND_PROFILE_B));
    });
    await waitFor(() => {
      expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_B);
    });

    await act(async () => {
      resolveA!(mockJsonResponse(BACKEND_PROFILE_A));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(harness.snap.profile).toEqual(FRONTEND_PROFILE_B);
    expect(harness.snap.profile).not.toEqual(FRONTEND_PROFILE_A);
    expect(harness.view.getByTestId('profile-email').textContent).toBe(
      'bob@example.com',
    );
  });

  it('dev bypass without token grants canAccessApp but never fetches Profile', async () => {
    resolveDevAuthBypass.mockReturnValue(true);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    const harness = await mountHarness();

    expect(harness.snap.token).toBeNull();
    expect(harness.snap.isAuthenticated).toBe(false);
    expect(harness.snap.isDevAuthBypass).toBe(true);
    expect(harness.snap.canAccessApp).toBe(true);
    expect(harness.snap.hasAuthenticatedSession).toBe(false);
    expect(harness.snap.profile).toBeNull();
    expect(harness.snap.isAvailable).toBe(false);
    expect(harness.view.getByTestId('auth-can-access').textContent).toBe(
      'yes',
    );
    expect(harness.view.getByTestId('auth-authenticated').textContent).toBe(
      'no',
    );
    expect(profileGetCalls(fetchMock)).toHaveLength(0);
  });
});
