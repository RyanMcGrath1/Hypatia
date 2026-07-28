/**
 * @vitest-environment jsdom
 */
import {
  createElement,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

const searchParams = vi.hoisted(() => ({
  token: undefined as string | string[] | undefined,
}));

const authMocks = vi.hoisted(() => ({
  isAuthenticated: false,
  clearSession: vi.fn(async () => {}),
}));

const accountApiMocks = vi.hoisted(() => {
  class AccountApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body: unknown = null,
    ) {
      super(message);
      this.name = 'AccountApiError';
    }
  }
  return {
    AccountApiError,
    verifyEmailChange: vi.fn(),
  };
});

vi.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => routerMocks.replace(...args),
  },
  useLocalSearchParams: () => ({ token: searchParams.token }),
}));

vi.mock('react-native', () => {
  const React = require('react') as typeof import('react');

  const View = ({
    children,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    accessibilityLabel?: string;
  }) =>
    React.createElement('div', { 'aria-label': accessibilityLabel }, children);

  const Text = ({
    children,
    accessibilityRole,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
  }) =>
    React.createElement('span', { role: accessibilityRole }, children);

  const Pressable = ({
    children,
    onPress,
    accessibilityRole,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    onPress?: () => void;
    accessibilityRole?: string;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        role: accessibilityRole ?? 'button',
        'aria-label': accessibilityLabel,
        onClick: () => onPress?.(),
      } as ButtonHTMLAttributes<HTMLButtonElement>,
      children,
    );

  const ActivityIndicator = () =>
    React.createElement('div', {
      role: 'progressbar',
      'aria-label': 'Loading',
    });

  return {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Platform: {
      OS: 'web',
      select: (spec: Record<string, unknown>) =>
        spec.web ?? spec.default ?? spec.native,
    },
  };
});

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

vi.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#1a1b23',
}));

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    token: authMocks.isAuthenticated ? 'session' : null,
    isRestoring: false,
    isAuthenticated: authMocks.isAuthenticated,
    isDevAuthBypass: false,
    canAccessApp: authMocks.isAuthenticated,
    establishSession: vi.fn(),
    replaceSession: vi.fn(),
    clearSession: authMocks.clearSession,
  }),
}));

vi.mock('@/hooks/api/accountApi', () => ({
  AccountApiError: accountApiMocks.AccountApiError,
  verifyEmailChange: accountApiMocks.verifyEmailChange,
}));

import VerifyEmailChangeScreen from '@/app/verify-email-change';
import { AppRoutes } from '@/constants/app/routes';

const FIXTURE_TOKEN = 'opaque_email_verify_fixture_token_abc';

function renderScreen() {
  return render(createElement(VerifyEmailChangeScreen));
}

