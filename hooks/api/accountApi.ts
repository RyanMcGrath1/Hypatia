/**
 * Account HTTP client — account self-service endpoints against hypatia-backend.
 * Pure API boundary: requires an explicit Session token where authenticated;
 * does not own auth state or persist credentials.
 */
import { z } from 'zod';

import { getHypatiaBackendBaseUrl } from '@/hooks/api/hypatiaBaseUrl';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';
import { HttpApiError, requestApi } from '@/hooks/api/httpClient';
import type { SessionToken } from '@/hooks/api/authApi';

/** Domain error for account API calls — wraps HTTP and payload parse failures. */
export class AccountApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'AccountApiError';
  }
}

export type ChangePasswordRequest = {
  token: SessionToken;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  signal?: AbortSignal;
};

export type ChangePasswordResult = {
  message: string;
  /** Replacement Session token — caller must persist via session rotation. */
  sessionToken: SessionToken;
  /** Backend timestamp; Profile GET remains the display source of truth. */
  passwordChangedAt: string;
};

export type RequestEmailChangeRequest = {
  token: SessionToken;
  currentPassword: string;
  /** Caller may trim surrounding whitespace; password is never trimmed. */
  newEmail: string;
  signal?: AbortSignal;
};

export type RequestEmailChangeResult = {
  message: string;
};

export type VerifyEmailChangeRequest = {
  /** Opaque emailed verification token — not a Session / Bearer credential. */
  verificationToken: string;
  signal?: AbortSignal;
};

/**
 * Machine-readable verify outcome from `email_change_complete`.
 * Do not infer this from human-readable `message` text.
 */
export type VerifyEmailChangeResult =
  | {
      kind: 'pending';
      message: string;
    }
  | {
      kind: 'completed';
      message: string;
    };

export type DeleteAccountRequest = {
  token: SessionToken;
  /** Forwarded exactly — never trim/normalize. */
  currentPassword: string;
  /** Must be exact uppercase `DELETE`; forwarded without trim. */
  confirmation: string;
  /**
   * Include only when TOTP is enabled on the account.
   * Omitted entirely from the request body when not required.
   */
  totpCode?: string;
  signal?: AbortSignal;
};

export type DeleteAccountResult = {
  message: string;
};

const nonEmptyString = z.string().min(1);

const changePasswordSuccessSchema = z.object({
  message: z.string(),
  token: nonEmptyString,
  password_changed_at: z.string(),
});

const requestEmailChangeSuccessSchema = z.object({
  message: z.string(),
});

const verifyEmailChangeSuccessSchema = z.object({
  message: z.string(),
  email_change_complete: z.boolean(),
});

const deleteAccountSuccessSchema = z.object({
  message: z.string(),
});

function wrapAccountHttpError(e: unknown): never {
  if (e instanceof AccountApiError) {
    throw e;
  }
  if (e instanceof HttpApiError) {
    throw new AccountApiError(e.message, e.status, e.body);
  }
  throw e;
}

/**
 * `POST /api/account/change-password` — changes password and returns a
 * replacement Session token. Does not persist the token.
 *
 * Password fields are forwarded exactly as provided (no trim/normalize).
 */
export async function changePassword(
  params: ChangePasswordRequest,
): Promise<ChangePasswordResult> {
  const {
    token,
    currentPassword,
    newPassword,
    confirmNewPassword,
    signal,
  } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.accountChangePassword,
      method: 'POST',
      token,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      },
      signal,
    });
  } catch (e) {
    wrapAccountHttpError(e);
  }

  const parsed = changePasswordSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AccountApiError('Invalid change-password payload', 500, body);
  }

  return {
    message: parsed.data.message,
    sessionToken: parsed.data.token,
    passwordChangedAt: parsed.data.password_changed_at,
  };
}

/**
 * `POST /api/account/change-email` — starts dual-confirmation email change.
 * Does not change Profile.email or mutate Session state.
 *
 * `currentPassword` is forwarded exactly; `newEmail` is sent as provided
 * (caller may trim; backend normalizes).
 */
export async function requestEmailChange(
  params: RequestEmailChangeRequest,
): Promise<RequestEmailChangeResult> {
  const { token, currentPassword, newEmail, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.accountChangeEmail,
      method: 'POST',
      token,
      body: {
        new_email: newEmail,
        current_password: currentPassword,
      },
      signal,
    });
  } catch (e) {
    wrapAccountHttpError(e);
  }

  const parsed = requestEmailChangeSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AccountApiError('Invalid change-email payload', 500, body);
  }

  return { message: parsed.data.message };
}

/**
 * `POST /api/account/change-email/verify` — public token verification.
 * Does NOT send a Bearer Session. Does not persist the verification token.
 *
 * Discriminates pending vs completed via `email_change_complete` only.
 */
export async function verifyEmailChange(
  params: VerifyEmailChangeRequest,
): Promise<VerifyEmailChangeResult> {
  const { verificationToken, signal } = params;

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.accountVerifyEmailChange,
      method: 'POST',
      body: {
        token: verificationToken,
      },
      signal,
    });
  } catch (e) {
    wrapAccountHttpError(e);
  }

  const parsed = verifyEmailChangeSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AccountApiError(
      'Invalid change-email verify payload',
      500,
      body,
    );
  }

  if (parsed.data.email_change_complete) {
    return {
      kind: 'completed',
      message: parsed.data.message,
    };
  }

  return {
    kind: 'pending',
    message: parsed.data.message,
  };
}

/**
 * `DELETE /api/account` — soft-deletes / anonymizes the account after
 * password (and conditional TOTP) reauthentication.
 *
 * Pure API boundary: does not mutate AuthProvider Session state and does not
 * return a replacement Session. Callers must clear local auth after success.
 *
 * Password, confirmation, and optional TOTP code are forwarded exactly
 * (no trim/normalize). `totp_code` is omitted from the body when not provided.
 */
export async function deleteAccount(
  params: DeleteAccountRequest,
): Promise<DeleteAccountResult> {
  const { token, currentPassword, confirmation, totpCode, signal } = params;

  const requestBody: {
    current_password: string;
    confirmation: string;
    totp_code?: string;
  } = {
    current_password: currentPassword,
    confirmation,
  };
  if (totpCode !== undefined) {
    requestBody.totp_code = totpCode;
  }

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.accountDelete,
      method: 'DELETE',
      token,
      body: requestBody,
      signal,
    });
  } catch (e) {
    wrapAccountHttpError(e);
  }

  const parsed = deleteAccountSuccessSchema.safeParse(body);
  if (!parsed.success) {
    throw new AccountApiError('Invalid delete-account payload', 500, body);
  }

  return { message: parsed.data.message };
}
