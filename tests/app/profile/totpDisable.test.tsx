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
  token: 'opaque_session_tok_ProfileTotpDisable',
  replaceSession: vi.fn(async (_token: string) => {}),
  clearSession: vi.fn(async () => {}),
  establishSession: vi.fn(async () => {}),
}));

const securityTotpApiMocks = vi.hoisted(() => {
  class SecurityTotpApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly body: unknown = null,
    ) {
      super(message);
      this.name = 'SecurityTotpApiError';
    }
  }
  return {
    SecurityTotpApiError,
    setupTotp: vi.fn(),
    enableTotp: vi.fn(),
    disableTotp: vi.fn(),
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
            'data-testid': 'totp-disable-modal',
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

vi.mock('@/hooks/api/securityTotpApi', () => ({
  SecurityTotpApiError: securityTotpApiMocks.SecurityTotpApiError,
  setupTotp: securityTotpApiMocks.setupTotp,
  enableTotp: securityTotpApiMocks.enableTotp,
  disableTotp: securityTotpApiMocks.disableTotp,
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

const REPLACEMENT_TOKEN = 'opaque_session_tok_TotpDisableReplacement';
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

function openDisable() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Disable authenticator app' }),
  );
}

function fillDisable(opts: { current?: string; code?: string }) {
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
}

function submitDisable() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Disable Authenticator' }),
  );
}

