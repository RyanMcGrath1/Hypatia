/**
 * @vitest-environment jsdom
 */
import {
  createElement,
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION_TOKEN = 'opaque_session_tok_ProfileLogoutXyZ';

const authMocks = vi.hoisted(() => ({
  token: 'opaque_session_tok_ProfileLogoutXyZ' as string | null,
  isAuthenticated: true,
  isDevAuthBypass: false,
  replaceSession: vi.fn(async (_token: string) => {}),
  clearSession: vi.fn(async () => {}),
  establishSession: vi.fn(async () => {}),
}));

const authApiMocks = vi.hoisted(() => {
  class AuthApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body: unknown = null,
    ) {
      super(message);
      this.name = 'AuthApiError';
    }
  }
  return {
    AuthApiError,
    logout: vi.fn(),
  };
});

vi.mock('react-native', () => {
  const React = require('react') as typeof import('react');

  const View = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    testID,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    testID?: string;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': testID,
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-disabled': accessibilityState?.disabled ? true : undefined,
        'aria-busy': accessibilityState?.busy ? true : undefined,
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

  const TextInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
      onChangeText?: (text: string) => void;
      onSubmitEditing?: () => void;
      placeholderTextColor?: string;
      editable?: boolean;
      accessibilityLabel?: string;
      accessibilityState?: { disabled?: boolean };
      secureTextEntry?: boolean;
      textContentType?: string;
      autoComplete?: string;
      autoCapitalize?: string;
    }
  >(function MockTextInput(
    {
      onChangeText,
      onSubmitEditing,
      value,
      placeholder,
      editable = true,
      accessibilityLabel,
      accessibilityState,
      secureTextEntry,
      textContentType,
      autoComplete,
      autoCapitalize,
    },
    ref,
  ) {
    return React.createElement('input', {
      ref,
      value: value ?? '',
      placeholder,
      type: secureTextEntry ? 'password' : 'text',
      disabled: editable === false,
      'aria-label': accessibilityLabel,
      'aria-disabled':
        accessibilityState?.disabled || editable === false ? true : undefined,
      'data-text-content-type': textContentType,
      'data-autocomplete': autoComplete,
      'data-autocapitalize': autoCapitalize,
      'data-secure': secureTextEntry ? 'true' : 'false',
      onChange: (e: { target: { value: string } }) => {
        onChangeText?.(e.target.value);
      },
      onKeyDown: (e: { key: string }) => {
        if (e.key === 'Enter') {
          onSubmitEditing?.();
        }
      },
    });
  });

  const Pressable = ({
    children,
    onPress,
    disabled,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    testID,
  }: {
    children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
    onPress?: () => void;
    disabled?: boolean;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    testID?: string;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        disabled: !!disabled,
        role: accessibilityRole ?? 'button',
        'aria-label': accessibilityLabel,
        'aria-disabled':
          accessibilityState?.disabled || disabled ? true : undefined,
        'aria-busy': accessibilityState?.busy ? true : undefined,
        'data-testid': testID,
        onClick: () => {
          if (!disabled) {
            onPress?.();
          }
        },
      } as ButtonHTMLAttributes<HTMLButtonElement>,
      typeof children === 'function' ? children({ pressed: false }) : children,
    );

  const ScrollView = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll' }, children);

  const ActivityIndicator = () =>
    React.createElement('div', {
      role: 'progressbar',
      'aria-label': 'Loading',
    });

  const Modal = ({
    visible,
    children,
  }: {
    visible?: boolean;
    children?: ReactNode;
    onRequestClose?: () => void;
    transparent?: boolean;
    animationType?: string;
  }) =>
    visible
      ? React.createElement('div', { role: 'dialog', 'aria-modal': true }, children)
      : null;

  const KeyboardAvoidingView = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', null, children);

  return {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      hairlineWidth: 1,
      absoluteFillObject: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
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

vi.mock('@expo/vector-icons/Feather', () => {
  const React = require('react') as typeof import('react');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) =>
      React.createElement('span', { 'data-icon': name }),
  };
});

vi.mock('@/components/ui/Skeleton', () => {
  const React = require('react') as typeof import('react');
  return {
    Skeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }),
  };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    token: authMocks.token,
    isRestoring: false,
    isAuthenticated: authMocks.isAuthenticated,
    isDevAuthBypass: authMocks.isDevAuthBypass,
    canAccessApp: authMocks.isAuthenticated || authMocks.isDevAuthBypass,
    establishSession: authMocks.establishSession,
    replaceSession: authMocks.replaceSession,
    clearSession: authMocks.clearSession,
  }),
}));

vi.mock('@/hooks/api/authApi', () => ({
  AuthApiError: authApiMocks.AuthApiError,
  logout: authApiMocks.logout,
}));

