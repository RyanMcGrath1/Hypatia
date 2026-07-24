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
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  token: 'opaque_session_tok_ProfileChangePw',
  replaceSession: vi.fn(async (_token: string) => {}),
  clearSession: vi.fn(async () => {}),
  establishSession: vi.fn(async () => {}),
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
    changePassword: vi.fn(),
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
    onRequestClose,
  }: {
    visible?: boolean;
    children?: ReactNode;
    onRequestClose?: () => void;
    transparent?: boolean;
    animationType?: string;
  }) =>
    visible
      ? React.createElement(
          'div',
          {
            role: 'dialog',
            'aria-modal': true,
            'data-testid': 'change-password-modal',
          },
          children,
          React.createElement('button', {
            type: 'button',
            'aria-label': 'Hardware back',
            onClick: () => onRequestClose?.(),
          }),
        )
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
    isAuthenticated: true,
    isDevAuthBypass: false,
    canAccessApp: true,
    establishSession: authMocks.establishSession,
    replaceSession: authMocks.replaceSession,
    clearSession: authMocks.clearSession,
  }),
}));

vi.mock('@/hooks/api/accountApi', () => ({
  AccountApiError: accountApiMocks.AccountApiError,
  changePassword: accountApiMocks.changePassword,
}));

vi.mock('@/components/profile/TotpSetupModal', () => ({
  TotpSetupModal: () => null,
}));

vi.mock('@/components/profile/TotpDisableModal', () => ({
  TotpDisableModal: () => null,
}));

vi.mock('@/components/profile/ChangeEmailModal', () => ({
  ChangeEmailModal: () => null,
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

const REPLACEMENT_TOKEN = 'opaque_session_tok_ReplacementXyZ789';
const CURRENT_PW = 'validpassword12';
const NEW_PW = 'brandnewpassword1';

function renderProfile(
  overrides: Partial<{
    profile: Profile | null;
    hasAuthenticatedSession: boolean;
    isDevAuthBypass: boolean;
  }> = {},
) {
  render(
    createElement(ProfilePageContent, {
      isRestoring: false,
      isDevAuthBypass: overrides.isDevAuthBypass ?? false,
      profile:
        overrides.profile === undefined ? SAMPLE_PROFILE : overrides.profile,
      isLoading: false,
      error: null,
      hasAuthenticatedSession: overrides.hasAuthenticatedSession ?? true,
      onRetry: vi.fn(),
      updatePersonalInfo: vi.fn(),
    }),
  );
}

function openChangePassword() {
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

function fillPasswords(opts: {
  current?: string;
  next?: string;
  confirm?: string;
}) {
  if (opts.current !== undefined) {
    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: opts.current },
    });
  }
  if (opts.next !== undefined) {
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: opts.next },
    });
  }
  if (opts.confirm !== undefined) {
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: opts.confirm },
    });
  }
}

function submitChangePassword() {
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
}

