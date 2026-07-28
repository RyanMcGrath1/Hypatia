/**
 * @vitest-environment jsdom
 *
 * Finding #11: AuthProvider restore must not authenticate from a SecureStore
 * credential when the invalidation marker is present. Uses real tokenStorage
 * with a Map-backed SecureStore mock (no backend).
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const { getItemAsync, setItemAsync, deleteItemAsync, platformState, resolveDevAuthBypass } =
  vi.hoisted(() => ({
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

import { AuthProvider } from '@/components/auth/AuthProvider';
import { useAuthSession } from '@/hooks/useAuthSession';

const STORAGE_KEY = 'hypatia.session_token';
const INVALIDATED_KEY = 'hypatia.session_invalidated';
const STALE_TOKEN = 'opaque_tok_stale_Finding11';

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

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider + session invalidation marker (Finding #11)', () => {
  beforeEach(() => {
    platformState.OS = 'ios';
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    deleteItemAsync.mockReset();
    resolveDevAuthBypass.mockReset();
    resolveDevAuthBypass.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restore with stale token + marker → unauthenticated, no backend call', async () => {
    installMapBackedSecureStore({
      [STORAGE_KEY]: STALE_TOKEN,
      [INVALIDATED_KEY]: '1',
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRestoring).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.canAccessApp).toBe(false);
    expect(result.current.isDevAuthBypass).toBe(false);
  });

  it('dev bypass with stale token + marker → token null, canAccessApp true', async () => {
    resolveDevAuthBypass.mockReturnValue(true);
    installMapBackedSecureStore({
      [STORAGE_KEY]: STALE_TOKEN,
      [INVALIDATED_KEY]: '1',
    });

    const { result } = renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRestoring).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isDevAuthBypass).toBe(true);
    expect(result.current.canAccessApp).toBe(true);
  });
});
