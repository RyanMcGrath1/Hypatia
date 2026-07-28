import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearSessionInvalidationListenersForTests,
  fingerprintSessionToken,
  notifyAuthenticatedSessionRejected,
  notifySessionInvalidated,
  subscribeToSessionInvalidation,
} from '@/lib/auth/sessionInvalidation';

const TOKEN_A = 'opaque_session_tok_A_invalidation';
const TOKEN_B = 'opaque_session_tok_B_invalidation';

describe('sessionInvalidation', () => {
  afterEach(() => {
    clearSessionInvalidationListenersForTests();
    vi.restoreAllMocks();
  });

  it('fingerprints are stable, distinct, and not the raw token', async () => {
    const fpA1 = await fingerprintSessionToken(TOKEN_A);
    const fpA2 = await fingerprintSessionToken(TOKEN_A);
    const fpB = await fingerprintSessionToken(TOKEN_B);

    expect(fpA1).toBe(fpA2);
    expect(fpA1).not.toBe(fpB);
    expect(fpA1).not.toContain(TOKEN_A);
    expect(fpA1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('notifies subscribers with fingerprint only', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(listener);

    notifySessionInvalidated({ tokenFingerprint: 'abc123' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ tokenFingerprint: 'abc123' });

    unsubscribe();
    notifySessionInvalidated({ tokenFingerprint: 'def456' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifyAuthenticatedSessionRejected fingerprints then notifies', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(listener);
    const expected = await fingerprintSessionToken(TOKEN_A);

    await notifyAuthenticatedSessionRejected(TOKEN_A);

    expect(listener).toHaveBeenCalledWith({ tokenFingerprint: expected });
    const payload = JSON.stringify(listener.mock.calls[0]?.[0]);
    expect(payload).not.toContain(TOKEN_A);

    unsubscribe();
  });
});
