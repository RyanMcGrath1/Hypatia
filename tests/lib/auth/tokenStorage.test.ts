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
const SAMPLE_TOKEN = 'opaque_tok_AbC123-XyZ_!@#';

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

    it('setSessionToken calls SecureStore.setItemAsync with the exact token', async () => {
      await setSessionToken(SAMPLE_TOKEN);
      expect(setItemAsync).toHaveBeenCalledTimes(1);
      expect(setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, SAMPLE_TOKEN);
    });

    it('getSessionToken calls SecureStore.getItemAsync', async () => {
      getItemAsync.mockResolvedValueOnce(SAMPLE_TOKEN);
      await expect(getSessionToken()).resolves.toBe(SAMPLE_TOKEN);
      expect(getItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('clearSessionToken calls SecureStore.deleteItemAsync', async () => {
      await clearSessionToken();
      expect(deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('returns null when no value is stored', async () => {
      getItemAsync.mockResolvedValueOnce(null);
      await expect(getSessionToken()).resolves.toBeNull();
    });

    it('rejects an empty token before writing', async () => {
      await expect(setSessionToken('')).rejects.toBeInstanceOf(
        SessionTokenStorageError,
      );
      expect(setItemAsync).not.toHaveBeenCalled();
    });

    it('preserves the token exactly (no trim / case change)', async () => {
      const exact = '  MiXeD_Case_Token_With_Spaces  ';
      await setSessionToken(exact);
      expect(setItemAsync).toHaveBeenCalledWith(STORAGE_KEY, exact);
    });

    it('clearing an absent token is safe', async () => {
      deleteItemAsync.mockResolvedValueOnce(undefined);
      await expect(clearSessionToken()).resolves.toBeUndefined();
      expect(deleteItemAsync).toHaveBeenCalledTimes(1);
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

      getItemAsync.mockResolvedValueOnce(SAMPLE_TOKEN);
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
  });
});