vi.mock('@/hooks/api/accountApi', () => ({
  AccountApiError: class AccountApiError extends Error {
    status = 500;
    body = null;
  },
  changePassword: vi.fn(),
  requestEmailChange: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock('@/components/profile/ChangePasswordModal', () => ({
  ChangePasswordModal: () => null,
}));

vi.mock('@/components/profile/ChangeEmailModal', () => ({
  ChangeEmailModal: () => null,
}));

vi.mock('@/components/profile/TotpSetupModal', () => ({
  TotpSetupModal: () => null,
}));

vi.mock('@/components/profile/TotpDisableModal', () => ({
  TotpDisableModal: () => null,
}));

vi.mock('@/components/profile/DeleteAccountConfirmModal', () => ({
  DeleteAccountConfirmModal: () => null,
}));

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
import type { Profile } from '@/hooks/api/profileApi';

const SAMPLE_PROFILE: Profile = {
  firstName: 'Matthew',
  lastName: 'Thompson',
  dateJoined: '2026-07-23T12:00:00.000Z',
  email: 'matthew@example.com',
  passwordChangedAt: '2026-07-01T12:00:00.000Z',
  totpEnabled: true,
};

function renderProfile(
  overrides: Partial<{
    profile: Profile | null;
    hasAuthenticatedSession: boolean;
    isDevAuthBypass: boolean;
    isLoading: boolean;
    error: InstanceType<typeof ProfileApiError> | Error | null;
  }> = {},
) {
  render(
    createElement(ProfilePageContent, {
      isRestoring: false,
      isDevAuthBypass: overrides.isDevAuthBypass ?? false,
      profile:
        overrides.profile === undefined ? SAMPLE_PROFILE : overrides.profile,
      isLoading: overrides.isLoading ?? false,
      error: overrides.error ?? null,
      hasAuthenticatedSession: overrides.hasAuthenticatedSession ?? true,
      onRetry: vi.fn(),
      updatePersonalInfo: vi.fn(),
    }),
  );
}

function logOutButton() {
  return screen.getByRole('button', { name: 'Log Out' });
}

function pressLogOut() {
  fireEvent.click(logOutButton());
}

describe('Profile Logout', () => {
  beforeEach(() => {
    authMocks.token = SESSION_TOKEN;
    authMocks.isAuthenticated = true;
    authMocks.isDevAuthBypass = false;
    authMocks.replaceSession.mockReset();
    authMocks.replaceSession.mockResolvedValue(undefined);
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    authMocks.establishSession.mockReset();
    authApiMocks.logout.mockReset();
    authApiMocks.logout.mockResolvedValue({ message: 'Logout successful' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('basic UI', () => {
    it('shows Log Out for a real authenticated Profile, separate from Delete Account', () => {
      renderProfile();

      const logout = logOutButton();
      expect(logout).toBeTruthy();
      expect(screen.getByTestId('profile-logout-section')).toBeTruthy();

      const deleteSection = screen.getByTestId('profile-delete-account-section');
      expect(deleteSection).toBeTruthy();
      expect(
        within(deleteSection).queryByRole('button', { name: 'Log Out' }),
      ).toBeNull();
      expect(
        within(deleteSection).getByRole('button', { name: 'Delete Account' }),
      ).toBeTruthy();

      expect(logout.getAttribute('aria-label')).toBe('Log Out');
      expect(
        screen.getByText(
          /Deleting your account removes access to the account and its profile information/,
        ),
      ).toBeTruthy();
      expect(logout.textContent).not.toMatch(/delete/i);
      expect(screen.queryByText(/Log Out Everywhere/i)).toBeNull();
    });

    it('hides Log Out for bypass-only Profile and never calls logout', () => {
      authMocks.token = null;
      authMocks.isAuthenticated = false;
      authMocks.isDevAuthBypass = true;

      renderProfile({
        hasAuthenticatedSession: false,
        isDevAuthBypass: true,
        profile: null,
      });

      expect(screen.getByText('Development bypass active')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Log Out' })).toBeNull();
      expect(screen.queryByTestId('profile-logout-section')).toBeNull();
      expect(authApiMocks.logout).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('supplies the exact Session token, clears after success, and does not replace Session', async () => {
      renderProfile();
      pressLogOut();

      await waitFor(() => {
        expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      });

      expect(authApiMocks.logout).toHaveBeenCalledWith({
        token: SESSION_TOKEN,
      });
      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.establishSession).not.toHaveBeenCalled();
    });
  });

  describe('order of operations', () => {
    it('calls clearSession only after logout API resolves', async () => {
      let resolveLogout!: (value: { message: string }) => void;
      authApiMocks.logout.mockImplementation(
        () =>
          new Promise<{ message: string }>((resolve) => {
            resolveLogout = resolve;
          }),
      );

      renderProfile();
      pressLogOut();

      await waitFor(() => {
        expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      });
      expect(authMocks.clearSession).not.toHaveBeenCalled();

      await act(async () => {
        resolveLogout({ message: 'Logout successful' });
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('backend 401', () => {
    it('clears the unusable local Session without retrying logout', async () => {
      authApiMocks.logout.mockRejectedValueOnce(
        new authApiMocks.AuthApiError('Unauthorized', 401, {
          error: 'Authentication required',
        }),
      );

      renderProfile();
      pressLogOut();

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText('Unable to log out. Please try again.'),
      ).toBeNull();
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.establishSession).not.toHaveBeenCalled();
    });
  });

  describe('network / server failure', () => {
    it.each([
      {
        name: 'network failure',
        error: new TypeError('Network request failed'),
      },
      {
        name: '500',
        error: new authApiMocks.AuthApiError('Server error', 500),
      },
      {
        name: '503',
        error: new authApiMocks.AuthApiError('Unavailable', 503),
      },
    ])(
      'keeps Session and shows safe error on $name',
      async ({ error }) => {
        authApiMocks.logout.mockRejectedValueOnce(error);

        renderProfile();
        pressLogOut();

        await waitFor(() => {
          expect(
            screen.getByText('Unable to log out. Please try again.'),
          ).toBeTruthy();
        });
        expect(authMocks.clearSession).not.toHaveBeenCalled();
        expect(authApiMocks.logout).toHaveBeenCalledTimes(1);

        // Retry is available via another explicit press.
        authApiMocks.logout.mockResolvedValueOnce({
          message: 'Logout successful',
        });
        pressLogOut();
        await waitFor(() => {
          expect(authApiMocks.logout).toHaveBeenCalledTimes(2);
        });
        await waitFor(() => {
          expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
        });
      },
    );
  });

  describe('clearSession failure after backend success', () => {
    it('treats logout as completed, does not retry, and shows cleanup warning', async () => {
      authMocks.clearSession.mockRejectedValueOnce(
        new Error('SecureStore delete failed'),
      );

      renderProfile();
      pressLogOut();

      await waitFor(() => {
        expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(
          screen.getByText(
            /You were logged out, but this device had trouble clearing its saved session/,
          ),
        ).toBeTruthy();
      });

      expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.establishSession).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toContain(SESSION_TOKEN);
    });
  });

  describe('duplicate press', () => {
    it('issues only one logout request while pending', async () => {
      let resolveLogout!: (value: { message: string }) => void;
      authApiMocks.logout.mockImplementation(
        () =>
          new Promise<{ message: string }>((resolve) => {
            resolveLogout = resolve;
          }),
      );

      renderProfile();
      pressLogOut();
      pressLogOut();
      pressLogOut();

      await waitFor(() => {
        expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        resolveLogout({ message: 'Logout successful' });
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('dev bypass + real Session', () => {
    it('clears the real Session without modifying bypass itself', async () => {
      authMocks.isDevAuthBypass = true;
      authMocks.isAuthenticated = true;
      authMocks.token = SESSION_TOKEN;

      renderProfile({
        hasAuthenticatedSession: true,
        isDevAuthBypass: true,
        profile: SAMPLE_PROFILE,
      });

      expect(logOutButton()).toBeTruthy();
      pressLogOut();

      await waitFor(() => {
        expect(authApiMocks.logout).toHaveBeenCalledWith({
          token: SESSION_TOKEN,
        });
      });
      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });

      // Bypass flag is read-only from resolveDevAuthBypass — Logout must not
      // attempt to change env / disable it.
      expect(authMocks.isDevAuthBypass).toBe(true);
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.establishSession).not.toHaveBeenCalled();
    });
  });

  describe('security boundaries', () => {
    it('keeps Logout free of password/TOTP/storage and requires an explicit press', () => {
      const source = readFileSync(
        resolve(
          __dirname,
          '../../../components/profile/ProfileLogoutButton.tsx',
        ),
        'utf8',
      );
      const pageSource = readFileSync(
        resolve(
          __dirname,
          '../../../components/profile/ProfilePageContent.tsx',
        ),
        'utf8',
      );

      expect(source).toMatch(/logoutRequest|logout\(/);
      expect(source).toMatch(/clearSession/);
      expect(source).not.toMatch(/\breplaceSession\b|\bestablishSession\b/);
      expect(source).not.toMatch(
        /tokenStorage|SecureStore|setSessionToken|AsyncStorage|expo-secure-store/,
      );
      expect(source).not.toMatch(/currentPassword|totpCode|password/i);
      expect(source).not.toMatch(/deleteAccount/);
      expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
      expect(source).not.toMatch(/EXPO_PUBLIC_DEV_AUTH_BYPASS|resolveDevAuthBypass/);

      expect(pageSource).toMatch(/ProfileLogoutButton/);
      expect(pageSource).toMatch(/hasAuthenticatedSession \? <ProfileLogoutButton/);

      renderProfile();
      expect(authApiMocks.logout).not.toHaveBeenCalled();
      pressLogOut();
      expect(authApiMocks.logout).toHaveBeenCalledTimes(1);
    });

    it('never renders the Session token', async () => {
      renderProfile();
      pressLogOut();

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalled();
      });

      expect(document.body.textContent).not.toContain(SESSION_TOKEN);
      expect(document.body.innerHTML).not.toContain(SESSION_TOKEN);
      expect(document.body.textContent).not.toMatch(/\bBearer\b/);
    });
  });
});
