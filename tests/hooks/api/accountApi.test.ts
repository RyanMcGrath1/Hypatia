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
  AccountApiError,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
} from '@/hooks/api/accountApi';

const mockRequestApi = requestApi as ReturnType<typeof vi.fn>;

const SESSION_TOKEN = 'opaque_session_tok_ChangePwAbC123';
const REPLACEMENT_TOKEN = 'opaque_session_tok_ReplacementXyZ789';
const VERIFY_TOKEN = 'opaque_email_change_verify_tok_Fixture123';

const SUCCESS_BODY = {
  message: 'Password changed successfully',
  token: REPLACEMENT_TOKEN,
  password_changed_at: '2026-07-24T15:30:00+00:00',
};

describe('accountApi.changePassword', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs /api/account/change-password with Bearer token and snake_case body', async () => {
    mockRequestApi.mockResolvedValueOnce(SUCCESS_BODY);

    const result = await changePassword({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      newPassword: 'brandnewpassword1',
      confirmNewPassword: 'brandnewpassword1',
    });

    expect(HYPATIA_API_PATHS.accountChangePassword).toBe(
      '/api/account/change-password',
    );
    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.accountChangePassword,
      method: 'POST',
      token: SESSION_TOKEN,
      body: {
        current_password: 'validpassword12',
        new_password: 'brandnewpassword1',
        confirm_new_password: 'brandnewpassword1',
      },
      signal: undefined,
    });
    expect(result).toEqual({
      message: 'Password changed successfully',
      sessionToken: REPLACEMENT_TOKEN,
      passwordChangedAt: '2026-07-24T15:30:00+00:00',
    });
  });

  it('preserves password whitespace exactly (no trim)', async () => {
    mockRequestApi.mockResolvedValueOnce(SUCCESS_BODY);
    const spaced = ' fifteen chars ';

    await changePassword({
      token: SESSION_TOKEN,
      currentPassword: '  current spaced ',
      newPassword: spaced,
      confirmNewPassword: spaced,
    });

    const body = (
      mockRequestApi.mock.calls[0]![0] as { body: Record<string, string> }
    ).body;
    expect(body.current_password).toBe('  current spaced ');
    expect(body.new_password).toBe(spaced);
    expect(body.confirm_new_password).toBe(spaced);
  });

  it('forwards AbortSignal', async () => {
    const signal = new AbortController().signal;
    mockRequestApi.mockResolvedValueOnce(SUCCESS_BODY);

    await changePassword({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      newPassword: 'brandnewpassword1',
      confirmNewPassword: 'brandnewpassword1',
      signal,
    });

    expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
  });

  it('does not persist the replacement Session token', async () => {
    mockRequestApi.mockResolvedValueOnce(SUCCESS_BODY);
    const source = readFileSync(
      resolve(__dirname, '../../../hooks/api/accountApi.ts'),
      'utf8',
    );

    await changePassword({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      newPassword: 'brandnewpassword1',
      confirmNewPassword: 'brandnewpassword1',
    });

    expect(source).not.toMatch(
      /from ['"]@\/lib\/auth\/tokenStorage['"]|from ['"]expo-secure-store['"]|from ['"]@\/components\/auth\/AuthProvider['"]/,
    );
    expect(source).not.toMatch(
      /\bsetSessionToken\b|\bestablishSession\b|\breplaceSession\b|\bclearSession\b/,
    );
  });

  it('rejects malformed 2xx payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({ message: 'ok' });

    await expect(
      changePassword({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newPassword: 'brandnewpassword1',
        confirmNewPassword: 'brandnewpassword1',
      }),
    ).rejects.toMatchObject({
      name: 'AccountApiError',
      status: 500,
      message: 'Invalid change-password payload',
    });
  });

  it('rejects empty replacement token', async () => {
    mockRequestApi.mockResolvedValueOnce({
      ...SUCCESS_BODY,
      token: '',
    });

    await expect(
      changePassword({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newPassword: 'brandnewpassword1',
        confirmNewPassword: 'brandnewpassword1',
      }),
    ).rejects.toBeInstanceOf(AccountApiError);
  });

  it('surfaces 400 safely without leaking passwords', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Current password is incorrect', 400, {
        error: 'Current password is incorrect',
      }),
    );

    try {
      await changePassword({
        token: SESSION_TOKEN,
        currentPassword: 'secret-current-password',
        newPassword: 'secret-new-password1',
        confirmNewPassword: 'secret-new-password1',
      });
      expect.unreachable('expected AccountApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(AccountApiError);
      const err = e as AccountApiError;
      expect(err.status).toBe(400);
      expect(err.message).toBe('Current password is incorrect');
      expect(err.message).not.toContain('secret-current-password');
      expect(err.message).not.toContain('secret-new-password1');
      expect(String(err.stack ?? '')).not.toContain('secret-current-password');
    }
  });

  it('surfaces 401 safely', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Authentication required', 401, {
        error: 'Authentication required',
      }),
    );

    await expect(
      changePassword({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newPassword: 'brandnewpassword1',
        confirmNewPassword: 'brandnewpassword1',
      }),
    ).rejects.toMatchObject({
      name: 'AccountApiError',
      status: 401,
      message: 'Authentication required',
    });
  });

  it('surfaces 500/503 safely', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Service unavailable', 503, {
        error: 'Service unavailable',
      }),
    );

    await expect(
      changePassword({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newPassword: 'brandnewpassword1',
        confirmNewPassword: 'brandnewpassword1',
      }),
    ).rejects.toMatchObject({
      name: 'AccountApiError',
      status: 503,
    });
  });

  it('module source stays free of AuthProvider and storage imports', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../hooks/api/accountApi.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /from ['"]@\/components\/auth\/AuthProvider['"]|from ['"]@\/hooks\/useAuthSession['"]|from ['"]@\/lib\/auth\/tokenStorage['"]|from ['"]expo-secure-store['"]|from ['"]expo-router['"]/,
    );
  });
});

