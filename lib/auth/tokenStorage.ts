/**
 * Opaque session-token storage for Hypatia auth.
 *
 * Native (iOS/Android): persists via expo-secure-store (Keychain / Keystore).
 * Web: in-memory only — a page refresh intentionally clears the session.
 *   No localStorage / sessionStorage / cookies / IndexedDB. Persistent web
 *   auth is not designed yet; native is the primary target.
 *
 * Does not validate tokens with the backend. Does not touch HTTP or AuthContext.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'hypatia.session_token';

/** Web-only in-memory fallback (lost on refresh). */
let webSessionToken: string | null = null;

export class SessionTokenStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SessionTokenStorageError';
  }
}

function assertNonEmptyToken(token: string): void {
  if (typeof token !== 'string' || token.length === 0) {
    throw new SessionTokenStorageError('Session token must be a non-empty string');
  }
}

/** Read the stored opaque session token, or `null` if none. */
export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webSessionToken;
  }

  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to read session token', { cause });
  }
}

/**
 * Persist an opaque session token exactly as provided.
 * Rejects empty strings. Does not trim, normalize, or parse the value.
 */
export async function setSessionToken(token: string): Promise<void> {
  assertNonEmptyToken(token);

  if (Platform.OS === 'web') {
    webSessionToken = token;
    return;
  }

  try {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to store session token', { cause });
  }
}

/**
 * Remove any stored session token.
 * Safe when no token is present (idempotent for logout / recovery paths).
 */
export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webSessionToken = null;
    return;
  }

  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to clear session token', { cause });
  }
}
