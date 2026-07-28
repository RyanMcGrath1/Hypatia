/**
 * Security TOTP HTTP client — Profile authenticator setup/enable/disable
 * against hypatia-backend. Pure API boundary: requires an explicit Session
 * token; does not own auth state or persist credentials / secrets.
 */
import { z } from 'zod';

import { getHypatiaBackendBaseUrl } from '@/hooks/api/hypatiaBaseUrl';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';
import { HttpApiError, requestApi } from '@/hooks/api/httpClient';
import type { SessionToken } from '@/hooks/api/authApi';

/** Domain error for security TOTP API calls — wraps HTTP and payload parse failures. */
export class SecurityTotpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'SecurityTotpApiError';
  }
}

export type SetupTotpRequest = {
  token: SessionToken;
  /** Forwarded exactly — no trim/normalize. */
  currentPassword: string;
  signal?: AbortSignal;
};

/**
 * One-time provisioning data from setup. Must remain in local UI memory only —
 * never persist provisioningUri or manualKey.
 */
export type TotpSetupResult = {
  provisioningUri: string;
  manualKey: string;
};

export type EnableTotpRequest = {
  token: SessionToken;
  /** 6-digit authenticator code as a string (leading zeroes preserved). */
  code: string;
  signal?: AbortSignal;
};

export type TotpEnableResult = {
  message: string;
  /** Replacement Session token — caller must persist via session rotation. */
  sessionToken: SessionToken;
  totpEnabled: true;
};

export type DisableTotpRequest = {
  token: SessionToken;
  /** Forwarded exactly — no trim/normalize. */
  currentPassword: string;
  /** 6-digit authenticator code as a string (leading zeroes preserved). */
  code: string;
  signal?: AbortSignal;
};

export type TotpDisableResult = {
  message: string;
  /** Replacement Session token — caller must persist via session rotation. */
  sessionToken: SessionToken;
  totpEnabled: false;
};

export type CancelTotpSetupRequest = {
  token: SessionToken;
  signal?: AbortSignal;
};

export type TotpCancelSetupResult = {
  message: string;
};

const nonEmptyString = z.string().min(1);

const totpSetupSuccessSchema = z.object({
  provisioning_uri: nonEmptyString,
  manual_entry_key: nonEmptyString,
});

const totpEnableSuccessSchema = z.object({
  message: z.string(),
  token: nonEmptyString,
  totp_enabled: z.literal(true),
});

const totpDisableSuccessSchema = z.object({
  message: z.string(),
  token: nonEmptyString,
  totp_enabled: z.literal(false),
});

const totpCancelSetupSuccessSchema = z.object({
  message: z.string(),
});

function wrapSecurityTotpHttpError(e: unknown): never {
  if (e instanceof SecurityTotpApiError) {
    throw e;
  }
  if (e instanceof HttpApiError) {
    throw new SecurityTotpApiError(e.message, e.status, e.body);
  }
  throw e;
}

/**
 * `POST /api/security/totp/setup` — starts TOTP enrollment (method stays disabled).
 * Returns provisioning URI + manual key for one-time UI display.
 * Does not rotate Session. Does not persist secrets.
 */
export async function setupTotp(
  params: SetupTotpRequest,
): Promise<TotpSetupResult> {
  const { token, currentPassword, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.securityTotpSetup,
      method: 'POST',
      token,
      body: {
        current_password: currentPassword,
      },
      signal,
    });
  } catch (e) {
    wrapSecurityTotpHttpError(e);
  }

  const parsed = totpSetupSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new SecurityTotpApiError('Invalid TOTP setup payload', 500, body);
  }

  return {
    provisioningUri: parsed.data.provisioning_uri,
    manualKey: parsed.data.manual_entry_key,
  };
}

/**
 * `DELETE /api/security/totp/setup` — cancels incomplete (disabled) enrollment.
 * Idempotent. Does not rotate Session. Does not require the plaintext secret.
 * Never deletes an already-enabled authenticator (server-enforced).
 */
export async function cancelTotpSetup(
  params: CancelTotpSetupRequest,
): Promise<TotpCancelSetupResult> {
  const { token, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.securityTotpSetup,
      method: 'DELETE',
      token,
      signal,
    });
  } catch (e) {
    wrapSecurityTotpHttpError(e);
  }

  const parsed = totpCancelSetupSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new SecurityTotpApiError(
      'Invalid TOTP setup cancel payload',
      500,
      body,
    );
  }

  return { message: parsed.data.message };
}

/**
 * `POST /api/security/totp/enable` — verifies a TOTP code and enables the method.
 * Revokes prior Sessions and returns a replacement Session token.
 * Does not persist the token.
 */
export async function enableTotp(
  params: EnableTotpRequest,
): Promise<TotpEnableResult> {
  const { token, code, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.securityTotpEnable,
      method: 'POST',
      token,
      body: {
        code,
      },
      signal,
    });
  } catch (e) {
    wrapSecurityTotpHttpError(e);
  }

  const parsed = totpEnableSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new SecurityTotpApiError('Invalid TOTP enable payload', 500, body);
  }

  return {
    message: parsed.data.message,
    sessionToken: parsed.data.token,
    totpEnabled: true,
  };
}

/**
 * `POST /api/security/totp/disable` — disables TOTP after password + code check.
 * Revokes prior Sessions and returns a replacement Session token.
 * Does not persist the token.
 */
export async function disableTotp(
  params: DisableTotpRequest,
): Promise<TotpDisableResult> {
  const { token, currentPassword, code, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.securityTotpDisable,
      method: 'POST',
      token,
      body: {
        current_password: currentPassword,
        code,
      },
      signal,
    });
  } catch (e) {
    wrapSecurityTotpHttpError(e);
  }

  const parsed = totpDisableSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new SecurityTotpApiError('Invalid TOTP disable payload', 500, body);
  }

  return {
    message: parsed.data.message,
    sessionToken: parsed.data.token,
    totpEnabled: false,
  };
}
