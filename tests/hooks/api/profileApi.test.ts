import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpApiError, requestApi } from '@/hooks/api/httpClient';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';

vi.mock('@/hooks/api/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/api/httpClient')>();
  return {
    ...actual,
    requestApi: vi.fn(),
  };
});

vi.mock('@/hooks/api/hypatiaBaseUrl', () => ({
  getHypatiaBackendBaseUrl: () => 'http://test-backend.example',
}));

import { getProfile, ProfileApiError, updateProfile } from '@/hooks/api/profileApi';

const mockRequestApi = requestApi as ReturnType<typeof vi.fn>;

const SESSION_TOKEN = 'opaque_session_tok_ProfileAbC123';

const BACKEND_PROFILE = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  date_joined: '2024-01-15T12:00:00Z',
  email: 'ada@example.com',
  password_changed_at: '2025-06-01T08:30:00Z',
  totp_enabled: true,
};

const FRONTEND_PROFILE = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  dateJoined: '2024-01-15T12:00:00Z',
  email: 'ada@example.com',
  passwordChangedAt: '2025-06-01T08:30:00Z',
  totpEnabled: true,
};

describe('profileApi', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('GETs /api/profile with Bearer session token', async () => {
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      const result = await getProfile({ token: SESSION_TOKEN });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.profile,
        method: 'GET',
        token: SESSION_TOKEN,
        signal: undefined,
      });
      const call = mockRequestApi.mock.calls[0]![0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('body');
      expect(HYPATIA_API_PATHS.profile).toBe('/api/profile');
      expect(result).toEqual(FRONTEND_PROFILE);
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      await getProfile({ token: SESSION_TOKEN, signal });

      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });

    it('translates snake_case success payload to camelCase', async () => {
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      const result = await getProfile({ token: SESSION_TOKEN });

      expect(result).toEqual(FRONTEND_PROFILE);
      expect(result).not.toHaveProperty('first_name');
      expect(result).not.toHaveProperty('totp_enabled');
    });

    it('supports null password_changed_at', async () => {
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        password_changed_at: null,
      });

      const result = await getProfile({ token: SESSION_TOKEN });

      expect(result.passwordChangedAt).toBeNull();
    });

    it('rejects malformed success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ first_name: 'Ada' });

      await expect(getProfile({ token: SESSION_TOKEN })).rejects.toMatchObject({
        name: 'ProfileApiError',
        status: 500,
        message: 'Invalid profile payload',
      });
    });

    it('rejects wrong types on success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        totp_enabled: 'yes',
      });

      await expect(getProfile({ token: SESSION_TOKEN })).rejects.toBeInstanceOf(
        ProfileApiError,
      );
    });
  });

  describe('updateProfile', () => {
    it('PATCHes /api/profile with Bearer session token', async () => {
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        first_name: 'Matthew',
      });

      const result = await updateProfile({
        token: SESSION_TOKEN,
        firstName: 'Matthew',
      });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.profile,
        method: 'PATCH',
        token: SESSION_TOKEN,
        body: { first_name: 'Matthew' },
        signal: undefined,
      });
      expect(result.firstName).toBe('Matthew');
    });

    it('maps firstName and lastName to snake_case', async () => {
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        first_name: 'Grace',
        last_name: 'Hopper',
      });

      await updateProfile({
        token: SESSION_TOKEN,
        firstName: 'Grace',
        lastName: 'Hopper',
      });

      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({
        body: {
          first_name: 'Grace',
          last_name: 'Hopper',
        },
      });
    });

    it('sends only supplied fields (no undefined JSON properties)', async () => {
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      await updateProfile({
        token: SESSION_TOKEN,
        firstName: 'Matthew',
      });

      const body = (mockRequestApi.mock.calls[0]![0] as { body: Record<string, unknown> })
        .body;
      expect(body).toEqual({ first_name: 'Matthew' });
      expect(body).not.toHaveProperty('last_name');
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('date_joined');
      expect(body).not.toHaveProperty('totp_enabled');
      expect(body).not.toHaveProperty('password_changed_at');
      expect(Object.values(body).every((v) => v !== undefined)).toBe(true);
    });

    it('preserves name values exactly (no trim/normalize)', async () => {
      const exactFirst = '  Matthew  ';
      const exactLast = 'Smith\t';
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        first_name: exactFirst,
        last_name: exactLast,
      });

      await updateProfile({
        token: SESSION_TOKEN,
        firstName: exactFirst,
        lastName: exactLast,
      });

      const body = (mockRequestApi.mock.calls[0]![0] as { body: Record<string, string> })
        .body;
      expect(body.first_name).toBe(exactFirst);
      expect(body.last_name).toBe(exactLast);
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      await updateProfile({
        token: SESSION_TOKEN,
        lastName: 'Lovelace',
        signal,
      });

      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });

    it('validates and translates PATCH response', async () => {
      mockRequestApi.mockResolvedValueOnce({
        ...BACKEND_PROFILE,
        first_name: 'Grace',
        password_changed_at: null,
        totp_enabled: false,
      });

      const result = await updateProfile({
        token: SESSION_TOKEN,
        firstName: 'Grace',
      });

      expect(result).toEqual({
        firstName: 'Grace',
        lastName: 'Lovelace',
        dateJoined: '2024-01-15T12:00:00Z',
        email: 'ada@example.com',
        passwordChangedAt: null,
        totpEnabled: false,
      });
    });

    it('rejects malformed PATCH success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ ok: true });

      await expect(
        updateProfile({ token: SESSION_TOKEN, firstName: 'Ada' }),
      ).rejects.toMatchObject({
        name: 'ProfileApiError',
        message: 'Invalid profile payload',
        status: 500,
      });
    });
  });

  describe('errors', () => {
    it('surfaces 400 safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Validation failed', 400, { error: 'Validation failed' }),
      );

      await expect(getProfile({ token: SESSION_TOKEN })).rejects.toMatchObject({
        name: 'ProfileApiError',
        status: 400,
        message: 'Validation failed',
      });
    });

    it('surfaces 401 safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Unauthorized', 401, { error: 'Unauthorized' }),
      );

      try {
        await getProfile({ token: SESSION_TOKEN });
        expect.unreachable('expected ProfileApiError');
      } catch (e) {
        expect(e).toBeInstanceOf(ProfileApiError);
        const err = e as ProfileApiError;
        expect(err.status).toBe(401);
        expect(err.message).toBe('Unauthorized');
        expect(err.message).not.toContain(SESSION_TOKEN);
        expect(err.message).not.toMatch(/Bearer/i);
        expect(err.message).not.toMatch(/Authorization/i);
      }
    });

    it('surfaces 500 safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Internal server error', 500, {
          error: 'Internal server error',
        }),
      );

      await expect(
        updateProfile({ token: SESSION_TOKEN, lastName: 'X' }),
      ).rejects.toMatchObject({
        name: 'ProfileApiError',
        status: 500,
        message: 'Internal server error',
      });
    });

    it('does not place session token in parse-error messages', async () => {
      mockRequestApi.mockResolvedValueOnce({ broken: true });

      try {
        await getProfile({ token: SESSION_TOKEN });
        expect.unreachable('expected ProfileApiError');
      } catch (e) {
        const err = e as ProfileApiError;
        expect(err.message).toBe('Invalid profile payload');
        expect(err.message).not.toContain(SESSION_TOKEN);
      }
    });
  });

  describe('security boundaries', () => {
    it('does not import tokenStorage, AuthProvider, or SecureStore', () => {
      const source = readFileSync(
        resolve(__dirname, '../../../hooks/api/profileApi.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/from ['"]@\/lib\/auth\/tokenStorage['"]/);
      expect(source).not.toMatch(/from ['"][^'"]*AuthProvider['"]/);
      expect(source).not.toMatch(/useAuthSession/);
      expect(source).not.toMatch(/expo-secure-store/);
      expect(source).not.toMatch(/from ['"]expo-secure-store['"]/);
      expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
    });

    it('does not send user id or disallowed PATCH fields', async () => {
      mockRequestApi.mockResolvedValueOnce(BACKEND_PROFILE);

      await updateProfile({
        token: SESSION_TOKEN,
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      const body = (mockRequestApi.mock.calls[0]![0] as { body: Record<string, unknown> })
        .body;
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('user_id');
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('password');
      expect(body).not.toHaveProperty('totp_enabled');
      expect(body).not.toHaveProperty('date_joined');
    });
  });
});
