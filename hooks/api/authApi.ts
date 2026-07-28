/**
 * Auth HTTP client — register / login / TOTP / logout against hypatia-backend.
 * Returns typed results only; does not store tokens or own session state.
 */
import { z } from 'zod';

import { getHypatiaBackendBaseUrl } from '@/hooks/api/hypatiaBaseUrl';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';
import { HttpApiError, requestApi } from '@/hooks/api/httpClient';

/** Domain error for auth API calls — wraps HTTP failures and payload parse failures. */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/** Opaque authenticated session token (Bearer). Distinct from MFA challenge tokens. */
export type SessionToken = string;

/** Opaque MFA challenge — only for `/api/auth/login/totp`; never a Bearer session. */
export type MfaChallengeToken = string;

export type RegisterRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  signal?: AbortSignal;
};

export type RegisterResult = {
  message: string;
  sessionToken: SessionToken;
};

export type LoginRequest = {
  email: string;
  password: string;
  signal?: AbortSignal;
};

export type LoginResult =
  | {
      kind: 'authenticated';
      message: string;
      sessionToken: SessionToken;
    }
  | {
      kind: 'totp_required';
      challengeToken: MfaChallengeToken;
      mfaMethod: 'totp';
    };

export type CompleteTotpLoginRequest = {
  challengeToken: MfaChallengeToken;
  code: string;
  signal?: AbortSignal;
};

export type CompleteTotpLoginResult = {
  message: string;
  sessionToken: SessionToken;
};

export type LogoutRequest = {
  /** Current session token — sent as `Authorization: Bearer`. */
  token: SessionToken;
  signal?: AbortSignal;
};

export type LogoutResult = {
  message: string;
};

const nonEmptyString = z.string().min(1);

const sessionAuthSuccessSchema = z.object({
  message: z.string(),
  token: nonEmptyString,
});

const totpRequiredSchema = z.object({
  mfa_required: z.literal(true),
  mfa_method: z.literal('totp'),
  challenge_token: nonEmptyString,
});

const logoutSuccessSchema = z.object({
  message: z.string(),
});

function wrapAuthHttpError(e: unknown): never {
  if (e instanceof AuthApiError) {
    throw e;
  }
  if (e instanceof HttpApiError) {
    throw new AuthApiError(e.message, e.status, e.body);
  }
  throw e;
}

function parseSessionAuthSuccess(
  body: unknown,
  invalidMessage: string,
): { message: string; sessionToken: SessionToken } {
  const parsed = sessionAuthSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AuthApiError(invalidMessage, 500, body);
  }
  return {
    message: parsed.data.message,
    sessionToken: parsed.data.token,
  };
}

function parseLoginResult(body: unknown): LoginResult {
  const mfa = totpRequiredSchema.safeParse(body);
  if (mfa.success) {
    return {
      kind: 'totp_required',
      challengeToken: mfa.data.challenge_token,
      mfaMethod: 'totp',
    };
  }

  const auth = sessionAuthSuccessSchema.safeParse(body);
  if (auth.success) {
    return {
      kind: 'authenticated',
      message: auth.data.message,
      sessionToken: auth.data.token,
    };
  }

  throw new AuthApiError('Invalid auth login payload', 500, body);
}

/**
 * `POST /api/auth/register` — returns session token; does not persist it.
 * Password is sent exactly as provided (no trim/normalize).
 */
export async function register(params: RegisterRequest): Promise<RegisterResult> {
  const { email, password, firstName, lastName, signal } = params;
  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.authRegister,
      method: 'POST',
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
      signal,
    });
  } catch (e) {
    wrapAuthHttpError(e);
  }

  return parseSessionAuthSuccess(body, 'Invalid auth register payload');
}

/**
 * `POST /api/auth/login` — authenticated session or TOTP challenge.
 * Password is sent exactly as provided (no trim/normalize).
 */
export async function login(params: LoginRequest): Promise<LoginResult> {
  const { email, password, signal } = params;
  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.authLogin,
      method: 'POST',
      body: {
        email,
        password,
      },
      signal,
    });
  } catch (e) {
    wrapAuthHttpError(e);
  }

  return parseLoginResult(body);
}

/**
 * `POST /api/auth/login/totp` — completes MFA with challenge token + code.
 * Returns session token; does not persist it.
 */
export async function completeTotpLogin(
  params: CompleteTotpLoginRequest,
): Promise<CompleteTotpLoginResult> {
  const { challengeToken, code, signal } = params;
  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.authLoginTotp,
      method: 'POST',
      body: {
        challenge_token: challengeToken,
        code,
      },
      signal,
    });
  } catch (e) {
    wrapAuthHttpError(e);
  }

  return parseSessionAuthSuccess(body, 'Invalid auth TOTP login payload');
}

/**
 * `POST /api/auth/logout` — requires Bearer session token.
 * Does not clear local session storage or AuthProvider.
 */
export async function logout(params: LogoutRequest): Promise<LogoutResult> {
  const { token, signal } = params;
  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.authLogout,
      method: 'POST',
      token,
      signal,
    });
  } catch (e) {
    wrapAuthHttpError(e);
  }

  const parsed = logoutSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AuthApiError('Invalid auth logout payload', 500, body);
  }
  return { message: parsed.data.message };
}