describe('Change Password', () => {
  beforeEach(() => {
    authMocks.token = 'opaque_session_tok_ProfileChangePw';
    authMocks.replaceSession.mockReset();
    authMocks.replaceSession.mockResolvedValue(undefined);
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    authMocks.establishSession.mockReset();
    accountApiMocks.changePassword.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Security section action', () => {
    it('shows Change for Password only when authenticated', () => {
      renderProfile();

      expect(
        screen.getByRole('button', { name: 'Change password' }),
      ).toBeTruthy();
      expect(screen.getByText('Last Changed')).toBeTruthy();
      // Authenticator Disable is present when totpEnabled (covered by totpDisable tests).
      expect(
        screen.getByRole('button', { name: 'Disable authenticator app' }),
      ).toBeTruthy();
    });

    it('hides Change Password when there is no authenticated Profile', () => {
      renderProfile({
        hasAuthenticatedSession: false,
        isDevAuthBypass: true,
        profile: null,
      });

      expect(
        screen.queryByRole('button', { name: 'Change password' }),
      ).toBeNull();
      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('modal render / validation', () => {
    it('opens with three blank password fields and Cancel', () => {
      renderProfile();
      openChangePassword();

      expect(screen.getByTestId('change-password-modal')).toBeTruthy();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('New Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Confirm New Password') as HTMLInputElement)
          .value,
      ).toBe('');
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Change Password' }),
      ).toBeTruthy();

      const current = screen.getByLabelText('Current Password');
      expect(current.getAttribute('data-text-content-type')).toBe('password');
      expect(current.getAttribute('data-autocomplete')).toBe(
        'current-password',
      );
      const next = screen.getByLabelText('New Password');
      expect(next.getAttribute('data-text-content-type')).toBe('newPassword');
      expect(next.getAttribute('data-autocomplete')).toBe('new-password');
    });

    it('rejects missing / short / mismatched passwords without API call', async () => {
      renderProfile();
      openChangePassword();

      await act(async () => {
        submitChangePassword();
      });
      expect(screen.getByText('Current password is required.')).toBeTruthy();
      expect(screen.getByText('New password is required.')).toBeTruthy();
      expect(
        screen.getByText('Confirm new password is required.'),
      ).toBeTruthy();
      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();

      fillPasswords({ current: CURRENT_PW, next: 'short', confirm: 'short' });
      await act(async () => {
        submitChangePassword();
      });
      expect(
        screen.getByText('Password must be at least 15 characters.'),
      ).toBeTruthy();
      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();

      fillPasswords({
        current: CURRENT_PW,
        next: 'a'.repeat(15),
        confirm: 'b'.repeat(15),
      });
      await act(async () => {
        submitChangePassword();
      });
      expect(screen.getByText('Passwords do not match.')).toBeTruthy();
      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();
    });

    it('accepts exactly 15 characters and allows spaces (exact match)', async () => {
      accountApiMocks.changePassword.mockResolvedValueOnce({
        message: 'Password changed successfully',
        sessionToken: REPLACEMENT_TOKEN,
        passwordChangedAt: '2026-07-24T15:30:00+00:00',
      });
      renderProfile();
      openChangePassword();

      const spaced = ' fifteen chars ';
      fillPasswords({
        current: CURRENT_PW,
        next: spaced,
        confirm: spaced,
      });
      await act(async () => {
        submitChangePassword();
      });

      expect(accountApiMocks.changePassword).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: CURRENT_PW,
        newPassword: spaced,
        confirmNewPassword: spaced,
      });
    });

    it('rejects confirm that differs only by trailing space', async () => {
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: 'correct horse battery',
        confirm: 'correct horse battery ',
      });
      await act(async () => {
        submitChangePassword();
      });
      expect(screen.getByText('Passwords do not match.')).toBeTruthy();
      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('sends exact passwords with the current Session token once', async () => {
      let resolveChange: (value: unknown) => void = () => {};
      accountApiMocks.changePassword.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveChange = resolve;
          }),
      );
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: NEW_PW,
        confirm: NEW_PW,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
      fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

      expect(accountApiMocks.changePassword).toHaveBeenCalledTimes(1);
      expect(accountApiMocks.changePassword).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: CURRENT_PW,
        newPassword: NEW_PW,
        confirmNewPassword: NEW_PW,
      });

      await act(async () => {
        resolveChange({
          message: 'Password changed successfully',
          sessionToken: REPLACEMENT_TOKEN,
          passwordChangedAt: '2026-07-24T15:30:00+00:00',
        });
      });
    });
  });

  describe('success + token rotation', () => {
    it('calls replaceSession, closes modal, shows success, and does not invent Last Changed', async () => {
      accountApiMocks.changePassword.mockResolvedValueOnce({
        message: 'Password changed successfully',
        sessionToken: REPLACEMENT_TOKEN,
        passwordChangedAt: '2026-07-24T15:30:00+00:00',
      });
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: NEW_PW,
        confirm: NEW_PW,
      });

      await act(async () => {
        submitChangePassword();
      });

      await waitFor(() => {
        expect(authMocks.replaceSession).toHaveBeenCalledWith(
          REPLACEMENT_TOKEN,
        );
      });
      expect(authMocks.establishSession).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.queryByTestId('change-password-modal')).toBeNull();
      expect(screen.getByText('Password changed successfully.')).toBeTruthy();
      expect(screen.getByLabelText(/Last Changed:.*July 1, 2026/)).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
      expect(document.body.innerHTML).not.toContain(NEW_PW);
    });
  });

  describe('normal API failure', () => {
    it('keeps modal open, preserves draft, and does not rotate Session', async () => {
      accountApiMocks.changePassword.mockRejectedValueOnce(
        new accountApiMocks.AccountApiError(
          'Current password is incorrect',
          400,
        ),
      );
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: 'wrongpassword12',
        next: NEW_PW,
        confirm: NEW_PW,
      });

      await act(async () => {
        submitChangePassword();
      });

      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('change-password-modal')).toBeTruthy();
      expect(screen.getByText('Current password is incorrect')).toBeTruthy();
      expect(
        (screen.getByLabelText('New Password') as HTMLInputElement).value,
      ).toBe(NEW_PW);

      accountApiMocks.changePassword.mockResolvedValueOnce({
        message: 'Password changed successfully',
        sessionToken: REPLACEMENT_TOKEN,
        passwordChangedAt: '2026-07-24T15:30:00+00:00',
      });
      await act(async () => {
        submitChangePassword();
      });
      expect(accountApiMocks.changePassword).toHaveBeenCalledTimes(2);
    });

    it('shows session message on 401 without clearSession', async () => {
      accountApiMocks.changePassword.mockRejectedValueOnce(
        new accountApiMocks.AccountApiError('Authentication required', 401),
      );
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: NEW_PW,
        confirm: NEW_PW,
      });

      await act(async () => {
        submitChangePassword();
      });

      expect(
        screen.getByText(
          'Your password could not be changed with the current session.',
        ),
      ).toBeTruthy();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(screen.queryByText('Log In')).toBeNull();
    });
  });

  describe('replacement storage failure', () => {
    it('clears Session, clears passwords, and surfaces re-login messaging', async () => {
      accountApiMocks.changePassword.mockResolvedValueOnce({
        message: 'Password changed successfully',
        sessionToken: REPLACEMENT_TOKEN,
        passwordChangedAt: '2026-07-24T15:30:00+00:00',
      });
      authMocks.replaceSession.mockRejectedValueOnce(
        new Error('Unable to store session token'),
      );

      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: NEW_PW,
        confirm: NEW_PW,
      });

      await act(async () => {
        submitChangePassword();
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(accountApiMocks.changePassword).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('change-password-modal')).toBeNull();
      expect(
        screen.getByText(
          /password was changed, but this device could not save your new login session/i,
        ),
      ).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
      expect(document.body.innerHTML).not.toContain(NEW_PW);
    });
  });

  describe('cancel', () => {
    it('closes without API call and reopens blank', () => {
      renderProfile();
      openChangePassword();
      fillPasswords({
        current: CURRENT_PW,
        next: NEW_PW,
        confirm: 'mismatch',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(accountApiMocks.changePassword).not.toHaveBeenCalled();
      expect(screen.queryByTestId('change-password-modal')).toBeNull();

      openChangePassword();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('New Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Confirm New Password') as HTMLInputElement)
          .value,
      ).toBe('');
      expect(screen.queryByText('Passwords do not match.')).toBeNull();
    });
  });

  describe('security boundaries', () => {
    it('keeps Change Password wiring free of direct tokenStorage / establishSession', () => {
      const modalSource = readFileSync(
        resolve(
          __dirname,
          '../../../components/profile/ChangePasswordModal.tsx',
        ),
        'utf8',
      );
      expect(modalSource).toMatch(/replaceSession/);
      expect(modalSource).not.toMatch(/establishSession/);
      expect(modalSource).not.toMatch(/tokenStorage|SecureStore|setSessionToken/);
      expect(modalSource).not.toMatch(/passwordChangedAt\s*=/);
    });
  });
});
