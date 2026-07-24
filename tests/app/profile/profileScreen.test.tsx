/**
 * @vitest-environment jsdom
 */
import {
  createElement,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  const React = require('react') as typeof import('react');

  const View = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    testID,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    testID?: string;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': testID,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
      },
      children,
    );

  const Text = ({
    children,
    accessibilityRole,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    style?: unknown;
  }) =>
    React.createElement(
      'span',
      {
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
      },
      children,
    );

  const ScrollView = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll' }, children);

  const Pressable = ({
    children,
    onPress,
    accessibilityRole,
    accessibilityLabel,
  }: {
    children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
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
      typeof children === 'function' ? children({ pressed: false }) : children,
    );

  return {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      hairlineWidth: 1,
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

vi.mock('@/components/ui/Skeleton', () => {
  const React = require('react') as typeof import('react');
  return {
    Skeleton: ({ width, height }: { width?: unknown; height?: number }) =>
      React.createElement('div', {
        'data-testid': 'skeleton',
        'data-width': String(width),
        'data-height': String(height),
      }),
  };
});

const { ProfileApiError } = vi.hoisted(() => {
  class ProfileApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body: unknown = null,
    ) {
      super(message);
      this.name = 'ProfileApiError';
    }
  }
  return { ProfileApiError };
});

vi.mock('@/hooks/api/profileApi', () => ({
  ProfileApiError,
}));

import { ProfilePageContent } from '@/components/profile/ProfilePageContent';
import { PROFILE_PASSWORD_MASK } from '@/components/profile/ProfileSecuritySection';

const SAMPLE_PROFILE = {
  firstName: 'Matthew',
  lastName: 'Thompson',
  dateJoined: '2026-07-23T12:00:00.000Z',
  email: 'matthew@example.com',
  passwordChangedAt: '2026-07-01T12:00:00.000Z' as string | null,
  totpEnabled: true,
};

function renderPage(
  overrides: Partial<{
    isRestoring: boolean;
    isDevAuthBypass: boolean;
    profile: typeof SAMPLE_PROFILE | null;
    isLoading: boolean;
    error: InstanceType<typeof ProfileApiError> | Error | null;
    hasAuthenticatedSession: boolean;
    onRetry: () => void;
  }> = {},
) {
  const onRetry = overrides.onRetry ?? vi.fn();
  render(
    createElement(ProfilePageContent, {
      isRestoring: overrides.isRestoring ?? false,
      isDevAuthBypass: overrides.isDevAuthBypass ?? false,
      profile: overrides.profile === undefined ? null : overrides.profile,
      isLoading: overrides.isLoading ?? false,
      error: overrides.error ?? null,
      hasAuthenticatedSession: overrides.hasAuthenticatedSession ?? false,
      onRetry,
    }),
  );
  return { onRetry };
}

