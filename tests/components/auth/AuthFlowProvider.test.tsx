/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { AuthFlowProvider } from '@/components/auth/AuthFlowProvider';
import { useAuthFlow } from '@/hooks/useAuthFlow';

const CHALLENGE = 'opaque-mfa-challenge-token-AbC123';
const CHALLENGE_WITH_SPECIAL = 'chal_!@#-exact-preserve';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthFlowProvider>{children}</AuthFlowProvider>;
}

describe('AuthFlowProvider / useAuthFlow', () => {
  it('starts with a null pending TOTP challenge', () => {
    const { result } = renderHook(() => useAuthFlow(), { wrapper });
    expect(result.current.pendingTotpChallenge).toBeNull();
  });

  it('beginTotpLogin stores the challenge exactly in memory', () => {
    const { result } = renderHook(() => useAuthFlow(), { wrapper });

    act(() => {
      result.current.beginTotpLogin(CHALLENGE_WITH_SPECIAL);
    });

    expect(result.current.pendingTotpChallenge).toBe(CHALLENGE_WITH_SPECIAL);
  });

  it('clearTotpLogin removes the pending challenge', () => {
    const { result } = renderHook(() => useAuthFlow(), { wrapper });

    act(() => {
      result.current.beginTotpLogin(CHALLENGE);
    });
    expect(result.current.pendingTotpChallenge).toBe(CHALLENGE);

    act(() => {
      result.current.clearTotpLogin();
    });
    expect(result.current.pendingTotpChallenge).toBeNull();
  });

  it('throws clearly when useAuthFlow is used outside the provider', () => {
    expect(() => {
      renderHook(() => useAuthFlow());
    }).toThrow('useAuthFlow must be used within an AuthFlowProvider');
  });

  it('does not import SecureStore or tokenStorage (memory-only)', () => {
    const providerSource = readFileSync(
      resolve(__dirname, '../../../components/auth/AuthFlowProvider.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      resolve(__dirname, '../../../hooks/useAuthFlow.ts'),
      'utf8',
    );

    for (const source of [providerSource, hookSource]) {
      expect(source).not.toMatch(/from ['"]expo-secure-store['"]/);
      expect(source).not.toMatch(/from ['"][^'"]*tokenStorage['"]/);
      expect(source).not.toMatch(/from ['"][^'"]*async-storage['"]/i);
      expect(source).not.toMatch(/localStorage/);
      expect(source).not.toMatch(/sessionStorage/);
      expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
    }
  });

  it('does not touch AuthProvider session APIs', () => {
    const providerSource = readFileSync(
      resolve(__dirname, '../../../components/auth/AuthFlowProvider.tsx'),
      'utf8',
    );
    expect(providerSource).not.toMatch(/from ['"][^'"]*AuthProvider['"]/);
    expect(providerSource).not.toMatch(/establishSession/);
    expect(providerSource).not.toMatch(/setSessionToken/);
    expect(providerSource).not.toMatch(/getSessionToken/);
    expect(providerSource).not.toMatch(/Bearer/);
  });

  it('auth layout mounts AuthFlowProvider around auth screens only', () => {
    const layoutSource = readFileSync(
      resolve(__dirname, '../../../app/(auth)/_layout.tsx'),
      'utf8',
    );
    expect(layoutSource).toMatch(/AuthFlowProvider/);
    expect(layoutSource).toMatch(/login-totp/);

    const rootLayout = readFileSync(
      resolve(__dirname, '../../../app/_layout.tsx'),
      'utf8',
    );
    expect(rootLayout).not.toMatch(/AuthFlowProvider/);
  });
});
