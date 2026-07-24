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

const authMocks = vi.hoisted(() => ({
  token: 'opaque_session_tok_ProfileDeleteAccount',
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
    deleteAccount: vi.fn(),
    changePassword: vi.fn(),
    requestEmailChange: vi.fn(),
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
            'data-testid': 'delete-account-dialog',
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
  deleteAccount: accountApiMocks.deleteAccount,
  changePassword: accountApiMocks.changePassword,
  requestEmailChange: accountApiMocks.requestEmailChange,
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
  totpEnabled: false,
};

const CURRENT_PW = 'validpassword12';

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

function openDeleteAccount() {
  const section = screen.getByTestId('profile-delete-account-section');
  fireEvent.click(
    within(section).getByRole('button', { name: 'Delete Account' }),
  );
}

function fillDelete(opts: {
  current?: string;
  code?: string;
  confirmation?: string;
}) {
  if (opts.current !== undefined) {
    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: opts.current },
    });
  }
  if (opts.code !== undefined) {
    fireEvent.change(screen.getByLabelText('Authenticator Code'), {
      target: { value: opts.code },
    });
  }
  if (opts.confirmation !== undefined) {
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: opts.confirmation },
    });
  }
}

function modalDeleteButton() {
  const modal = screen.getByTestId('delete-account-modal');
  return within(modal).getByRole('button', { name: 'Delete Account' });
}

function submitDelete() {
  fireEvent.click(modalDeleteButton());
}

