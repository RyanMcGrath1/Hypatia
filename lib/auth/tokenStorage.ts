/**
 * Opaque session-token storage for Hypatia auth.
 *
 * Native (iOS/Android): persists via expo-secure-store (Keychain / Keystore).
 * Web: in-memory only — a page refresh intentionally clears the session.
 *   No localStorage / sessionStorage / cookies / IndexedDB. Persistent web
 *   auth is not designed yet; native is the primary target.
 *
 * Native clear uses a write-ahead invalidation marker so a failed token
 * deletion (or a crash after marking) cannot restore a dead credential on
 * the next cold start. Restore is fail-closed: if the marker is present,
 * getSessionToken never returns the stored token.
 *
 * Does not validate tokens with the backend. Does not touch HTTP or AuthContext.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'hypatia.session_token';
/** Auth-state metadata only — never a credential. Native clear/restore use this. */
const SESSION_INVALIDATED_KEY = 'hypatia.session_invalidated';
const SESSION_INVALIDATED_VALUE = '1';

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

/**
 * Best-effort native cleanup while an invalidation marker is present.
 * Never throws; never returns a credential. Fail closed.
 */
async function ignoreStoredTokenWhileInvalidated(): Promise<null> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    // Token absent (or deleted) — safe to drop the marker.
    try {
      await SecureStore.deleteItemAsync(SESSION_INVALIDATED_KEY);
    } catch {
      // Leftover marker keeps restore signed out.
    }
  } catch {
    // Stale token may remain; marker stays so restore stays signed out.
  }
  return null;
}

/** Read the stored opaque session token, or `null` if none. */
export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webSessionToken;
  }

  try {
    const invalidated = await SecureStore.getItemAsync(SESSION_INVALIDATED_KEY);
    if (invalidated != null) {
      // Marker means a prior clear decided this credential must not restore.
      return await ignoreStoredTokenWhileInvalidated();
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to read session token', { cause });
  }
}

/**
 * Persist an opaque session token exactly as provided.
 * Rejects empty strings. Does not trim, normalize, or parse the value.
 *
 * Ordering (native): clear any stale invalidation marker first, then write
 * the new token. That way a leftover tombstone cannot suppress a newly
 * authenticated Session. If marker cleanup fails, persistence fails —
 * callers must not treat the Session as stored.
 */
export async function setSessionToken(token: string): Promise<void> {
  assertNonEmptyToken(token);

  if (Platform.OS === 'web') {
    webSessionToken = token;
    return;
  }

  try {
    await SecureStore.deleteItemAsync(SESSION_INVALIDATED_KEY);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to store session token', { cause });
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
 *
 * Native ordering: write invalidation marker → delete token → remove marker.
 * If the process dies or token deletion fails after the marker is written,
 * the next restore still treats the Session as cleared (fail closed).
 */
export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webSessionToken = null;
    return;
  }

  // Write-ahead tombstone. If this fails, still attempt token deletion —
  // a successful delete is a durable clear even without the marker.
  try {
    await SecureStore.setItemAsync(
      SESSION_INVALIDATED_KEY,
      SESSION_INVALIDATED_VALUE,
    );
  } catch {
    // Continue — token deletion may still clear durably.
  }

  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (cause) {
    // If the marker was written, it remains so restore stays signed out.
    // If marker write also failed, durable clear cannot be guaranteed.
    // Never report success when the token could not be removed.
    throw new SessionTokenStorageError('Unable to clear session token', { cause });
  }

  // Token deleted. Drop the marker when possible so successful clears leave
  // no tombstone metadata. Leftover marker after this point is still safe
  // (restore stays signed out).
  try {
    await SecureStore.deleteItemAsync(SESSION_INVALIDATED_KEY);
  } catch (cause) {
    throw new SessionTokenStorageError('Unable to clear session token', { cause });
  }
}
