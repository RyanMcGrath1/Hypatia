import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getItemAsync, setItemAsync, deleteItemAsync, platformState } = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  platformState: { OS: 'ios' as string },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => getItemAsync(...args),
  setItemAsync: (...args: unknown[]) => setItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => deleteItemAsync(...args),
}));

vi.mock('react-native', () => ({
  Platform: platformState,
}));

import {
  clearSessionToken,
  getSessionToken,
  SessionTokenStorageError,
  setSessionToken,
} from '@/lib/auth/tokenStorage';

const STORAGE_KEY = 'hypatia.session_token';
const INVALIDATED_KEY = 'hypatia.session_invalidated';
const INVALIDATED_VALUE = '1';
const SAMPLE_TOKEN = 'opaque_tok_AbC123-XyZ_!@#';
const TOKEN_A = 'opaque_tok_A_Finding11';
const TOKEN_B = 'opaque_tok_B_Finding11';

/** In-memory SecureStore for restart / crash-window simulations. */
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

describe('tokenStorage', () => {
  beforeEach(() => {
    platformState.OS = 'ios';
    getItemAsync.mockReset();
    setItemAsync.mockReset();
    deleteItemAsync.mockReset();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue(undefined);
    deleteItemAsync.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    platformState.OS = 'web';
    await clearSessionToken();
    platformState.OS = 'ios';
    vi.restoreAllMocks();
  });

  describe('native (SecureStore)', () => {
    beforeEach(() => {
      platformState.OS = 'ios';
    });

    it('setSessionToken clears invalidation marker then stores the exact token', async () => {
      await setSessionToken(SAMPLE_TOKEN);
      expect(deleteItemAsync).toHaveBeenCalledWith(INVALIDATED_KEY);
      expect(setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, SAMPLE_TOKEN);
      expect(deleteItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
        setItemAsync.mock.invocationCallOrder[0],
      );
    });

    it('getSessionToken reads the marker first, then the session token', async () => {
      getItemAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(SAMPLE_TOKEN);
      await expect(getSessionToken()).resolves.toBe(SAMPLE_TOKEN);
      expect(getItemAsync).toHaveBeenNthCalledWith(1, INVALIDATED_KEY);
      expect(getItemAsync).toHaveBeenNthCalledWith(2, STORAGE_KEY);
    });

    it('clearSessionToken writes marker, deletes token, then removes marker', async () => {
      await clearSessionToken();
      expect(setItemAsync).toHaveBeenCalledWith(INVALIDATED_KEY, INVALIDATED_VALUE);
      expect(deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
      expect(deleteItemAsync).toHaveBeenCalledWith(INVALIDATED_KEY);
      expect(setItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
        deleteItemAsync.mock.invocationCallOrder[0],
      );
    });

    it('returns null when no value is stored', async () => {
      getItemAsync.mockResolvedValue(null);
      await expect(getSessionToken()).resolves.toBeNull();
    });

    it('rejects an empty token before writing', async () => {
      await expect(setSessionToken('')).rejects.toBeInstanceOf(
        SessionTokenStorageError,
      );
      expect(setItemAsync).not.toHaveBeenCalled();
      expect(deleteItemAsync).not.toHaveBeenCalled();
    });

    it('preserves the token exactly (no trim / case change)', async () => {
      const exact = '  MiXeD_Case_Token_With_Spaces  ';
      await setSessionToken(exact);
      expect(setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, exact);
    });

    it('clearing an absent token is safe', async () => {
      await expect(clearSessionToken()).resolves.toBeUndefined();
      expect(setItemAsync).toHaveBeenCalledWith(INVALIDATED_KEY, INVALIDATED_VALUE);
      expect(deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
      expect(deleteItemAsync).toHaveBeenCalledWith(INVALIDATED_KEY);
    });

    it('normal lifecycle: set A → get A → clear → null → set B → get B', async () => {
      const store = installMapBackedSecureStore();

      await setSessionToken(TOKEN_A);
      await expect(getSessionToken()).resolves.toBe(TOKEN_A);

      await clearSessionToken();
      await expect(getSessionToken()).resolves.toBeNull();
      expect(store.has(STORAGE_KEY)).toBe(false);
      expect(store.has(INVALIDATED_KEY)).toBe(false);

      await setSessionToken(TOKEN_B);
      await expect(getSessionToken()).resolves.toBe(TOKEN_B);
    });

    it('successful clear leaves neither token nor invalidation marker', async () => {
      const store = installMapBackedSecureStore({ [STORAGE_KEY]: TOKEN_A });
      await clearSessionToken();
      expect(store.has(STORAGE_KEY)).toBe(false);
      expect(store.has(INVALIDATED_KEY)).toBe(false);
      await expect(getSessionToken()).resolves.toBeNull();
    });
  });

  describe('native invalidation marker (Finding #11)', () => {
    beforeEach(() => {
      platformState.OS = 'ios';
    });

    it('delete failure after marker write: restart restore returns null, not stale token', async () => {
      const store = installMapBackedSecureStore({ [STORAGE_KEY]: TOKEN_A });

      deleteItemAsync.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEY) {
          throw new Error('SecureStore delete failed');
        }
        store.delete(key);
      });

      await expect(clearSessionToken()).rejects.toBeInstanceOf(
        SessionTokenStorageError,
      );
      expect(store.get(INVALIDATED_KEY)).toBe(INVALIDATED_VALUE);
      expect(store.get(STORAGE_KEY)).toBe(TOKEN_A);

      // Simulate a later cold start with a fresh Map-backed store snapshot.
      const restartStore = new Map(store);
      getItemAsync.mockImplementation(
        async (key: string) => restartStore.get(key) ?? null,
      );
      deleteItemAsync.mockImplementation(async (key: string) => {
        restartStore.delete(key);
      });
      setItemAsync.mockImplementation(async (key: string, value: string) => {
        restartStore.set(key, value);
      });

      await expect(getSessionToken()).resolves.toBeNull();
      expect(restartStore.get(STORAGE_KEY)).toBeUndefined();
    });

    it('crash window: marker + token present without completed clear → get returns null', async () => {
      const store = installMapBackedSecureStore({
        [STORAGE_KEY]: TOKEN_A,
        [INVALIDATED_KEY]: INVALIDATED_VALUE,
      });

      await expect(getSessionToken()).resolves.toBeNull();
      // Best-effort stale cleanup.
      expect(store.has(STORAGE_KEY)).toBe(false);
      expect(store.has(INVALIDATED_KEY)).toBe(false);
    });

    it('crash window: cleanup failure still never authenticates with the dead token', async () => {
      installMapBackedSecureStore({
        [STORAGE_KEY]: TOKEN_A,
        [INVALIDATED_KEY]: INVALIDATED_VALUE,
      });

      deleteItemAsync.mockRejectedValue(new Error('cleanup unavailable'));

      await expect(getSessionToken()).resolves.toBeNull();
    });

    it('marker delete failure after token delete: restore stays signed out', async () => {
      const store = installMapBackedSecureStore({ [STORAGE_KEY]: TOKEN_A });

      deleteItemAsync.mockImplementation(async (key: string) => {
        if (key === INVALIDATED_KEY && store.has(STORAGE_KEY) === false) {
          // After token delete, marker cleanup fails.
          throw new Error('marker delete failed');
        }
        store.delete(key);
      });

      await expect(clearSessionToken()).rejects.toBeInstanceOf(
        SessionTokenStorageError,
      );
      expect(store.has(STORAGE_KEY)).toBe(false);
      expect(store.get(INVALIDATED_KEY)).toBe(INVALIDATED_VALUE);

      // Restart restore remains fail-closed.
      deleteItemAsync.mockImplementation(async (key: string) => {
        store.delete(key);
      });
      await expect(getSessionToken()).resolves.toBeNull();
    });

    it('setSessionToken after tombstone clears marker and restores the new Session', async () => {
      const store = installMapBackedSecureStore({
        [STORAGE_KEY]: TOKEN_A,
        [INVALIDATED_KEY]: INVALIDATED_VALUE,
      });

      await setSessionToken(TOKEN_B);
      expect(store.has(INVALIDATED_KEY)).toBe(false);
      expect(store.get(STORAGE_KEY)).toBe(TOKEN_B);
      await expect(getSessionToken()).resolves.toBe(TOKEN_B);
    });

    it('setSessionToken fails when stale marker cannot be cleared', async () => {
      installMapBackedSecureStore({
        [STORAGE_KEY]: TOKEN_A,
        [INVALIDATED_KEY]: INVALIDATED_VALUE,
      });
      deleteItemAsync.mockImplementation(async (key: string) => {
        if (key === INVALIDATED_KEY) {
          throw new Error('cannot clear marker');
        }
      });

      await expect(setSessionToken(TOKEN_B)).rejects.toMatchObject({
        name: 'SessionTokenStorageError',
        message: 'Unable to store session token',
      });
      expect(setItemAsync).not.toHaveBeenCalledWith(STORAGE_KEY, TOKEN_B);
    });

    it('marker write failure still clears when token delete succeeds', async () => {
      const store = installMapBackedSecureStore({ [STORAGE_KEY]: TOKEN_A });
      setItemAsync.mockImplementation(async (key: string, value: string) => {
        if (key === INVALIDATED_KEY) {
          throw new Error('marker write failed');
        }
        store.set(key, value);
      });

      await expect(clearSessionToken()).resolves.toBeUndefined();
      expect(store.has(STORAGE_KEY)).toBe(false);
    });

    it('marker write failure + token delete failure reports clear failure', async () => {
      installMapBackedSecureStore({ [STORAGE_KEY]: TOKEN_A });
      setItemAsync.mockRejectedValue(new Error('marker write failed'));
      deleteItemAsync.mockRejectedValue(new Error('token delete failed'));

      await expect(clearSessionToken()).rejects.toMatchObject({
        name: 'SessionTokenStorageError',
        message: 'Unable to clear session token',
      });
    });
  });

  describe('web (in-memory)', () => {
    beforeEach(async () => {
      platformState.OS = 'web';
      await clearSessionToken();
      getItemAsync.mockClear();
      setItemAsync.mockClear();
      deleteItemAsync.mockClear();
    });

    it('holds the token in memory and returns it from get', async () => {
      await setSessionToken(SAMPLE_TOKEN);
      await expect(getSessionToken()).resolves.toBe(SAMPLE_TOKEN);
      expect(setItemAsync).not.toHaveBeenCalled();
      expect(getItemAsync).not.toHaveBeenCalled();
    });

    it('clear removes the in-memory token', async () => {
      await setSessionToken(SAMPLE_TOKEN);
      await clearSessionToken();
      await expect(getSessionToken()).resolves.toBeNull();
      expect(deleteItemAsync).not.toHaveBeenCalled();
    });

    it('does not write to localStorage or sessionStorage', async () => {
      const memory = new Map<string, string>();
      const makeStorage = (): Storage =>
        ({
          get length() {
            return memory.size;
          },
          clear: () => memory.clear(),
          getItem: (key: string) => memory.get(key) ?? null,
          key: (index: number) => [...memory.keys()][index] ?? null,
          removeItem: (key: string) => {
            memory.delete(key);
          },
          setItem: vi.fn((key: string, value: string) => {
            memory.set(key, value);
          }),
        }) as Storage;

      const local = makeStorage();
      const session = makeStorage();
      vi.stubGlobal('localStorage', local);
      vi.stubGlobal('sessionStorage', session);

      await setSessionToken(SAMPLE_TOKEN);
      await getSessionToken();
      await clearSessionToken();

      expect(local.setItem).not.toHaveBeenCalled();
      expect(session.setItem).not.toHaveBeenCalled();
      expect(setItemAsync).not.toHaveBeenCalled();
      expect(memory.size).toBe(0);

      vi.unstubAllGlobals();
    });

    it('rejects empty tokens on web as well', async () => {
      await expect(setSessionToken('')).rejects.toMatchObject({
        name: 'SessionTokenStorageError',
        message: 'Session token must be a non-empty string',
      });
    });

    it('does not use an invalidation marker on web', async () => {
      await setSessionToken(SAMPLE_TOKEN);
      await clearSessionToken();
      expect(setItemAsync).not.toHaveBeenCalled();
      expect(getItemAsync).not.toHaveBeenCalled();
      expect(deleteItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    beforeEach(() => {
      platformState.OS = 'ios';
    });

    it('wraps SecureStore read failures without exposing the token', async () => {
      getItemAsync.mockRejectedValueOnce(new Error(`keystore boom: ${SAMPLE_TOKEN}`));
      try {
        await getSessionToken();
        expect.unreachable('expected SessionTokenStorageError');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionTokenStorageError);
        const err = e as SessionTokenStorageError;
        expect(err.message).toBe('Unable to read session token');
        expect(err.message).not.toContain(SAMPLE_TOKEN);
        expect(err.cause).toBeInstanceOf(Error);
      }
    });

    it('wraps SecureStore write failures without exposing the token', async () => {
      deleteItemAsync.mockResolvedValueOnce(undefined);
      setItemAsync.mockRejectedValueOnce(new Error(`write failed for ${SAMPLE_TOKEN}`));
      try {
        await setSessionToken(SAMPLE_TOKEN);
        expect.unreachable('expected SessionTokenStorageError');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionTokenStorageError);
        const err = e as SessionTokenStorageError;
        expect(err.message).toBe('Unable to store session token');
        expect(err.message).not.toContain(SAMPLE_TOKEN);
        expect(String(err)).not.toContain(SAMPLE_TOKEN);
      }
    });

    it('wraps SecureStore delete failures safely', async () => {
      setItemAsync.mockResolvedValueOnce(undefined);
      deleteItemAsync.mockRejectedValueOnce(new Error(`delete failed ${SAMPLE_TOKEN}`));
      try {
        await clearSessionToken();
        expect.unreachable('expected SessionTokenStorageError');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionTokenStorageError);
        const err = e as SessionTokenStorageError;
        expect(err.message).toBe('Unable to clear session token');
        expect(err.message).not.toContain(SAMPLE_TOKEN);
      }
    });
  });

  describe('security', () => {
    it('does not console.log the token during store/read/clear', async () => {
      platformState.OS = 'ios';
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      installMapBackedSecureStore();
      await setSessionToken(SAMPLE_TOKEN);
      await getSessionToken();
      await clearSessionToken();

      for (const spy of [log, warn, error]) {
        for (const call of spy.mock.calls) {
          expect(call.map(String).join(' ')).not.toContain(SAMPLE_TOKEN);
        }
      }
    });

    it('does not use SecureStore on web (memory only)', async () => {
      platformState.OS = 'web';
      await setSessionToken(SAMPLE_TOKEN);
      await getSessionToken();
      await clearSessionToken();
      expect(setItemAsync).not.toHaveBeenCalled();
      expect(getItemAsync).not.toHaveBeenCalled();
      expect(deleteItemAsync).not.toHaveBeenCalled();
    });

    it('never returns a sentinel fake bearer as a Session token', async () => {
      installMapBackedSecureStore({
        [STORAGE_KEY]: 'INVALID',
        [INVALIDATED_KEY]: INVALIDATED_VALUE,
      });
      await expect(getSessionToken()).resolves.toBeNull();
    });
  });
});
