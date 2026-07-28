/**
 * @vitest-environment jsdom
 */
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '@/constants/app/routes';

const authMocks = vi.hoisted(() => ({
  canAccessApp: false,
  isRestoring: false,
}));

const redirectMocks = vi.hoisted(() => ({
  lastHref: null as string | null,
}));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    redirectMocks.lastHref = href;
    return createElement('div', {
      'data-testid': 'redirect',
      'data-href': href,
    });
  },
}));

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    token: authMocks.canAccessApp && !authMocks.isRestoring ? 'session' : null,
    isRestoring: authMocks.isRestoring,
    isAuthenticated: authMocks.canAccessApp && !authMocks.isRestoring,
    isDevAuthBypass: false,
    canAccessApp: authMocks.canAccessApp,
    establishSession: vi.fn(),
    replaceSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

import RootIndexScreen from '@/app/index';

describe('RootIndexScreen', () => {
  afterEach(() => {
    cleanup();
    redirectMocks.lastHref = null;
  });

  beforeEach(() => {
    authMocks.canAccessApp = false;
    authMocks.isRestoring = false;
    redirectMocks.lastHref = null;
  });

  it('unauthenticated / redirects to Login, not verify-email-change', () => {
    authMocks.canAccessApp = false;
    authMocks.isRestoring = false;
    render(createElement(RootIndexScreen));

    expect(screen.getByTestId('redirect').getAttribute('data-href')).toBe(
      AppRoutes.authLogin,
    );
    expect(redirectMocks.lastHref).toBe(AppRoutes.authLogin);
    expect(redirectMocks.lastHref).not.toBe(AppRoutes.verifyEmailChange);
  });

  it('authenticated / redirects to protected app home', () => {
    authMocks.canAccessApp = true;
    authMocks.isRestoring = false;
    render(createElement(RootIndexScreen));

    expect(screen.getByTestId('redirect').getAttribute('data-href')).toBe(
      AppRoutes.tabsRoot,
    );
  });

  it('dev bypass / (canAccessApp true, no Session) redirects to app home', () => {
    // Screen only reads canAccessApp; bypass is already folded into that flag.
    authMocks.canAccessApp = true;
    authMocks.isRestoring = false;
    render(createElement(RootIndexScreen));

    expect(screen.getByTestId('redirect').getAttribute('data-href')).toBe(
      AppRoutes.tabsRoot,
    );
  });

  it('does not redirect while isRestoring is true', () => {
    authMocks.isRestoring = true;
    authMocks.canAccessApp = false;
    const { container } = render(createElement(RootIndexScreen));

    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(redirectMocks.lastHref).toBeNull();
    expect(container.childElementCount).toBe(0);
  });
});
