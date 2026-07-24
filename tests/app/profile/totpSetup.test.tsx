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
  token: 'opaque_session_tok_ProfileTotpSetup',
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
    selectable?: boolean;
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
            'data-testid': 'totp-setup-modal',
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

const REPLACEMENT_TOKEN = 'opaque_session_tok_TotpReplacementXyZ789';
const CURRENT_PW = 'validpassword12';
const MANUAL_KEY = 'JBSWY3DPEHPK3PXP';
const PROVISIONING_URI =
  'otpauth://totp/Hypatia:matthew@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Hypatia';

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

function openSetup() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Set up authenticator app' }),
  );
}

async function completeSetupPhase(password = CURRENT_PW) {
  fireEvent.change(screen.getByLabelText('Current Password'), {
    target: { value: password },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  });
  await waitFor(() => {
    expect(screen.getByTestId('totp-manual-key')).toBeTruthy();
  });
}

describe('Profile TOTP setup / enable', () => {
  beforeEach(() => {
    authMocks.token = 'opaque_session_tok_ProfileTotpSetup';
    authMocks.replaceSession.mockReset();
    authMocks.replaceSession.mockResolvedValue(undefined);
    authMocks.clearSession.mockReset();
    authMocks.clearSession.mockResolvedValue(undefined);
    authMocks.establishSession.mockReset();
    securityTotpApiMocks.setupTotp.mockReset();
    securityTotpApiMocks.enableTotp.mockReset();
    securityTotpApiMocks.disableTotp.mockReset();
    securityTotpApiMocks.setupTotp.mockResolvedValue({
      provisioningUri: PROVISIONING_URI,
      manualKey: MANUAL_KEY,
    });
    securityTotpApiMocks.enableTotp.mockResolvedValue({
      message: 'Authenticator app enabled',
      sessionToken: REPLACEMENT_TOKEN,
      totpEnabled: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('disabled Security section', () => {
    it('shows Disabled and Set Up; Disable is absent', () => {
      renderProfile();

      expect(screen.getByText('Disabled')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Set up authenticator app' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Disable authenticator app' }),
      ).toBeNull();
    });

    it('hides Set Up for bypass-only Profile', () => {
      renderProfile({
        hasAuthenticatedSession: false,
        isDevAuthBypass: true,
        profile: null,
      });

      expect(
        screen.queryByRole('button', { name: 'Set up authenticator app' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Disable authenticator app' }),
      ).toBeNull();
      expect(securityTotpApiMocks.setupTotp).not.toHaveBeenCalled();
      expect(securityTotpApiMocks.enableTotp).not.toHaveBeenCalled();
    });
  });

  describe('phase 1 — current password', () => {
    it('opens with Current Password, Continue, and Cancel', () => {
      renderProfile();
      openSetup();

      expect(screen.getByTestId('totp-setup-modal')).toBeTruthy();
      expect(screen.getByLabelText('Current Password')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(screen.queryByLabelText('Authenticator Code')).toBeNull();
      expect(screen.queryByTestId('totp-manual-key')).toBeNull();

      const current = screen.getByLabelText('Current Password');
      expect(current.getAttribute('data-text-content-type')).toBe('password');
      expect(current.getAttribute('data-autocomplete')).toBe(
        'current-password',
      );
    });

    it('rejects blank Current Password without API call', async () => {
      renderProfile();
      openSetup();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      });

      expect(screen.getByText('Current password is required.')).toBeTruthy();
      expect(securityTotpApiMocks.setupTotp).not.toHaveBeenCalled();
    });

    it('forwards exact password (no trim / no 15-char minimum)', async () => {
      renderProfile();
      openSetup();

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: '  short ' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      });

      expect(securityTotpApiMocks.setupTotp).toHaveBeenCalledWith({
        token: authMocks.token,
        currentPassword: '  short ',
      });
    });
  });

  describe('phase 2 — configure after setup', () => {
    it('shows manual setup key and code field after setupTotp succeeds', async () => {
      renderProfile();
      openSetup();
      await completeSetupPhase();

      expect(screen.getByText(MANUAL_KEY)).toBeTruthy();
      expect(screen.getByLabelText('Authenticator Code')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Enable Authenticator' }),
      ).toBeTruthy();
      expect(screen.getByText(/Open your authenticator app/i)).toBeTruthy();
      // QR path unavailable — provisioning URI must not appear as UI text/route.
      expect(document.body.innerHTML).not.toContain(PROVISIONING_URI);
      expect(securityTotpApiMocks.enableTotp).not.toHaveBeenCalled();
      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      // Profile still shows Disabled until enable + reload.
      expect(screen.getByText('Disabled')).toBeTruthy();
    });

    it('rejects blank / non-6-digit / letter codes', async () => {
      renderProfile();
      openSetup();
      await completeSetupPhase();

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });
      expect(screen.getByText('Authenticator code is required.')).toBeTruthy();
      expect(securityTotpApiMocks.enableTotp).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '12345' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });
      expect(
        screen.getByText('Enter the 6-digit authenticator code.'),
      ).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: 'abcdef' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });
      expect(
        screen.getByText('Enter the 6-digit authenticator code.'),
      ).toBeTruthy();
      expect(securityTotpApiMocks.enableTotp).not.toHaveBeenCalled();
    });

    it('preserves leading-zero code as string "012345"', async () => {
      renderProfile();
      openSetup();
      await completeSetupPhase();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '012345' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });

      expect(securityTotpApiMocks.enableTotp).toHaveBeenCalledWith({
        token: authMocks.token,
        code: '012345',
      });
    });
  });

  describe('enable success', () => {
    it('calls replaceSession, closes modal, shows success, clears secrets', async () => {
      renderProfile();
      openSetup();
      await completeSetupPhase();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '012345' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });

      await waitFor(() => {
        expect(authMocks.replaceSession).toHaveBeenCalledWith(
          REPLACEMENT_TOKEN,
        );
      });
      expect(authMocks.establishSession).not.toHaveBeenCalled();
      expect(authMocks.clearSession).not.toHaveBeenCalled();
      expect(screen.queryByTestId('totp-setup-modal')).toBeNull();
      expect(screen.getByText('Authenticator app enabled.')).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(MANUAL_KEY);
      expect(document.body.innerHTML).not.toContain(PROVISIONING_URI);
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
      expect(document.body.innerHTML).not.toContain(CURRENT_PW);
      // Does not manually mutate Profile.totpEnabled — still Disabled until reload.
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  describe('enable API failure', () => {
    it('keeps modal open with setup key available and does not rotate Session', async () => {
      securityTotpApiMocks.enableTotp.mockRejectedValueOnce(
        new securityTotpApiMocks.SecurityTotpApiError(
          'Invalid authenticator code',
          400,
        ),
      );
      renderProfile();
      openSetup();
      await completeSetupPhase();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '000000' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });

      expect(authMocks.replaceSession).not.toHaveBeenCalled();
      expect(screen.getByTestId('totp-setup-modal')).toBeTruthy();
      expect(screen.getByText(MANUAL_KEY)).toBeTruthy();
      expect(screen.getByText('Invalid authenticator code.')).toBeTruthy();
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  describe('enable replacement-session failure', () => {
    it('clears secrets, attempts clearSession, and requires re-login', async () => {
      authMocks.replaceSession.mockRejectedValueOnce(
        new Error('Unable to store session token'),
      );
      renderProfile();
      openSetup();
      await completeSetupPhase();

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '012345' },
      });
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Enable Authenticator' }),
        );
      });

      await waitFor(() => {
        expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      });
      expect(securityTotpApiMocks.enableTotp).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('totp-setup-modal')).toBeNull();
      expect(
        screen.getByText(
          /Authenticator app was enabled, but this device could not save your new login session/i,
        ),
      ).toBeTruthy();
      expect(document.body.innerHTML).not.toContain(MANUAL_KEY);
      expect(document.body.innerHTML).not.toContain(PROVISIONING_URI);
      expect(document.body.innerHTML).not.toContain(REPLACEMENT_TOKEN);
    });
  });

  describe('setup cancel', () => {
    it('clears secrets without enable call after setup response is visible', async () => {
      renderProfile();
      openSetup();
      await completeSetupPhase();

      expect(screen.getByText(MANUAL_KEY)).toBeTruthy();
      fireEvent.click(screen.getByTestId('totp-setup-cancel'));

      expect(securityTotpApiMocks.enableTotp).not.toHaveBeenCalled();
      expect(screen.queryByTestId('totp-setup-modal')).toBeNull();
      expect(document.body.innerHTML).not.toContain(MANUAL_KEY);
      expect(document.body.innerHTML).not.toContain(PROVISIONING_URI);
      // Profile still Disabled — no fake mutation; backend pending setup left alone.
      expect(screen.getByText('Disabled')).toBeTruthy();

      openSetup();
      expect(
        (screen.getByLabelText('Current Password') as HTMLInputElement).value,
      ).toBe('');
      expect(screen.queryByTestId('totp-manual-key')).toBeNull();
    });
  });

  describe('security boundaries', () => {
    it('does not persist secrets or call SecureStore / establishSession from modal', () => {
      const modalSource = readFileSync(
        resolve(__dirname, '../../../components/profile/TotpSetupModal.tsx'),
        'utf8',
      );
      expect(modalSource).toMatch(/replaceSession/);
      expect(modalSource).not.toMatch(/establishSession/);
      expect(modalSource).not.toMatch(
        /tokenStorage|SecureStore|setSessionToken|AsyncStorage|localStorage/,
      );
      expect(modalSource).not.toMatch(/console\.(log|debug|info|warn|error)/);
      expect(modalSource).toMatch(
        /QR rendering is not currently available[\s\S]*no QR dependency/,
      );
    });

    it('does not manually assign profile.totpEnabled', () => {
      const pageSource = readFileSync(
        resolve(__dirname, '../../../components/profile/ProfilePageContent.tsx'),
        'utf8',
      );
      const setupSource = readFileSync(
        resolve(__dirname, '../../../components/profile/TotpSetupModal.tsx'),
        'utf8',
      );
      expect(pageSource).not.toMatch(/totpEnabled\s*=\s*true/);
      expect(setupSource).not.toMatch(/totpEnabled\s*=\s*true/);
    });
  });
});
