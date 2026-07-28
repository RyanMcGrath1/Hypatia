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
  SecurityTotpApiError,
  cancelTotpSetup,
  disableTotp,
  enableTotp,
  setupTotp,
} from '@/hooks/api/securityTotpApi';

const mockRequestApi = requestApi as ReturnType<typeof vi.fn>;

const SESSION_TOKEN = 'opaque_session_tok_TotpSecurityAbC123';
const REPLACEMENT_TOKEN = 'opaque_session_tok_TotpReplacementXyZ789';
const PROVISIONING_URI =
  'otpauth://totp/Hypatia:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Hypatia';
const MANUAL_KEY = 'JBSWY3DPEHPK3PXP';

const SETUP_SUCCESS_BODY = {
  provisioning_uri: PROVISIONING_URI,
  manual_entry_key: MANUAL_KEY,
};

const ENABLE_SUCCESS_BODY = {
  message: 'Authenticator app enabled',
  token: REPLACEMENT_TOKEN,
  totp_enabled: true,
};

const DISABLE_SUCCESS_BODY = {
  message: 'Authenticator app disabled',
  token: REPLACEMENT_TOKEN,
  totp_enabled: false,
};

const CANCEL_SETUP_SUCCESS_BODY = {
  message: 'Authenticator setup cancelled',
};

describe('securityTotpApi paths', () => {
  it('exposes the security TOTP paths (cancel reuses setup path)', () => {
    expect(HYPATIA_API_PATHS.securityTotpSetup).toBe(
      '/api/security/totp/setup',
    );
    expect(HYPATIA_API_PATHS.securityTotpEnable).toBe(
      '/api/security/totp/enable',
    );
    expect(HYPATIA_API_PATHS.securityTotpDisable).toBe(
      '/api/security/totp/disable',
    );
  });
});

describe('securityTotpApi.setupTotp', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs setup with Bearer Session and exact current password', async () => {
    mockRequestApi.mockResolvedValueOnce(SETUP_SUCCESS_BODY);

    const result = await setupTotp({
      token: SESSION_TOKEN,
      currentPassword: '  current spaced ',
    });

    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.securityTotpSetup,
      method: 'POST',
      token: SESSION_TOKEN,
      body: {
        current_password: '  current spaced ',
      },
      signal: undefined,
    });
    expect(result).toEqual({
      provisioningUri: PROVISIONING_URI,
      manualKey: MANUAL_KEY,
    });
  });

  it('forwards AbortSignal', async () => {
    const signal = new AbortController().signal;
    mockRequestApi.mockResolvedValueOnce(SETUP_SUCCESS_BODY);

    await setupTotp({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
      signal,
    });

    expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
  });

  it('rejects malformed 2xx payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({ provisioning_uri: '' });

    await expect(
      setupTotp({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 500,
      message: 'Invalid TOTP setup payload',
    });
  });

  it('maps HTTP errors to SecurityTotpApiError without leaking secrets', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Current password is incorrect', 400, {
        error: 'Current password is incorrect',
      }),
    );

    await expect(
      setupTotp({
        token: SESSION_TOKEN,
        currentPassword: 'wrong-password-secret',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 400,
      message: 'Current password is incorrect',
    });

    try {
      mockRequestApi.mockRejectedValueOnce(
        new HttpApiError('Current password is incorrect', 400, null),
      );
      await setupTotp({
        token: SESSION_TOKEN,
        currentPassword: 'wrong-password-secret',
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SecurityTotpApiError);
      const message = (error as SecurityTotpApiError).message;
      expect(message).not.toContain('wrong-password-secret');
      expect(message).not.toContain(PROVISIONING_URI);
      expect(message).not.toContain(MANUAL_KEY);
      expect(message).not.toContain(SESSION_TOKEN);
    }
  });

  it('maps 401 safely', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Authentication required', 401, {
        error: 'Authentication required',
      }),
    );

    await expect(
      setupTotp({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 401,
      message: 'Authentication required',
    });
  });
});

describe('securityTotpApi.enableTotp', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs enable with exact string code and maps replacement Session', async () => {
    mockRequestApi.mockResolvedValueOnce(ENABLE_SUCCESS_BODY);

    const result = await enableTotp({
      token: SESSION_TOKEN,
      code: '012345',
    });

    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.securityTotpEnable,
      method: 'POST',
      token: SESSION_TOKEN,
      body: {
        code: '012345',
      },
      signal: undefined,
    });
    expect(result).toEqual({
      message: 'Authenticator app enabled',
      sessionToken: REPLACEMENT_TOKEN,
      totpEnabled: true,
    });
    expect(typeof result.sessionToken).toBe('string');
  });

  it('preserves leading zeroes in the code string', async () => {
    mockRequestApi.mockResolvedValueOnce(ENABLE_SUCCESS_BODY);

    await enableTotp({
      token: SESSION_TOKEN,
      code: '012345',
    });

    const body = (
      mockRequestApi.mock.calls[0]![0] as { body: Record<string, string> }
    ).body;
    expect(body.code).toBe('012345');
    expect(body.code).not.toBe(12345 as unknown as string);
  });

  it('rejects malformed 2xx payloads missing token', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message: 'Authenticator app enabled',
      totp_enabled: true,
    });

    await expect(
      enableTotp({
        token: SESSION_TOKEN,
        code: '123456',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 500,
      message: 'Invalid TOTP enable payload',
    });
  });

  it('maps invalid-code 400 safely', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Invalid authenticator code', 400, {
        error: 'Invalid authenticator code',
      }),
    );

    await expect(
      enableTotp({
        token: SESSION_TOKEN,
        code: '000000',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 400,
      message: 'Invalid authenticator code',
    });
  });
});

