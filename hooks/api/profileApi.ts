/**
 * Profile HTTP client — GET / PATCH `/api/profile` against hypatia-backend.
 * Pure API boundary: requires an explicit Session token; does not own auth state.
 */
import { z } from 'zod';

import { getHypatiaBackendBaseUrl } from '@/hooks/api/hypatiaBaseUrl';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';
import { HttpApiError, requestApi } from '@/hooks/api/httpClient';
import type { SessionToken } from '@/hooks/api/authApi';

/** Domain error for profile API calls — wraps HTTP failures and payload parse failures. */
export class ProfileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ProfileApiError';
  }
}

/** Frontend Profile — camelCase translation of the backend profile payload. */
export type Profile = {
  firstName: string;
  lastName: string;
  dateJoined: string;
  email: string;
  passwordChangedAt: string | null;
  totpEnabled: boolean;
};

export type GetProfileRequest = {
  token: SessionToken;
  signal?: AbortSignal;
};

export type UpdateProfileRequest = {
  token: SessionToken;
  firstName?: string;
  lastName?: string;
  signal?: AbortSignal;
};

const profileResponseSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  date_joined: z.string(),
  email: z.string(),
  password_changed_at: z.string().nullable(),
  totp_enabled: z.boolean(),
});

function wrapProfileHttpError(e: unknown): never {
  if (e instanceof ProfileApiError) {
    throw e;
  }
  if (e instanceof HttpApiError) {
    throw new ProfileApiError(e.message, e.status, e.body);
  }
  throw e;
}

function parseProfileResponse(body: unknown): Profile {
  const parsed = profileResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ProfileApiError('Invalid profile payload', 500, body);
  }
  const d = parsed.data;
  return {
    firstName: d.first_name,
    lastName: d.last_name,
    dateJoined: d.date_joined,
    email: d.email,
    passwordChangedAt: d.password_changed_at,
    totpEnabled: d.totp_enabled,
  };
}

/**
 * `GET /api/profile` — returns the authenticated user's profile.
 * Requires a real Session token; does not read AuthProvider / token storage.
 */
export async function getProfile(params: GetProfileRequest): Promise<Profile> {
  const { token, signal } = params;
  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.profile,
      method: 'GET',
      token,
      signal,
    });
  } catch (e) {
    wrapProfileHttpError(e);
  }

  return parseProfileResponse(body);
}

/**
 * `PATCH /api/profile` — updates first and/or last name.
 * Only caller-supplied fields are sent (no undefined JSON keys).
 * Name values are forwarded exactly as provided (no trim/normalize).
 */
export async function updateProfile(params: UpdateProfileRequest): Promise<Profile> {
  const { token, firstName, lastName, signal } = params;

  const patchBody: Record<string, string> = {};
  if (firstName !== undefined) {
    patchBody.first_name = firstName;
  }
  if (lastName !== undefined) {
    patchBody.last_name = lastName;
  }

  let body: unknown;
  try {
    body = await requestApi({
      baseUrl: getHypatiaBackendBaseUrl(),
      path: HYPATIA_API_PATHS.profile,
      method: 'PATCH',
      token,
      body: patchBody,
      signal,
    });
  } catch (e) {
    wrapProfileHttpError(e);
  }

  return parseProfileResponse(body);
}
