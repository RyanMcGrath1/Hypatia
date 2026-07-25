/**
 * Tiny bridge between the HTTP client and AuthProvider.
 *
 * When an authenticated Bearer request receives HTTP 401, the transport layer
 * notifies subscribers with an opaque token fingerprint only — never the raw
 * Session token, Authorization header, or request body.
 *
 * AuthProvider compares the fingerprint to its current Session and clears only
 * on match, so a late 401 for a rotated-away token cannot wipe the replacement.
 */

export type SessionInvalidationEvent = {
  /** SHA-256 hex digest of the rejected Bearer token (correlation only). */
  tokenFingerprint: string;
};

export type SessionInvalidationListener = (
  event: SessionInvalidationEvent,
) => void;

const listeners = new Set<SessionInvalidationListener>();

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Opaque one-way fingerprint of a Session token for stale-401 correlation.
 * Not an authentication secret; never log or persist.
 */
export async function fingerprintSessionToken(token: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('SubtleCrypto is unavailable for session correlation');
  }
  const digest = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return bytesToHex(new Uint8Array(digest));
}

/** Subscribe to authenticated-session invalidation. Returns unsubscribe. */
export function subscribeToSessionInvalidation(
  listener: SessionInvalidationListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify that a Bearer-authenticated request was rejected with HTTP 401.
 * Payload must never include the raw token or request credentials.
 */
export function notifySessionInvalidated(
  event: SessionInvalidationEvent,
): void {
  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * Fingerprint the rejected Bearer token and notify subscribers.
 * Failures are swallowed so transport error handling is unaffected.
 */
export async function notifyAuthenticatedSessionRejected(
  bearerToken: string,
): Promise<void> {
  try {
    const tokenFingerprint = await fingerprintSessionToken(bearerToken);
    notifySessionInvalidated({ tokenFingerprint });
  } catch {
    // Correlation failure must not break HttpApiError delivery.
  }
}

/**
 * Test-only: drop all listeners so parallel Vitest files cannot cross-notify.
 * Not for production use.
 */
export function clearSessionInvalidationListenersForTests(): void {
  listeners.clear();
}