describe('Profile TOTP disable', () => {
  beforeEach(() => {
    authMocks.token = 'opaque_session_tok_ProfileTotpDisable';
    authMocks.replaceSession.mockReset();
    authMocks.replaceSession.mockResolvedValue(undefined);
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    authMocks.establishSession.mockReset();
    securityTotpApiMocks.setupTotp.mockReset();
    securityTotpApiMocks.enableTotp.mockReset();
    securityTotpApiMocks.disableTotp.mockReset();
    securityTotpApiMocks.disableTotp.mockResolvedValue({
      message: 'Authenticator app disabled',
      sessionToken: REPLACEMENT_TOKEN,
      totpEnabled: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('enabled Security section', () => {
    it('shows Enabled and Disable; Set Up is absent', () => {
      renderProfile();

      expect(screen.getByText('Enabled')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Disable authenticator app' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Set up authenticator app' }),
      ).toBeNull();
    });

    it('hides Disable for bypass-only Profile', () => {
      renderProfile({
        hasAuthenticatedSession: false,
        isDevAuthBypass: true,
        profile: null,
      });

      expect(
        screen.queryByRole('button', { name: 'Disable authenticator app' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Set up authenticator app' }),
      ).toBeNull();
      expect(securityTotpApiMocks.disableTotp).not.toHaveBeenCalled();
    });
  });

  describe('modal open / validation', () => {
    it('opens with Current Password, Authenticator Code, Cancel, and Disable', () => {
      renderProfile();
      openDisable();

      expect(screen.getByTestId('totp-disable-modal')).toBeTruthy();
      expect(screen.getByLabelText('Current Password')).toBeTruthy();
      expect(screen.getByLabelText('Authenticator Code')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Disable Authenticator' }),
      ).toBeTruthy();

      const current = screen.getByLabelText('Current Password');
      expect(current.getAttribute('data-text-content-type')).toBe('password');
      expect(current.getAttribute('data-autocomplete')).toBe(
        'current-password',
      );
    });

    it('rejects blank password and invalid codes without API call', async () => {
      renderProfile();
      openDisable();

      await act(async () => {
        submitDisable();
      });
      expect(screen.getByText('Current password is required.')).toBeTruthy();
      expect(screen.getByText('Authenticator code is required.')).toBeTruthy();
      expect(securityTotpApiMocks.disableTotp).not.toHaveBeenCalled();

      fillDisable({ current: CURRENT_PW, code: '12345' });
      await act(async () => {
        submitDisable();
      });
      expect(
        screen.getByText('Enter the 6-digit authenticator code.'),
      ).toBeTruthy();
      expect(securityTotpApiMocks.disableTotp).not.toHaveBeenCalled();

      fillDisable({ current: CURRENT_PW, code: 'abcdef' });
      await act(async () => {
        submitDisable();
      });
      expect(
        screen.getByText('Enter the 6-digit authenticator code.'),
      ).toBeTruthy();
      expect(securityTotpApiMocks.disableTotp).not.toHaveBeenCalled();
    });

    it('preserves leading-zero code and exact password', async () => {
      renderProfile();
      openDisable();
      fillDisable({ current: '  short ', code: '012345' });

      await act(async () => {
        submitDisable();
      });

      expect(securityTotpApiMocks.disableTotp).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: '  short ',
        code: '012345',
      });
    });
  });

  describe('disable success', () => {
    it('calls replaceSession, closes modal, shows success, clears credentials', async () => {
      renderProfile();
      openDisable();
      fillDisable({ current: CURRENT_PW, code: '012345' });

      await act(async () => {
        submitDisable();
      });

      await waitFor(() => {
        expect(authMocks.replaceSession).toHaveBeenCalledWith(
          REPLACEMENT_TOKEN,
        );
      });
      expect(authMocks.establishSession).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.queryByTestId('totp-disable-modal')).toBeNull();
      expect(screen.getByText('Authenticator app disabled.')).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
      expect(document.body.innerHTML).not.toContain(CURRENT_PW);
      // Still Enabled until Profile reload — no manual mutation.
      expect(screen.getByText('Enabled')).toBeTruthy();
    });
  });

  describe('disable API failure', () => {
    it('keeps modal open and Session; shows safe error', async () => {
      securityTotpApiMocks.disableTotp.mockRejectedValueOnce(
        new securityTotpApiMocks.SecurityTotpApiError(
          'Current password is incorrect',
          400,
        ),
      );
      renderProfile();
      openDisable();
      fillDisable({ current: 'wrongpassword12', code: '012345' });

      await act(async () => {
        submitDisable();
      });

      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('totp-disable-modal')).toBeTruthy();
      expect(screen.getByText('Current password is incorrect')).toBeTruthy();
      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    it('shows session message on 401 without clearSession', async () => {
      securityTotpApiMocks.disableTotp.mockRejectedValueOnce(
        new securityTotpApiMocks.SecurityTotpApiError(
          'Authentication required',
          401,
        ),
      );
      renderProfile();
      openDisable();
      fillDisable({ current: CURRENT_PW, code: '012345' });

      await act(async () => {
        submitDisable();
      });

      expect(
        screen.getByText(
          'Authenticator could not be disabled with the current session.',
        ),
      ).toBeTruthy();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
    });
  });

  describe('disable replacement-session failure', () => {
    it('clears credentials, attempts clearSession, and requires re-login', async () => {
      authMocks.replaceSession.mockRejectedValueOnce(
        new Error('Unable to store session token'),
      );
      renderProfile();
      openDisable();
      fillDisable({ current: CURRENT_PW, code: '012345' });

      await act(async () => {
        submitDisable();
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(securityTotpApiMocks.disableTotp).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('totp-disable-modal')).toBeNull();
      expect(
        screen.getByText(
          /Authenticator app was disabled, but this device could not save your new login session/i,
        ),
      ).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
      expect(document.body.innerHTML).not.toContain(CURRENT_PW);
    });
  });

  describe('security boundaries', () => {
    it('uses replaceSession only and does not manually mutate totpEnabled', () => {
      const modalSource = readFileSync(
        resolve(__dirname, '../../../components/profile/TotpDisableModal.tsx'),
        'utf8',
      );
      expect(modalSource).toMatch(/replaceSession/);
      expect(modalSource).not.toMatch(/establishSession/);
      expect(modalSource).not.toMatch(
        /tokenStorage|SecureStore|setSessionToken|AsyncStorage/,
      );
      expect(modalSource).not.toMatch(/totpEnabled\s*=\s*false/);
      expect(modalSource).not.toMatch(/console\.(log|debug|info|warn|error)/);
    });
  });
});