describe('accountApi.requestEmailChange', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs /api/account/change-email with Bearer and snake_case body', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message:
        'Confirmation emails sent. Confirm both your current and new email addresses to complete the change.',
    });

    const result = await requestEmailChange({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      newEmail: 'new@example.com',
    });

    expect(HYPATIA_API_PATHS.accountChangeEmail).toBe(
      '/api/account/change-email',
    );
    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.accountChangeEmail,
      method: 'POST',
      token: SESSION_TOKEN,
      body: {
        new_email: 'new@example.com',
        current_password: 'validpassword12',
      },
      signal: undefined,
    });
    expect(result).toEqual({
      message:
        'Confirmation emails sent. Confirm both your current and new email addresses to complete the change.',
    });
  });

  it('preserves current password whitespace exactly', async () => {
    mockRequestApi.mockResolvedValueOnce({ message: 'ok' });

    await requestEmailChange({
      token: SESSION_TOKEN,
      currentPassword: '  spaced password  ',
      newEmail: 'new@example.com',
    });

    const body = (
      mockRequestApi.mock.calls[0]![0] as { body: Record<string, string> }
    ).body;
    expect(body.current_password).toBe('  spaced password  ');
    expect(body.new_email).toBe('new@example.com');
  });

  it('forwards AbortSignal', async () => {
    const signal = new AbortController().signal;
    mockRequestApi.mockResolvedValueOnce({ message: 'ok' });

    await requestEmailChange({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      newEmail: 'new@example.com',
      signal,
    });

    expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
  });

  it('rejects malformed success payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({ ok: true });

    await expect(
      requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newEmail: 'new@example.com',
      }),
    ).rejects.toMatchObject({
      name: 'AccountApiError',
      status: 500,
      message: 'Invalid change-email payload',
    });
  });

  it('surfaces incorrect password, duplicate email, 401, and 503 safely', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Current password is incorrect', 400, {
        error: 'Current password is incorrect',
      }),
    );
    await expect(
      requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'secret-current',
        newEmail: 'new@example.com',
      }),
    ).rejects.toMatchObject({
      message: 'Current password is incorrect',
      status: 400,
    });

    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('An account with this email already exists', 409, {
        error: 'An account with this email already exists',
      }),
    );
    await expect(
      requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newEmail: 'taken@example.com',
      }),
    ).rejects.toMatchObject({ status: 409 });

    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Authentication required', 401, {
        error: 'Authentication required',
      }),
    );
    await expect(
      requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newEmail: 'new@example.com',
      }),
    ).rejects.toMatchObject({ status: 401 });

    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Verification email delivery failed', 503, {
        error: 'Verification email delivery failed',
      }),
    );
    await expect(
      requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        newEmail: 'new@example.com',
      }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('does not leak passwords in thrown errors', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Current password is incorrect', 400, {
        error: 'Current password is incorrect',
      }),
    );

    try {
      await requestEmailChange({
        token: SESSION_TOKEN,
        currentPassword: 'secret-current-password',
        newEmail: 'new@example.com',
      });
      expect.unreachable('expected AccountApiError');
    } catch (e) {
      const err = e as AccountApiError;
      expect(err.message).not.toContain('secret-current-password');
      expect(String(err.stack ?? '')).not.toContain('secret-current-password');
    }
  });
});