describe('VerifyEmailChangeScreen', () => {
  beforeEach(() => {
    searchParams.token = undefined;
    authMocks.isAuthenticated = false;
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    accountApiMocks.verifyEmailChange.mockReset();
    routerMocks.replace.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('missing token shows invalid link and does not call API', async () => {
    searchParams.token = undefined;
    renderScreen();

    expect(screen.getByText('Invalid email verification link.')).toBeTruthy();
    expect(accountApiMocks.verifyEmailChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    // Direct /verify-email-change stays on this screen — no auto-redirect to Login.
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it('Log In button navigates to the canonical Login route', () => {
    searchParams.token = undefined;
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(routerMocks.replace).toHaveBeenCalledTimes(1);
    expect(routerMocks.replace).toHaveBeenCalledWith(AppRoutes.authLogin);
  });

  it('valid token verifies once with exact token and no Bearer Session', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockResolvedValueOnce({
      kind: 'pending',
      message: 'Email confirmation recorded',
    });

    renderScreen();

    await waitFor(() => {
      expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledTimes(1);
    });
    expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledWith({
      verificationToken: FIXTURE_TOKEN,
    });
    expect(authMocks.clearSession).not.toHaveBeenCalled();
    expect(document.body.innerHTML).not.toContain(FIXTURE_TOKEN);
  });

  it('shows loading state while verifying', async () => {
    searchParams.token = FIXTURE_TOKEN;
    let resolveVerify: (value: unknown) => void = () => {};
    accountApiMocks.verifyEmailChange.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );

    renderScreen();
    expect(screen.getByLabelText('Verifying email change')).toBeTruthy();

    await act(async () => {
      resolveVerify({
        kind: 'pending',
        message: 'Email confirmation recorded',
      });
    });
  });

  it('pending result does not clear Session and offers Profile when authenticated', async () => {
    authMocks.isAuthenticated = true;
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockResolvedValueOnce({
      kind: 'pending',
      message: 'Email confirmation recorded',
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Email confirmed')).toBeTruthy();
    });
    expect(
      screen.getByText(/One more confirmation is required/),
    ).toBeTruthy();
    expect(authMocks.clearSession).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Return to Profile' }),
    ).toBeTruthy();
  });

  it('completed result clears Session and shows re-login messaging', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockResolvedValueOnce({
      kind: 'completed',
      message: 'Email address changed successfully',
    });

    renderScreen();

    await waitFor(() => {
      expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Email changed successfully')).toBeTruthy();
    expect(
      screen.getByText(/Please log in again using your new email address/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    expect(document.body.innerHTML).not.toContain(FIXTURE_TOKEN);
  });

  it('treats clearSession failure after completion as still successful', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockResolvedValueOnce({
      kind: 'completed',
      message: 'Email address changed successfully',
    });
    authMocks.clearSession.mockRejectedValueOnce(
      new Error('Unable to clear session token'),
    );

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Email changed successfully')).toBeTruthy();
    });
    expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Please log in again using your new email address/),
    ).toBeTruthy();
  });

  it('invalid/expired token shows safe guidance without secrets', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockRejectedValueOnce(
      new accountApiMocks.AccountApiError(
        'Invalid or expired verification token',
        400,
      ),
    );

    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(/invalid or has expired/i),
      ).toBeTruthy();
    });
    expect(document.body.innerHTML).not.toContain(FIXTURE_TOKEN);
    expect(authMocks.clearSession).not.toHaveBeenCalled();
  });

  it('temporary failure allows Retry without persistent storage', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange
      .mockRejectedValueOnce(
        new accountApiMocks.AccountApiError('Service unavailable', 503),
      )
      .mockResolvedValueOnce({
        kind: 'pending',
        message: 'Email confirmation recorded',
      });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });

    await waitFor(() => {
      expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText(/One more confirmation is required/)).toBeTruthy();
  });

  it('does not duplicate automatic verify on remount with same token ref strategy', async () => {
    searchParams.token = FIXTURE_TOKEN;
    accountApiMocks.verifyEmailChange.mockResolvedValue({
      kind: 'pending',
      message: 'Email confirmation recorded',
    });

    const { rerender } = renderScreen();
    await waitFor(() => {
      expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledTimes(1);
    });

    rerender(createElement(VerifyEmailChangeScreen));
    await act(async () => {});
    expect(accountApiMocks.verifyEmailChange).toHaveBeenCalledTimes(1);
  });

  it('route source never persists verification token or uses Bearer', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/verify-email-change.tsx'),
      'utf8',
    );
    expect(source).toMatch(/clearSession/);
    expect(source).not.toMatch(/tokenStorage|SecureStore|setSessionToken/);
    expect(source).not.toMatch(/\bAuthorization\b/);
    expect(source).not.toMatch(/console\.(log|info|debug|warn|error)\([^)]*token/i);
  });

  it('root layout declares public verify route outside protected groups', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/_layout.tsx'),
      'utf8',
    );
    expect(source).toMatch(/verify-email-change/);
    expect(source).toMatch(/Stack\.Protected/);
    const verifyIndex = source.indexOf('verify-email-change');
    const firstProtected = source.indexOf('Stack.Protected');
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(verifyIndex).toBeLessThan(firstProtected);
  });

  it('app.json keeps hypatia scheme for deep links', () => {
    const appJson = JSON.parse(
      readFileSync(resolve(__dirname, '../../app.json'), 'utf8'),
    ) as { expo: { scheme: string } };
    expect(appJson.expo.scheme).toBe('hypatia');
  });
});
