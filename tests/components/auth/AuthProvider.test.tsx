/**
 * @vitest-environment jsdom
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

import { AuthProvider } from '@/components/auth/AuthProvider';
import { useAuthSession } from '@/hooks/useAuthSession';

const SAMPLE_TOKEN = 'opaque_tok_AbC123-XyZ_!@#';
const REPLACEMENT_TOKEN = 'opaque_tok_REPLACED_456';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderAuthSession() {
  const hook = renderHook(() => useAuthSession(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.isRestoring).toBe(false);
  });
  return hook;
}

describe('AuthProvider / useAuthSession', () => {
  beforeEach(() => {
    getSessionToken.mockReset();
    setSessionToken.mockReset();
    clearSessionToken.mockReset();
    resolveDevAuthBypass.mockReset();
    getSessionToken.mockResolvedValue(null);
    setSessionToken.mockResolvedValue(undefined);
    clearSessionToken.mockResolvedValue(undefined);
    resolveDevAuthBypass.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial restore', () => {
    it('starts restoring and finishes after getSessionToken', async () => {
      let resolveGet: (value: string | null) => void = () => {};
      getSessionToken.mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveGet = resolve;
          }),
      );

      const { result } = renderHook(() => useAuthSession(), { wrapper });
      expect(result.current.isRestoring).toBe(true);
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      await act(async () => {
        resolveGet(null);
      });

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });
      expect(getSessionToken).toHaveBeenCalledTimes(1);
    });

    it('restores a stored token into provider state', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
      expect(getSessionToken).toHaveBeenCalledTimes(1);
    });

    it('leaves token null when nothing is stored', async () => {
      getSessionToken.mockResolvedValueOnce(null);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('treats storage read failure as unauthenticated without crashing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getSessionToken.mockRejectedValueOnce(
        new SessionTokenStorageError(`Unable to read session token (${SAMPLE_TOKEN})`),
      );

      const { result } = await renderAuthSession();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isRestoring).toBe(false);
      expect(warn).toHaveBeenCalled();
      for (const call of warn.mock.calls) {
        expect(call.map(String).join(' ')).not.toContain(SAMPLE_TOKEN);
      }
    });
  });

  describe('derived state', () => {
    it('isAuthenticated is true when token is present', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('isAuthenticated is false when token is absent', async () => {
      const { result } = await renderAuthSession();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('dev auth bypass', () => {
    it('NO TOKEN + BYPASS OFF → cannot access app', async () => {
      resolveDevAuthBypass.mockReturnValue(false);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDevAuthBypass).toBe(false);
      expect(result.current.canAccessApp).toBe(false);
      expect(setSessionToken).not.toHaveBeenCalled();
    });

    it('NO TOKEN + BYPASS ON → canAccessApp without becoming authenticated', async () => {
      resolveDevAuthBypass.mockReturnValue(true);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDevAuthBypass).toBe(true);
      expect(result.current.canAccessApp).toBe(true);
      expect(setSessionToken).not.toHaveBeenCalled();
    });

    it('TOKEN + BYPASS OFF → authenticated and can access app', async () => {
      resolveDevAuthBypass.mockReturnValue(false);
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isDevAuthBypass).toBe(false);
      expect(result.current.canAccessApp).toBe(true);
    });

    it('TOKEN + BYPASS ON → preserves real token and can access app', async () => {
      resolveDevAuthBypass.mockReturnValue(true);
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();
      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isDevAuthBypass).toBe(true);
      expect(result.current.canAccessApp).toBe(true);
      expect(setSessionToken).not.toHaveBeenCalled();
    });

    it('does not invent a fake token or alter SecureStore restoration', async () => {
      resolveDevAuthBypass.mockReturnValue(true);
      getSessionToken.mockResolvedValueOnce(null);
      const { result } = await renderAuthSession();
      expect(getSessionToken).toHaveBeenCalledTimes(1);
      expect(setSessionToken).not.toHaveBeenCalled();
      expect(clearSessionToken).not.toHaveBeenCalled();
      expect(result.current.token).toBeNull();
    });

    it('keeps session actions independent of bypass', async () => {
      resolveDevAuthBypass.mockReturnValue(true);
      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.establishSession(SAMPLE_TOKEN);
      });
      expect(setSessionToken).toHaveBeenCalledWith(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isDevAuthBypass).toBe(true);
      expect(result.current.canAccessApp).toBe(true);

      await act(async () => {
        await result.current.replaceSession(REPLACEMENT_TOKEN);
      });
      expect(setSessionToken).toHaveBeenLastCalledWith(REPLACEMENT_TOKEN);
      expect(result.current.token).toBe(REPLACEMENT_TOKEN);

      await act(async () => {
        await result.current.clearSession();
      });
      expect(clearSessionToken).toHaveBeenCalled();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isDevAuthBypass).toBe(true);
      expect(result.current.canAccessApp).toBe(true);
    });

    it('does not log tokens when bypass is enabled', async () => {
      resolveDevAuthBypass.mockReturnValue(true);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = await renderAuthSession();
      await act(async () => {
        await result.current.establishSession(SAMPLE_TOKEN);
      });

      for (const spy of [log, warn, error]) {
        for (const call of spy.mock.calls) {
          expect(call.map(String).join(' ')).not.toContain(SAMPLE_TOKEN);
        }
      }
      expect(result.current.isDevAuthBypass).toBe(true);
    });
  });

  describe('establishSession', () => {
    it('persists then updates provider state with the exact token', async () => {
      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.establishSession(SAMPLE_TOKEN);
      });

      expect(setSessionToken).toHaveBeenCalledWith(SAMPLE_TOKEN);
      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('leaves previous state unchanged when persistence fails', async () => {
      getSessionToken.mockResolvedValueOnce(null);
      setSessionToken.mockRejectedValueOnce(
        new SessionTokenStorageError('Unable to store session token'),
      );
      const { result } = await renderAuthSession();

      await expect(
        act(async () => {
          await result.current.establishSession(SAMPLE_TOKEN);
        }),
      ).rejects.toBeInstanceOf(SessionTokenStorageError);

      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('does not discard an existing token when establish persistence fails', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      setSessionToken.mockRejectedValueOnce(
        new SessionTokenStorageError('Unable to store session token'),
      );
      const { result } = await renderAuthSession();

      await expect(
        act(async () => {
          await result.current.establishSession(REPLACEMENT_TOKEN);
        }),
      ).rejects.toBeInstanceOf(SessionTokenStorageError);

      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('replaceSession', () => {
    it('persists the replacement and updates state to the new token', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.replaceSession(REPLACEMENT_TOKEN);
      });

      expect(setSessionToken).toHaveBeenCalledWith(REPLACEMENT_TOKEN);
      expect(result.current.token).toBe(REPLACEMENT_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('keeps the previous token when replacement persistence fails', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      setSessionToken.mockRejectedValueOnce(
        new SessionTokenStorageError('Unable to store session token'),
      );
      const { result } = await renderAuthSession();

      await expect(
        act(async () => {
          await result.current.replaceSession(REPLACEMENT_TOKEN);
        }),
      ).rejects.toBeInstanceOf(SessionTokenStorageError);

      expect(result.current.token).toBe(SAMPLE_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('clears storage and becomes unauthenticated', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.clearSession();
      });

      expect(clearSessionToken).toHaveBeenCalledTimes(1);
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('is safe when already unauthenticated', async () => {
      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.clearSession();
      });

      expect(clearSessionToken).toHaveBeenCalledTimes(1);
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('clears in-memory auth even when persistent clear fails, then rethrows', async () => {
      getSessionToken.mockResolvedValueOnce(SAMPLE_TOKEN);
      clearSessionToken.mockRejectedValueOnce(
        new SessionTokenStorageError('Unable to clear session token'),
      );
      const { result } = await renderAuthSession();

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.clearSession();
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBeInstanceOf(SessionTokenStorageError);
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('useAuthSession hook', () => {
    it('returns context under AuthProvider', async () => {
      const { result } = await renderAuthSession();
      expect(result.current).toMatchObject({
        token: null,
        isRestoring: false,
        isAuthenticated: false,
        isDevAuthBypass: false,
        canAccessApp: false,
      });
      expect(typeof result.current.establishSession).toBe('function');
      expect(typeof result.current.replaceSession).toBe('function');
      expect(typeof result.current.clearSession).toBe('function');
    });

    it('throws when used outside AuthProvider', () => {
      expect(() => renderHook(() => useAuthSession())).toThrow(
        'useAuthSession must be used within an AuthProvider',
      );
    });
  });

  describe('security', () => {
    it('does not log raw tokens during establish/replace/clear', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = await renderAuthSession();

      await act(async () => {
        await result.current.establishSession(SAMPLE_TOKEN);
        await result.current.replaceSession(REPLACEMENT_TOKEN);
        await result.current.clearSession();
      });

      for (const spy of [log, warn, error]) {
        for (const call of spy.mock.calls) {
          const joined = call.map(String).join(' ');
          expect(joined).not.toContain(SAMPLE_TOKEN);
          expect(joined).not.toContain(REPLACEMENT_TOKEN);
        }
      }
    });

    it('persists tokens only through tokenStorage helpers', async () => {
      const localSet = vi.fn();
      const sessionSet = vi.fn();
      vi.stubGlobal('localStorage', {
        setItem: localSet,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      });
      vi.stubGlobal('sessionStorage', {
        setItem: sessionSet,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      });

      const { result } = await renderAuthSession();
      await act(async () => {
        await result.current.establishSession(SAMPLE_TOKEN);
      });

      expect(setSessionToken).toHaveBeenCalledWith(SAMPLE_TOKEN);
      expect(localSet).not.toHaveBeenCalled();
      expect(sessionSet).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});