describe('accountApi.verifyEmailChange', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs verify path with token body and NO Bearer Session', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message: 'Email confirmation recorded',
      email_change_complete: false,
    });

    const result = await verifyEmailChange({
      verificationToken: VERIFY_TOKEN,
    });

    expect(HYPATIA_API_PATHS.accountVerifyEmailChange).toBe(
      '/api/account/change-email/verify',
    );
    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.accountVerifyEmailChange,
      method: 'POST',
      body: { token: VERIFY_TOKEN },
      signal: undefined,
    });
    const call = mockRequestApi.mock.calls[0]![0] as Record<string, unknown>;
    expect(call).not.toHaveProperty('token');
    expect(result).toEqual({
      kind: 'pending',
      message: 'Email confirmation recorded',
    });
  });

  it('maps email_change_complete true to completed without message parsing', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message: 'Email address changed successfully',
      email_change_complete: true,
    });

    const result = await verifyEmailChange({
      verificationToken: VERIFY_TOKEN,
    });

    expect(result).toEqual({
      kind: 'completed',
      message: 'Email address changed successfully',
    });
  });

  it('forwards AbortSignal', async () => {
    const signal = new AbortController().signal;
    mockRequestApi.mockResolvedValueOnce({
      message: 'Email confirmation recorded',
      email_change_complete: false,
    });

    await verifyEmailChange({
      verificationToken: VERIFY_TOKEN,
      signal,
    });

    expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
  });

  it('rejects malformed success payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message: 'Email confirmation recorded',
    });

    await expect(
      verifyEmailChange({ verificationToken: VERIFY_TOKEN }),
    ).rejects.toMatchObject({
      name: 'AccountApiError',
      status: 500,
      message: 'Invalid change-email verify payload',
    });
  });

  it('surfaces invalid token errors without leaking the token', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Invalid or expired verification token', 400, {
        error: 'Invalid or expired verification token',
      }),
    );

    try {
      await verifyEmailChange({
        verificationToken: VERIFY_TOKEN,
      });
      expect.unreachable('expected AccountApiError');
    } catch (e) {
      const err = e as AccountApiError;
      expect(err.status).toBe(400);
      expect(err.message).not.toContain(VERIFY_TOKEN);
      expect(String(err.stack ?? '')).not.toContain(VERIFY_TOKEN);
    }
  });
});