describe('Delete Account', () => {
  beforeEach(() => {
    authMocks.token = 'opaque_session_tok_ProfileDeleteAccount';
    authMocks.replaceSession.mockReset();
    authMocks.replaceSession.mockResolvedValue(undefined);
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    authMocks.establishSession.mockReset();
    accountApiMocks.deleteAccount.mockReset();
    accountApiMocks.deleteAccount.mockResolvedValue({
      message: 'Your account has been deleted',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Account section', () => {
    it('shows a destructive Delete Account action separate from Email Change', () => {
      renderProfile();

      expect(screen.getByText('Account')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Change email' }),
      ).toBeTruthy();
      const section = screen.getByTestId('profile-delete-account-section');
      expect(section).toBeTruthy();
      expect(section.textContent).toContain('Delete Account');
      expect(
        screen.getByText(
          /Deleting your account removes access to the account and its profile information/,
        ),
      ).toBeTruthy();
      expect(
        within(section).getByRole('button', { name: 'Delete Account' }),
      ).toBeTruthy();
    });

    it('hides Delete Account for bypass-only Profile', () => {
      renderProfile({
        hasAuthenticatedSession: false,
        isDevAuthBypass: true,
        profile: null,
      });

      expect(
        screen.queryByTestId('profile-delete-account-section'),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Delete Account' }),
      ).toBeNull();
      expect(accountApiMocks.deleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('modal without TOTP', () => {
    it('opens with Current Password, confirmation, Cancel, and no Authenticator Code', () => {
      renderProfile();
      openDeleteAccount();

      expect(screen.getByTestId('delete-account-modal')).toBeTruthy();
      expect(screen.getByLabelText('Current Password')).toBeTruthy();
      expect(screen.getByLabelText('Type DELETE to confirm')).toBeTruthy();
      expect(screen.queryByLabelText('Authenticator Code')).toBeNull();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(modalDeleteButton()).toBeTruthy();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Type DELETE to confirm') as HTMLInputElement)
          .value,
      ).toBe('');
    });

    it('keeps Delete Account disabled until password and exact DELETE are present', () => {
      renderProfile();
      openDeleteAccount();

      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ current: CURRENT_PW });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ confirmation: 'delete' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ confirmation: ' DELETE' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ confirmation: 'DELETE ' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ confirmation: 'DELETE' });
      expect(modalDeleteButton()).toHaveProperty('disabled', false);
    });

    it('submits exact password and confirmation without totpCode', async () => {
      renderProfile();
      openDeleteAccount();
      fillDelete({
        current: '  spaced password  ',
        confirmation: 'DELETE',
      });

      await act(async () => {
        submitDelete();
      });

      expect(accountApiMocks.deleteAccount).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: '  spaced password  ',
        confirmation: 'DELETE',
      });
      const call = accountApiMocks.deleteAccount.mock.calls[0]![0] as Record<
        string,
        unknown
      >;
      expect(call).not.toHaveProperty('totpCode');
    });
  });

  describe('modal with TOTP', () => {
    it('renders Authenticator Code and requires a valid 6-digit code', async () => {
      renderProfile({
        profile: { ...SAMPLE_PROFILE, totpEnabled: true },
      });
      openDeleteAccount();

      expect(screen.getByLabelText('Authenticator Code')).toBeTruthy();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ code: '' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ code: '12345' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ code: 'abcdef' });
      expect(modalDeleteButton()).toHaveProperty('disabled', true);

      fillDelete({ code: '012345' });
      expect(modalDeleteButton()).toHaveProperty('disabled', false);

      await act(async () => {
        submitDelete();
      });

      expect(accountApiMocks.deleteAccount).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: CURRENT_PW,
        confirmation: 'DELETE',
        totpCode: '012345',
      });
    });
  });

  describe('success', () => {
    it('calls clearSession only, clears credentials, and does not retry DELETE', async () => {
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });

      await act(async () => {
        submitDelete();
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.establishSession).not.toHaveBeenCalled();
      expect(accountApiMocks.deleteAccount).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('delete-account-modal')).toBeNull();
      expect(document.body.innerHTML).not.toContain(authMocks.token);
      expect(document.body.innerHTML).not.toContain(CURRENT_PW);
    });
  });

  describe('clearSession failure after successful delete', () => {
    it('treats deletion as successful and does not retry DELETE', async () => {
      authMocks.clearSession.mockRejectedValueOnce(
        new Error('Unable to clear session token'),
      );
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });

      await act(async () => {
        submitDelete();
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(accountApiMocks.deleteAccount).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('delete-account-modal')).toBeNull();
      expect(
        screen.getByText(
          /Your account was deleted, but this device had trouble clearing its saved login information/,
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/Unable to delete your account/i)).toBeNull();
      expect(document.body.innerHTML).not.toContain(authMocks.token);
    });
  });

  describe('normal API failure', () => {
    it('keeps modal open and Session intact on incorrect password', async () => {
      accountApiMocks.deleteAccount.mockRejectedValueOnce(
        new accountApiMocks.AccountApiError(
          'Current password is incorrect',
          400,
        ),
      );
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: 'wrongpassword12', confirmation: 'DELETE' });

      await act(async () => {
        submitDelete();
      });

      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('delete-account-modal')).toBeTruthy();
      expect(screen.getByText('Current password is incorrect.')).toBeTruthy();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('wrongpassword12');

      accountApiMocks.deleteAccount.mockResolvedValueOnce({
        message: 'Your account has been deleted',
      });
      fillDelete({ current: CURRENT_PW });
      await act(async () => {
        submitDelete();
      });
      expect(accountApiMocks.deleteAccount).toHaveBeenCalledTimes(2);
    });

    it('surfaces invalid TOTP without clearing Session', async () => {
      accountApiMocks.deleteAccount.mockRejectedValueOnce(
        new accountApiMocks.AccountApiError('Invalid authenticator code', 400),
      );
      renderProfile({
        profile: { ...SAMPLE_PROFILE, totpEnabled: true },
      });
      openDeleteAccount();
      fillDelete({
        current: CURRENT_PW,
        code: '000000',
        confirmation: 'DELETE',
      });

      await act(async () => {
        submitDelete();
      });

      expect(screen.getByText('Invalid authenticator code.')).toBeTruthy();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('delete-account-modal')).toBeTruthy();
    });

    it('shows session message on 401 without clearSession', async () => {
      accountApiMocks.deleteAccount.mockRejectedValueOnce(
        new accountApiMocks.AccountApiError('Authentication required', 401),
      );
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });

      await act(async () => {
        submitDelete();
      });

      expect(
        screen.getByText(
          'Your account could not be deleted with the current session.',
        ),
      ).toBeTruthy();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
    });

    it('surfaces generic/network failure without clearing Session', async () => {
      accountApiMocks.deleteAccount.mockRejectedValueOnce(
        new Error('network down'),
      );
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });

      await act(async () => {
        submitDelete();
      });

      expect(
        screen.getByText('Unable to delete your account. Please try again.'),
      ).toBeTruthy();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('delete-account-modal')).toBeTruthy();
    });
  });

  describe('duplicate submission', () => {
    it('fires only one DELETE while a request is in flight', async () => {
      let resolveDelete: (value: unknown) => void = () => {};
      accountApiMocks.deleteAccount.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve;
          }),
      );
      renderProfile();
      openDeleteAccount();
      fillDelete({ current: CURRENT_PW, confirmation: 'DELETE' });

      fireEvent.click(modalDeleteButton());
      fireEvent.click(modalDeleteButton());

      expect(accountApiMocks.deleteAccount).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveDelete({ message: 'Your account has been deleted' });
      });
    });
  });

  describe('cancel', () => {
    it('closes without API call and reopens blank', () => {
      renderProfile({
        profile: { ...SAMPLE_PROFILE, totpEnabled: true },
      });
      openDeleteAccount();
      fillDelete({
        current: CURRENT_PW,
        code: '012345',
        confirmation: 'DELETE',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(accountApiMocks.deleteAccount).not.toHaveBeenCalled();
      expect(screen.queryByTestId('delete-account-modal')).toBeNull();

      openDeleteAccount();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Authenticator Code') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Type DELETE to confirm') as HTMLInputElement)
          .value,
      ).toBe('');
      expect(screen.queryByText('Unable to delete account')).toBeNull();
    });
  });

  describe('security boundaries', () => {
    it('keeps Delete Account wiring free of direct storage and replacement Session', () => {
      const modalSource = readFileSync(
        resolve(
          __dirname,
          '../../../components/profile/DeleteAccountConfirmModal.tsx',
        ),
        'utf8',
      );
      const sectionSource = readFileSync(
        resolve(
          __dirname,
          '../../../components/profile/ProfileAccountSection.tsx',
        ),
        'utf8',
      );

      expect(modalSource).toMatch(/clearSession/);
      expect(modalSource).not.toMatch(/\breplaceSession\b|\bestablishSession\b/);
      expect(modalSource).not.toMatch(
        /tokenStorage|SecureStore|setSessionToken|AsyncStorage/,
      );
      expect(sectionSource).toMatch(/variant="destructive"/);
      expect(sectionSource).not.toMatch(/tokenStorage|SecureStore/);
    });
  });
});