describe('ProfilePageContent', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('loading', () => {
    it('renders skeleton structure without Profile field values', () => {
      renderPage({
        hasAuthenticatedSession: true,
        isLoading: true,
        profile: null,
      });

      expect(screen.getByLabelText('Loading profile')).toBeTruthy();
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
      expect(screen.queryByText('Matthew')).toBeNull();
      expect(screen.queryByText('undefined')).toBeNull();
      expect(screen.queryByText('First Name')).toBeNull();
    });
  });

  describe('loaded profile', () => {
    it('renders Personal Information, Account, and Security from Profile', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });

      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.getByText('Personal Information')).toBeTruthy();
      expect(screen.getByText('Account')).toBeTruthy();
      expect(screen.getByText('Security')).toBeTruthy();

      expect(screen.getByText('Matthew')).toBeTruthy();
      expect(screen.getByText('Thompson')).toBeTruthy();
      expect(screen.getByText('matthew@example.com')).toBeTruthy();
      expect(screen.getByText(PROFILE_PASSWORD_MASK)).toBeTruthy();
      expect(screen.getByText('Enabled')).toBeTruthy();

      expect(screen.getByLabelText(/Date Joined:.*July 23, 2026/)).toBeTruthy();
      expect(screen.getByLabelText(/Last Changed:.*July 1, 2026/)).toBeTruthy();
    });

    it('shows Disabled when totpEnabled is false', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: { ...SAMPLE_PROFILE, totpEnabled: false },
      });

      expect(screen.getByText('Disabled')).toBeTruthy();
      expect(screen.queryByText('Enabled')).toBeNull();
    });

    it('shows Not available when passwordChangedAt is null', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: { ...SAMPLE_PROFILE, passwordChangedAt: null },
      });

      expect(screen.getByText('Not available')).toBeTruthy();
      expect(screen.queryByLabelText(/Last Changed:.*July/)).toBeNull();
    });
  });

  describe('security boundaries', () => {
    it('does not render user id, session token, password hash, or TOTP secret', () => {
      const { container } = render(
        createElement(ProfilePageContent, {
          isRestoring: false,
          isDevAuthBypass: false,
          profile: SAMPLE_PROFILE,
          isLoading: false,
          error: null,
          hasAuthenticatedSession: true,
          onRetry: vi.fn(),
        }),
      );
      const html = container.innerHTML;

      expect(html).not.toContain('user_id');
      expect(html).not.toContain('password_hash');
      expect(html).not.toContain('totp_secret');
      expect(html).not.toContain('otpauth://');
      expect(html).not.toMatch(/\bBearer\b/);
    });
  });

  describe('dev bypass only', () => {
    it('shows developer notice and no fake account fields', () => {
      renderPage({
        isDevAuthBypass: true,
        hasAuthenticatedSession: false,
        profile: null,
        isLoading: false,
      });

      expect(screen.getByText('Development bypass active')).toBeTruthy();
      expect(
        screen.getByText(
          /Profile account data is unavailable while using the development authentication bypass/,
        ),
      ).toBeTruthy();
      expect(screen.queryByText('First Name')).toBeNull();
      expect(screen.queryByText('Matthew')).toBeNull();
      expect(screen.queryByText('matthew@example.com')).toBeNull();
    });
  });

  describe('initial error', () => {
    it('shows error notice and Retry calls onRetry', () => {
      const { onRetry } = renderPage({
        hasAuthenticatedSession: true,
        profile: null,
        error: new ProfileApiError('boom', 500),
        isLoading: false,
      });

      expect(screen.getByText('Unable to load profile')).toBeTruthy();
      expect(
        screen.getByText("We couldn't load your account information."),
      ).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh error with existing profile', () => {
    it('keeps Profile visible and shows a non-destructive warning', () => {
      const { onRetry } = renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        error: new ProfileApiError('Service unavailable', 503),
      });

      expect(screen.getByText('Matthew')).toBeTruthy();
      expect(screen.getByText("Couldn't refresh profile")).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('401', () => {
    it('shows a safe session message without Login navigation controls', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: null,
        error: new ProfileApiError('Unauthorized', 401),
      });

      expect(
        screen.getByText(/Your session may no longer be valid/),
      ).toBeTruthy();
      expect(screen.queryByText('Log In')).toBeNull();
      expect(screen.queryByText('Login')).toBeNull();
    });
  });

  describe('read-only baseline', () => {
    it('does not introduce edit/change/delete/logout controls', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });

      expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /change/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /logout/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /log out/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /enable/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /disable/i })).toBeNull();
    });
  });
});

describe('Profile route wiring', () => {
  it('keeps the route thin and does not call updatePersonalInfo / clearSession', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(app)/(tabs)/profile.tsx'),
      'utf8',
    );
    expect(source).toMatch(/useProfile/);
    expect(source).toMatch(/ProfilePageContent/);
    expect(source).toMatch(/refresh/);
    expect(source).not.toMatch(/updatePersonalInfo/);
    expect(source).not.toMatch(/clearSession/);
    expect(source).not.toMatch(/logout\(/);
  });

  it('does not invent fake developer Profile data in page content', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../components/profile/ProfilePageContent.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/firstName:\s*['"]Developer['"]/);
    expect(source).not.toMatch(/fake/i);
  });
});