describe('securityTotpApi.disableTotp', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs disable with exact password, string code, and maps replacement Session', async () => {
    mockRequestApi.mockResolvedValueOnce(DISABLE_SUCCESS_BODY);

    const result = await disableTotp({
      token: SESSION_TOKEN,
      currentPassword: '  current spaced ',
      code: '012345',
    });

    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.securityTotpDisable,
      method: 'POST',
      token: SESSION_TOKEN,
      body: {
        current_password: '  current spaced ',
        code: '012345',
      },
      signal: undefined,
    });
    expect(result).toEqual({
      message: 'Authenticator app disabled',
      sessionToken: REPLACEMENT_TOKEN,
      totpEnabled: false,
    });
  });

  it('rejects malformed 2xx payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({
      message: 'Authenticator app disabled',
      totp_enabled: false,
    });

    await expect(
      disableTotp({
        token: SESSION_TOKEN,
        currentPassword: 'validpassword12',
        code: '123456',
      }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 500,
      message: 'Invalid TOTP disable payload',
    });
  });
});

describe('securityTotpApi.cancelTotpSetup', () => {
  beforeEach(() => {
    mockRequestApi.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('DELETEs setup with Bearer Session and no body/secret', async () => {
    mockRequestApi.mockResolvedValueOnce(CANCEL_SETUP_SUCCESS_BODY);

    const result = await cancelTotpSetup({ token: SESSION_TOKEN });

    expect(mockRequestApi).toHaveBeenCalledWith({
      baseUrl: 'http://test-backend.example',
      path: HYPATIA_API_PATHS.securityTotpSetup,
      method: 'DELETE',
      token: SESSION_TOKEN,
      signal: undefined,
    });
    expect(result).toEqual({
      message: 'Authenticator setup cancelled',
    });
    const call = mockRequestApi.mock.calls[0]![0] as {
      body?: unknown;
    };
    expect(call.body).toBeUndefined();
  });

  it('forwards AbortSignal', async () => {
    const signal = new AbortController().signal;
    mockRequestApi.mockResolvedValueOnce(CANCEL_SETUP_SUCCESS_BODY);

    await cancelTotpSetup({ token: SESSION_TOKEN, signal });

    expect(mockRequestApi.mock.calls[0]![0]).toMatchObject({ signal });
  });

  it('rejects malformed 2xx payloads', async () => {
    mockRequestApi.mockResolvedValueOnce({});

    await expect(
      cancelTotpSetup({ token: SESSION_TOKEN }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 500,
      message: 'Invalid TOTP setup cancel payload',
    });
  });

  it('maps HTTP errors to SecurityTotpApiError', async () => {
    mockRequestApi.mockRejectedValueOnce(
      new HttpApiError('Authentication required', 401, {
        error: 'Authentication required',
      }),
    );

    await expect(
      cancelTotpSetup({ token: SESSION_TOKEN }),
    ).rejects.toMatchObject({
      name: 'SecurityTotpApiError',
      status: 401,
      message: 'Authentication required',
    });
  });
});

describe('securityTotpApi boundary separation', () => {
  it('does not import AuthProvider, tokenStorage, or SecureStore', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../hooks/api/securityTotpApi.ts'),
      'utf8',
    );

    expect(source).not.toMatch(
      /from ['"]@\/lib\/auth\/tokenStorage['"]|from ['"]expo-secure-store['"]|from ['"]@\/components\/auth\/AuthProvider['"]/,
    );
    expect(source).not.toMatch(
      /\bsetSessionToken\b|\bestablishSession\b|\breplaceSession\b|\bclearSession\b/,
    );
    expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
  });

  it('does not persist setup secrets or Session tokens', async () => {
    mockRequestApi.mockResolvedValueOnce(SETUP_SUCCESS_BODY);
    const result = await setupTotp({
      token: SESSION_TOKEN,
      currentPassword: 'validpassword12',
    });

    expect(result.provisioningUri).toBe(PROVISIONING_URI);
    expect(result.manualKey).toBe(MANUAL_KEY);

    const source = readFileSync(
      resolve(__dirname, '../../../hooks/api/securityTotpApi.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /AsyncStorage|localStorage|sessionStorage|SecureStore|tokenStorage/,
    );
  });
});
