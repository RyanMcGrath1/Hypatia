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

import {
  AuthApiError,
  completeTotpLogin,
  login,
  logout,
  register,
} from '@/hooks/api/authApi';

const mockRequestApi = requestApi as ReturnType<typeof vi.fn>;

const SESSION_TOKEN = 'opaque_session_tok_AbC123';
const CHALLENGE_TOKEN = 'opaque_mfa_challenge_XyZ789';
const PASSWORD_EXACT = '  Pass Word!@#  \t';

describe('authApi', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('POSTs snake_case body to /api/auth/register and returns session token', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Registration successful',
        token: SESSION_TOKEN,
      });

      const result = await register({
        email: 'User@Example.com',
        password: PASSWORD_EXACT,
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.authRegister,
        method: 'POST',
        body: {
          email: 'User@Example.com',
          password: PASSWORD_EXACT,
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
        signal: undefined,
      });
      expect(result).toEqual({
        message: 'Registration successful',
        sessionToken: SESSION_TOKEN,
      });
    });

    it('preserves password exactly (no trim/normalize)', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Registration successful',
        token: SESSION_TOKEN,
      });

      await register({
        email: 'a@b.com',
        password: PASSWORD_EXACT,
        firstName: 'A',
        lastName: 'B',
      });

      const call = mockRequestApi.mock.calls[0]![0] as { body: { password: string } };
      expect(call.body.password).toBe(PASSWORD_EXACT);
      expect(call.body.password).toBe('  Pass Word!@#  \t');
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce({
        message: 'Registration successful',
        token: SESSION_TOKEN,
      });

      await register({
        email: 'a@b.com',
        password: 'x',
        firstName: 'A',
        lastName: 'B',
        signal,
      });

      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });

    it('rejects malformed success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ message: 'ok' });

      await expect(
        register({
          email: 'a@b.com',
          password: 'x',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({
        name: 'AuthApiError',
        status: 500,
        message: 'Invalid auth register payload',
      });
    });

    it('rejects empty token on success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Registration successful',
        token: '',
      });

      await expect(
        register({
          email: 'a@b.com',
          password: 'x',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toBeInstanceOf(AuthApiError);
    });

    it('maps 409 duplicate registration to AuthApiError safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Email already registered', 409, {
          error: 'Email already registered',
        }),
      );

      try {
        await register({
          email: 'dup@example.com',
          password: PASSWORD_EXACT,
          firstName: 'A',
          lastName: 'B',
        });
        expect.unreachable('expected AuthApiError');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthApiError);
        const err = e as AuthApiError;
        expect(err.status).toBe(409);
        expect(err.message).toBe('Email already registered');
        expect(err.message).not.toContain(PASSWORD_EXACT);
        expect(err.message).not.toContain(SESSION_TOKEN);
      }
    });
  });

  describe('login', () => {
    it('POSTs email/password and maps normal login to authenticated', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Login successful',
        token: SESSION_TOKEN,
      });

      const result = await login({
        email: 'user@example.com',
        password: PASSWORD_EXACT,
      });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.authLogin,
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: PASSWORD_EXACT,
        },
        signal: undefined,
      });
      expect(result).toEqual({
        kind: 'authenticated',
        message: 'Login successful',
        sessionToken: SESSION_TOKEN,
      });
      expect(result).not.toHaveProperty('challengeToken');
    });

    it('maps MFA response to totp_required without inventing a session token', async () => {
      mockRequestApi.mockResolvedValueOnce({
        mfa_required: true,
        mfa_method: 'totp',
        challenge_token: CHALLENGE_TOKEN,
      });

      const result = await login({
        email: 'mfa@example.com',
        password: PASSWORD_EXACT,
      });

      expect(result).toEqual({
        kind: 'totp_required',
        challengeToken: CHALLENGE_TOKEN,
        mfaMethod: 'totp',
      });
      expect(result).not.toHaveProperty('sessionToken');
      expect(result).not.toHaveProperty('token');
    });

    it('rejects malformed MFA response', async () => {
      mockRequestApi.mockResolvedValueOnce({
        mfa_required: true,
        mfa_method: 'sms',
        challenge_token: CHALLENGE_TOKEN,
      });

      await expect(
        login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toMatchObject({
        name: 'AuthApiError',
        message: 'Invalid auth login payload',
        status: 500,
      });
    });

    it('rejects MFA response with empty challenge_token', async () => {
      mockRequestApi.mockResolvedValueOnce({
        mfa_required: true,
        mfa_method: 'totp',
        challenge_token: '',
      });

      await expect(
        login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toBeInstanceOf(AuthApiError);
    });

    it('rejects malformed authenticated success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ message: 'Login successful' });

      await expect(
        login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toMatchObject({
        message: 'Invalid auth login payload',
      });
    });

    it('maps 401 invalid credentials safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Invalid credentials', 401, {
          error: 'Invalid credentials',
        }),
      );

      try {
        await login({ email: 'a@b.com', password: PASSWORD_EXACT });
        expect.unreachable('expected AuthApiError');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthApiError);
        const err = e as AuthApiError;
        expect(err.status).toBe(401);
        expect(err.message).toBe('Invalid credentials');
        expect(err.message).not.toContain(PASSWORD_EXACT);
      }
    });

    it('maps 400 validation errors safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Validation failed', 400, {
          error: 'Validation failed',
        }),
      );

      await expect(
        login({ email: 'bad', password: 'x' }),
      ).rejects.toMatchObject({
        name: 'AuthApiError',
        status: 400,
        message: 'Validation failed',
      });
    });

    it('maps 503 service errors safely', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Service unavailable', 503, {
          error: 'Service unavailable',
        }),
      );

      await expect(
        login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toMatchObject({
        name: 'AuthApiError',
        status: 503,
      });
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce({
        message: 'Login successful',
        token: SESSION_TOKEN,
      });

      await login({ email: 'a@b.com', password: 'x', signal });
      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });
  });

  describe('completeTotpLogin', () => {
    it('POSTs challenge_token and code; returns session token', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Login successful',
        token: SESSION_TOKEN,
      });

      const result = await completeTotpLogin({
        challengeToken: CHALLENGE_TOKEN,
        code: '123456',
      });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.authLoginTotp,
        method: 'POST',
        body: {
          challenge_token: CHALLENGE_TOKEN,
          code: '123456',
        },
        signal: undefined,
      });
      expect(result).toEqual({
        message: 'Login successful',
        sessionToken: SESSION_TOKEN,
      });
    });

    it('rejects malformed success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ token: SESSION_TOKEN });

      await expect(
        completeTotpLogin({
          challengeToken: CHALLENGE_TOKEN,
          code: '123456',
        }),
      ).rejects.toMatchObject({
        name: 'AuthApiError',
        message: 'Invalid auth TOTP login payload',
        status: 500,
      });
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce({
        message: 'Login successful',
        token: SESSION_TOKEN,
      });

      await completeTotpLogin({
        challengeToken: CHALLENGE_TOKEN,
        code: '123456',
        signal,
      });
      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });

    it('does not place challenge or session tokens in error messages', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Invalid TOTP code', 401, { error: 'Invalid TOTP code' }),
      );

      try {
        await completeTotpLogin({
          challengeToken: CHALLENGE_TOKEN,
          code: '000000',
        });
        expect.unreachable('expected AuthApiError');
      } catch (e) {
        const err = e as AuthApiError;
        expect(err.message).not.toContain(CHALLENGE_TOKEN);
        expect(err.message).not.toContain(SESSION_TOKEN);
        expect(err.message).not.toContain('000000');
      }
    });
  });

  describe('logout', () => {
    it('POSTs /api/auth/logout with Bearer session token and no body', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Logout successful',
      });

      const result = await logout({ token: SESSION_TOKEN });

      expect(mockRequestApi).toHaveBeenCalledWith({
        baseUrl: 'http://test-backend.example',
        path: HYPATIA_API_PATHS.authLogout,
        method: 'POST',
        token: SESSION_TOKEN,
        signal: undefined,
      });
      const call = mockRequestApi.mock.calls[0]![0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('body');
      expect(result).toEqual({ message: 'Logout successful' });
    });

    it('rejects malformed success payload', async () => {
      mockRequestApi.mockResolvedValueOnce({ ok: true });

      await expect(logout({ token: SESSION_TOKEN })).rejects.toMatchObject({
        name: 'AuthApiError',
        message: 'Invalid auth logout payload',
        status: 500,
      });
    });

    it('forwards AbortSignal', async () => {
      const signal = new AbortController().signal;
      mockRequestApi.mockResolvedValueOnce({ message: 'Logout successful' });

      await logout({ token: SESSION_TOKEN, signal });
      expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
    });

    it('maps HTTP errors without clearing local session (API-only)', async () => {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Unauthorized', 401, { error: 'Unauthorized' }),
      );

      await expect(logout({ token: SESSION_TOKEN })).rejects.toMatchObject({
        name: 'AuthApiError',
        status: 401,
      });
      // No tokenStorage / AuthProvider coupling — logout only talks to requestApi.
      expect(mockRequestApi).toHaveBeenCalledTimes(1);
    });
  });

  describe('security boundaries', () => {
    it('does not import tokenStorage, AuthProvider, or SecureStore', () => {
      const source = readFileSync(
        resolve(__dirname, '../../../hooks/api/authApi.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/from ['"]@\/lib\/auth\/tokenStorage['"]/);
      expect(source).not.toMatch(/from ['"][^'"]*AuthProvider['"]/);
      expect(source).not.toMatch(/useAuthSession/);
      expect(source).not.toMatch(/expo-secure-store/);
      expect(source).not.toMatch(/from ['"]expo-secure-store['"]/);
      expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
    });

    it('does not log passwords or tokens via thrown error messages on parse failure', async () => {
      mockRequestApi.mockResolvedValueOnce({
        message: 'Login successful',
        token: '',
      });

      try {
        await login({ email: 'a@b.com', password: PASSWORD_EXACT });
        expect.unreachable('expected AuthApiError');
      } catch (e) {
        const err = e as AuthApiError;
        expect(err.message).toBe('Invalid auth login payload');
        expect(err.message).not.toContain(PASSWORD_EXACT);
        expect(err.message).not.toContain(SESSION_TOKEN);
        expect(err.message).not.toContain(CHALLENGE_TOKEN);
      }
    });
  });
});
