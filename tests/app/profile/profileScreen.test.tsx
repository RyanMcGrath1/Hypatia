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
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    accessibilityState,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean };
    style?: unknown;
  }) =>
    React.createElement(
      'span',
      {
        role: accessibilityRole,
        'aria-label': accessibilityLabel,
        'aria-disabled': accessibilityState?.disabled ? true : undefined,
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
      autoCapitalize?: string;
      testID?: string;
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
      autoCapitalize,
      testID,
    },
    ref,
  ) {
    return React.createElement('input', {
      ref,
      value: value ?? '',
      placeholder,
      disabled: editable === false,
      'aria-label': accessibilityLabel,
      'aria-disabled':
        accessibilityState?.disabled || editable === false ? true : undefined,
      'data-autocapitalize': autoCapitalize,
      'data-testid': testID,
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

  return {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    ActivityIndicator,
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

vi.mock('@/components/profile/ChangePasswordModal', () => {
  const React = require('react') as typeof import('react');
  return {
    ChangePasswordModal: ({ visible }: { visible?: boolean }) =>
      visible
        ? React.createElement('div', {
            'data-testid': 'change-password-modal-stub',
          })
        : null,
  };
});

vi.mock('@/components/profile/ChangeEmailModal', () => {
  const React = require('react') as typeof import('react');
  return {
    ChangeEmailModal: ({ visible }: { visible?: boolean }) =>
      visible
        ? React.createElement('div', {
            'data-testid': 'change-email-modal-stub',
          })
        : null,
  };
});

vi.mock('@/components/profile/TotpSetupModal', () => {
  const React = require('react') as typeof import('react');
  return {
    TotpSetupModal: ({ visible }: { visible?: boolean }) =>
      visible
        ? React.createElement('div', {
            'data-testid': 'totp-setup-modal-stub',
          })
        : null,
  };
});

vi.mock('@/components/profile/TotpDisableModal', () => {
  const React = require('react') as typeof import('react');
  return {
    TotpDisableModal: ({ visible }: { visible?: boolean }) =>
      visible
        ? React.createElement('div', {
            'data-testid': 'totp-disable-modal-stub',
          })
        : null,
  };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    token: 'opaque_session_tok_ProfileScreen',
    isRestoring: false,
    isAuthenticated: true,
    isDevAuthBypass: false,
    canAccessApp: true,
    establishSession: vi.fn(),
    replaceSession: vi.fn(),
    clearSession: vi.fn(),
  }),
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
import { PROFILE_PASSWORD_MASK } from '@/components/profile/ProfileSecuritySection';
import type { Profile } from '@/hooks/api/profileApi';
import type { UpdatePersonalInfoParams } from '@/hooks/useProfile';

const SAMPLE_PROFILE: Profile = {
  firstName: 'Matthew',
  lastName: 'Thompson',
  dateJoined: '2026-07-23T12:00:00.000Z',
  email: 'matthew@example.com',
  passwordChangedAt: '2026-07-01T12:00:00.000Z',
  totpEnabled: true,
};

function renderPage(
  overrides: Partial<{
    isRestoring: boolean;
    isDevAuthBypass: boolean;
    profile: Profile | null;
    isLoading: boolean;
    error: InstanceType<typeof ProfileApiError> | Error | null;
    hasAuthenticatedSession: boolean;
    onRetry: () => void;
    updatePersonalInfo: (
      params: UpdatePersonalInfoParams,
    ) => Promise<Profile>;
  }> = {},
) {
  const onRetry = overrides.onRetry ?? vi.fn();
  const updatePersonalInfo =
    overrides.updatePersonalInfo === undefined
      ? overrides.hasAuthenticatedSession === false
        ? undefined
        : overrides.profile
          ? vi.fn(async (params: UpdatePersonalInfoParams) => ({
              ...SAMPLE_PROFILE,
              ...(overrides.profile ?? SAMPLE_PROFILE),
              ...(params.firstName !== undefined
                ? { firstName: params.firstName }
                : {}),
              ...(params.lastName !== undefined
                ? { lastName: params.lastName }
                : {}),
            }))
          : undefined
      : overrides.updatePersonalInfo;

  const hasAuthenticatedSession =
    overrides.hasAuthenticatedSession ??
    (overrides.profile !== null && overrides.profile !== undefined);

  render(
    createElement(ProfilePageContent, {
      isRestoring: overrides.isRestoring ?? false,
      isDevAuthBypass: overrides.isDevAuthBypass ?? false,
      profile: overrides.profile === undefined ? null : overrides.profile,
      isLoading: overrides.isLoading ?? false,
      error: overrides.error ?? null,
      hasAuthenticatedSession,
      onRetry,
      updatePersonalInfo:
        hasAuthenticatedSession && updatePersonalInfo
          ? updatePersonalInfo
          : undefined,
    }),
  );
  return { onRetry, updatePersonalInfo };
}

function enterEditMode() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Edit personal information' }),
  );
}

function getSaveButton() {
  return screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
}

function expectSaveDisabled(disabled: boolean) {
  const button = getSaveButton();
  expect(button.disabled).toBe(disabled);
  expect(button.getAttribute('aria-disabled')).toBe(
    disabled ? 'true' : null,
  );
}

function setFirstName(value: string) {
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value },
  });
}

function setLastName(value: string) {
  fireEvent.change(screen.getByLabelText('Last Name'), {
    target: { value },
  });
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

  describe('loaded profile — read mode', () => {
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

    it('shows First/Last as read-only values and Date Joined read-only', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });

      expect(screen.queryByLabelText('First Name')).toBeNull();
      expect(screen.queryByLabelText('Last Name')).toBeNull();
      expect(screen.getByLabelText('First Name: Matthew')).toBeTruthy();
      expect(screen.getByLabelText('Last Name: Thompson')).toBeTruthy();
      expect(screen.getByLabelText(/Date Joined:.*July 23, 2026/)).toBeTruthy();
    });

    it('shows Edit in Personal Information; Change for Email and Password; Disable for Authenticator', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });

      expect(
        screen.getByRole('button', { name: 'Edit personal information' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Change email' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Change password' }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Disable authenticator app' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /logout/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /log out/i })).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Set up authenticator app' }),
      ).toBeNull();
    });

    it('shows Set Up when totpEnabled is false', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: { ...SAMPLE_PROFILE, totpEnabled: false },
      });

      expect(screen.getByText('Disabled')).toBeTruthy();
      expect(screen.queryByText('Enabled')).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Set up authenticator app' }),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Disable authenticator app' }),
      ).toBeNull();
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

  describe('enter edit mode', () => {
    it('shows First/Last inputs initialized from Profile; Date Joined stays read-only', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });

      enterEditMode();

      const first = screen.getByLabelText('First Name') as HTMLInputElement;
      const last = screen.getByLabelText('Last Name') as HTMLInputElement;
      expect(first.value).toBe('Matthew');
      expect(last.value).toBe('Thompson');
      expect(first.getAttribute('data-autocapitalize')).toBe('words');
      expect(last.getAttribute('data-autocapitalize')).toBe('words');
      expect(screen.getByLabelText(/Date Joined:.*July 23, 2026/)).toBeTruthy();
      expectSaveDisabled(true);
      expect(
        screen.getByRole('button', {
          name: 'Cancel editing personal information',
        }),
      ).toBeTruthy();
    });
  });

  describe('change detection', () => {
    it('keeps Save disabled with no edits or whitespace-only diffs', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });
      enterEditMode();

      expectSaveDisabled(true);

      setFirstName('  Matthew  ');
      expectSaveDisabled(true);

      setFirstName('Matthew');
      setLastName('  Thompson  ');
      expectSaveDisabled(true);
    });

    it('enables Save when First or Last changes, disables when restored', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });
      enterEditMode();

      setFirstName('Matt');
      expectSaveDisabled(false);

      setFirstName('Matthew');
      expectSaveDisabled(true);

      setLastName('Smith');
      expectSaveDisabled(false);

      setLastName('Thompson');
      expectSaveDisabled(true);
    });

    it('disables Save when draft is invalid', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });
      enterEditMode();

      setFirstName('Matt');
      expectSaveDisabled(false);

      setFirstName('   ');
      expectSaveDisabled(true);
      expect(screen.getByText('First name is required.')).toBeTruthy();

      setFirstName('Matt');
      setLastName('a'.repeat(129));
      expectSaveDisabled(true);
      expect(
        screen.getByText('Last name must be 128 characters or fewer.'),
      ).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('rejects blank and whitespace-only names', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });
      enterEditMode();

      setFirstName('');
      expect(screen.getByText('First name is required.')).toBeTruthy();
      setFirstName('  ');
      expect(screen.getByText('First name is required.')).toBeTruthy();

      setFirstName('Matt');
      setLastName('');
      expect(screen.getByText('Last name is required.')).toBeTruthy();
      setLastName('\t');
      expect(screen.getByText('Last name is required.')).toBeTruthy();
    });

    it('allows punctuation and Unicode names', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
      });
      enterEditMode();

      setFirstName("Anne-Marie");
      setLastName("O'Connor");
      expectSaveDisabled(false);
      expect(screen.queryByText(/is required/)).toBeNull();
      expect(screen.queryByText(/128 characters/)).toBeNull();

      setFirstName('José');
      setLastName('李');
      expectSaveDisabled(false);
    });
  });

  describe('PATCH payload', () => {
    it('sends only changed fields and trims before submit', async () => {
      const updatePersonalInfo = vi.fn<
        (params: UpdatePersonalInfoParams) => Promise<Profile>
      >(async () => ({
        ...SAMPLE_PROFILE,
        firstName: 'Matt',
      }));
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setFirstName('  Matt  ');
      await act(async () => {
        fireEvent.click(getSaveButton());
      });

      expect(updatePersonalInfo).toHaveBeenCalledTimes(1);
      expect(updatePersonalInfo).toHaveBeenCalledWith({ firstName: 'Matt' });
      const payload = updatePersonalInfo.mock.calls[0]?.[0];
      expect(payload).toEqual({ firstName: 'Matt' });
      expect(payload).not.toHaveProperty('lastName');
    });

    it('sends only lastName when only last name changes', async () => {
      const updatePersonalInfo = vi.fn<
        (params: UpdatePersonalInfoParams) => Promise<Profile>
      >(async () => ({
        ...SAMPLE_PROFILE,
        lastName: 'Smith',
      }));
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setLastName('Smith');
      await act(async () => {
        fireEvent.click(getSaveButton());
      });

      expect(updatePersonalInfo).toHaveBeenCalledWith({ lastName: 'Smith' });
      const payload = updatePersonalInfo.mock.calls[0]?.[0];
      expect(payload).toEqual({ lastName: 'Smith' });
      expect(payload).not.toHaveProperty('firstName');
    });

    it('sends both fields when both change', async () => {
      const updatePersonalInfo = vi.fn<
        (params: UpdatePersonalInfoParams) => Promise<Profile>
      >(async () => ({
        ...SAMPLE_PROFILE,
        firstName: 'Matt',
        lastName: 'Smith',
      }));
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setFirstName('Matt');
      setLastName('Smith');
      await act(async () => {
        fireEvent.click(getSaveButton());
      });

      expect(updatePersonalInfo).toHaveBeenCalledWith({
        firstName: 'Matt',
        lastName: 'Smith',
      });
    });
  });

  describe('save success', () => {
    it('exits edit mode, shows success, and uses server-returned values', async () => {
      let resolveUpdate: (value: Profile) => void = () => {};
      const updatePersonalInfo = vi.fn(
        () =>
          new Promise<Profile>((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      const { rerender } = render(
        createElement(ProfilePageContent, {
          isRestoring: false,
          isDevAuthBypass: false,
          profile: SAMPLE_PROFILE,
          isLoading: false,
          error: null,
          hasAuthenticatedSession: true,
          onRetry: vi.fn(),
          updatePersonalInfo,
        }),
      );

      enterEditMode();
      setFirstName('Matt');
      fireEvent.click(getSaveButton());

      expect(updatePersonalInfo).toHaveBeenCalledTimes(1);
      expectSaveDisabled(true);
      fireEvent.click(getSaveButton());
      expect(updatePersonalInfo).toHaveBeenCalledTimes(1);

      const serverProfile: Profile = {
        ...SAMPLE_PROFILE,
        firstName: 'Matt',
        lastName: 'Thompson',
      };

      await act(async () => {
        resolveUpdate(serverProfile);
      });

      rerender(
        createElement(ProfilePageContent, {
          isRestoring: false,
          isDevAuthBypass: false,
          profile: serverProfile,
          isLoading: false,
          error: null,
          hasAuthenticatedSession: true,
          onRetry: vi.fn(),
          updatePersonalInfo,
        }),
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: 'Save' }),
        ).toBeNull();
      });
      expect(screen.getByText('Personal information updated.')).toBeTruthy();
      expect(screen.getByLabelText('First Name: Matt')).toBeTruthy();
      expect(screen.queryByLabelText('First Name')).toBeNull();
    });
  });

  describe('save failure', () => {
    it('remains in edit mode with draft retained and safe error', async () => {
      const updatePersonalInfo = vi.fn<
        (params: UpdatePersonalInfoParams) => Promise<Profile>
      >(async () => {
        throw new ProfileApiError('Service unavailable', 503);
      });
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setFirstName('Matt');
      await act(async () => {
        fireEvent.click(getSaveButton());
      });

      expect(
        screen.getByText(
          'Unable to update your personal information. Please try again.',
        ),
      ).toBeTruthy();
      expect(
        (screen.getByLabelText('First Name') as HTMLInputElement).value,
      ).toBe('Matt');
      expect(screen.queryByLabelText('First Name: Matthew')).toBeNull();
      expectSaveDisabled(false);

      updatePersonalInfo.mockResolvedValueOnce({
        ...SAMPLE_PROFILE,
        firstName: 'Matt',
      });
      await act(async () => {
        fireEvent.click(getSaveButton());
      });
      expect(updatePersonalInfo).toHaveBeenCalledTimes(2);
    });

    it('shows session message on 401 without Login controls', async () => {
      const updatePersonalInfo = vi.fn<
        (params: UpdatePersonalInfoParams) => Promise<Profile>
      >(async () => {
        throw new ProfileApiError('Unauthorized', 401);
      });
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setFirstName('Matt');
      await act(async () => {
        fireEvent.click(getSaveButton());
      });

      expect(
        screen.getByText(
          'Your changes could not be saved with the current session.',
        ),
      ).toBeTruthy();
      expect(screen.queryByText('Log In')).toBeNull();
      expect(screen.queryByText('Login')).toBeNull();
      expect(
        (screen.getByLabelText('First Name') as HTMLInputElement).value,
      ).toBe('Matt');
    });
  });

  describe('cancel', () => {
    it('discards drafts, exits edit, and does not call updatePersonalInfo', () => {
      const updatePersonalInfo = vi.fn();
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        updatePersonalInfo,
      });

      enterEditMode();
      setFirstName('Matt');
      setLastName('Smith');
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Cancel editing personal information',
        }),
      );

      expect(updatePersonalInfo).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
      expect(screen.getByLabelText('First Name: Matthew')).toBeTruthy();
      expect(screen.getByLabelText('Last Name: Thompson')).toBeTruthy();
      expect(screen.queryByText(/Unable to update/)).toBeNull();
    });
  });

  describe('refresh error interaction', () => {
    it('keeps refresh warning while editing remains available', () => {
      renderPage({
        hasAuthenticatedSession: true,
        profile: SAMPLE_PROFILE,
        error: new ProfileApiError('Service unavailable', 503),
      });

      expect(screen.getByText("Couldn't refresh profile")).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Edit personal information' }),
      ).toBeTruthy();

      enterEditMode();
      expect(screen.getByText("Couldn't refresh profile")).toBeTruthy();
      expect(screen.getByLabelText('First Name')).toBeTruthy();
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
          updatePersonalInfo: vi.fn(),
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
    it('shows developer notice, no Edit, and never calls updatePersonalInfo', () => {
      const updatePersonalInfo = vi.fn();
      renderPage({
        isDevAuthBypass: true,
        hasAuthenticatedSession: false,
        profile: null,
        isLoading: false,
        updatePersonalInfo,
      });

      expect(screen.getByText('Development bypass active')).toBeTruthy();
      expect(
        screen.getByText(
          /Profile account data is unavailable while using the development authentication bypass/,
        ),
      ).toBeTruthy();
      expect(screen.queryByText('First Name')).toBeNull();
      expect(screen.queryByText('Matthew')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Edit personal information' }),
      ).toBeNull();
      expect(updatePersonalInfo).not.toHaveBeenCalled();
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
});

describe('Profile route wiring', () => {
  it('wires updatePersonalInfo from useProfile without clearSession / logout', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(app)/(tabs)/profile.tsx'),
      'utf8',
    );
    expect(source).toMatch(/useProfile/);
    expect(source).toMatch(/ProfilePageContent/);
    expect(source).toMatch(/refresh/);
    expect(source).toMatch(/updatePersonalInfo/);
    expect(source).not.toMatch(/clearSession/);
    expect(source).not.toMatch(/logout\(/);
    expect(source).not.toMatch(/updateProfile\(/);
    expect(source).not.toMatch(/profileApi/);
  });

  it('does not invent fake developer Profile data in page content', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../components/profile/ProfilePageContent.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/firstName:\s*['"]Developer['"]/);
    expect(source).not.toMatch(/fake/i);
  });

  it('does not call profileApi or tokens from Personal Information section', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../components/profile/ProfilePersonalInfoSection.tsx',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/updateProfile\(/);
    expect(source).not.toMatch(/getProfile\(/);
    expect(source).not.toMatch(/tokenStorage/);
    expect(source).not.toMatch(/clearSession/);
  });
});
