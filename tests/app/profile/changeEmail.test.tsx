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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  token: 'opaque_session_tok_ProfileChangeEmail',
  replaceSession: vi.fn(async () => {}),
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
    requestEmailChange: vi.fn(),
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
  }) =>
    React.createElement(
      'span',
      { role: accessibilityRole, 'aria-label': accessibilityLabel },
      children,
    );

  const TextInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
      onChangeText?: (text: string) => void;
      onSubmitEditing?: () => void;
      editable?: boolean;
      accessibilityLabel?: string;
      accessibilityState?: { disabled?: boolean };
      secureTextEntry?: boolean;
      autoCapitalize?: string;
    }
  >(function MockTextInput(
    {
      onChangeText,
      onSubmitEditing,
      value,
      editable = true,
      accessibilityLabel,
      accessibilityState,
      secureTextEntry,
      autoCapitalize,
    },
    ref,
  ) {
    return React.createElement('input', {
      ref,
      value: value ?? '',
      type: secureTextEntry ? 'password' : 'text',
      disabled: editable === false,
      'aria-label': accessibilityLabel,
      'aria-disabled':
        accessibilityState?.disabled || editable === false ? true : undefined,
      'data-autocapitalize': autoCapitalize,
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
    React.createElement('div', null, children);

  const ActivityIndicator = () =>
    React.createElement('div', { role: 'progressbar' });

  const Modal = ({
    visible,
    children,
  }: {
    visible?: boolean;
    children?: ReactNode;
  }) =>
    visible
      ? React.createElement(
          'div',
          { role: 'dialog', 'data-testid': 'change-email-modal' },
          children,
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

vi.mock('@/components/profile/ChangePasswordModal', () => ({
  ChangePasswordModal: () => null,
}));

vi.mock('@/components/profile/TotpSetupModal', () => ({
  TotpSetupModal: () => null,
}));

vi.mock('@/components/profile/TotpDisableModal', () => ({
  TotpDisableModal: () => null,
}));

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
  requestEmailChange: accountApiMocks.requestEmailChange,
  changePassword: accountApiMocks.changePassword,
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

const CURRENT_PW = 'validpassword12';
const NEW_EMAIL = 'new@example.com';

function renderProfile() {
  render(
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
}

function openChangeEmail() {
  fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
}

function fillForm(opts: { email?: string; password?: string }) {
  if (opts.email !== undefined) {
    fireEvent.change(screen.getByLabelText('New Email'), {
      target: { value: opts.email },
    });
  }
  if (opts.password !== undefined) {
    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: opts.password },
    });
  }
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Send Verification' }));
}

describe('Change Email', () => {
  beforeEach(() => {
    authMocks.replaceSession.mockReset();
    authMocks.clearSession.mockReset();
    accountApiMocks.requestEmailChange.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows Change for Email and opens modal with blank fields', () => {
    renderProfile();
    expect(screen.getByRole('button', { name: 'Change email' })).toBeTruthy();
    openChangeEmail();

    expect(screen.getByTestId('change-email-modal')).toBeTruthy();
    expect((screen.getByLabelText('New Email') as HTMLInputElement).value).toBe(
      '',
    );
    expect(
      (screen.getByLabelText('Current Password') as HTMLInputElement).value,
    ).toBe('');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Send Verification' }),
    ).toBeTruthy();
  });

  it('validates email and current password client-side', async () => {
    renderProfile();
    openChangeEmail();

    await act(async () => {
      submit();
    });
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Current password is required.')).toBeTruthy();
    expect(accountApiMocks.requestEmailChange).not.toHaveBeenCalled();

    fillForm({ email: 'not-an-email', password: CURRENT_PW });
    await act(async () => {
      submit();
    });
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(accountApiMocks.requestEmailChange).not.toHaveBeenCalled();

    fillForm({ email: 'a'.repeat(250) + '@x.com', password: CURRENT_PW });
    await act(async () => {
      submit();
    });
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  it('trims email whitespace and preserves password exactly', async () => {
    accountApiMocks.requestEmailChange.mockResolvedValueOnce({
      message: 'Confirmation emails sent.',
    });
    renderProfile();
    openChangeEmail();
    fillForm({
      email: `  ${NEW_EMAIL}  `,
      password: '  spaced password  ',
    });

    await act(async () => {
      submit();
    });

    expect(accountApiMocks.requestEmailChange).toHaveBeenCalledWith({
      token: authMocks.token,
      newEmail: NEW_EMAIL,
      currentPassword: '  spaced password  ',
    });
  });

  it('sends once and blocks duplicate presses', async () => {
    let resolveReq: (value: unknown) => void = () => {};
    accountApiMocks.requestEmailChange.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReq = resolve;
        }),
    );
    renderProfile();
    openChangeEmail();
    fillForm({ email: NEW_EMAIL, password: CURRENT_PW });

    fireEvent.click(screen.getByRole('button', { name: 'Send Verification' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Verification' }));
    expect(accountApiMocks.requestEmailChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReq({ message: 'ok' });
    });
  });

  it('on success closes modal, shows notice, keeps old email, no session mutation', async () => {
    accountApiMocks.requestEmailChange.mockResolvedValueOnce({
      message: 'Confirmation emails sent.',
    });
    renderProfile();
    openChangeEmail();
    fillForm({ email: NEW_EMAIL, password: CURRENT_PW });

    await act(async () => {
      submit();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('change-email-modal')).toBeNull();
    });
    expect(
      screen.getByText(
        /Verification emails were sent to your current and new email addresses/,
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email: matthew@example.com')).toBeTruthy();
    expect(screen.queryByText(NEW_EMAIL)).toBeNull();
    expect(authMocks.replaceSession).not.toHaveBeenCalled();
    expect(authMocks.clearSession).not.toHaveBeenCalled();
  });

  it('on API failure keeps modal open and Session intact', async () => {
    accountApiMocks.requestEmailChange.mockRejectedValueOnce(
      new accountApiMocks.AccountApiError(
        'Current password is incorrect',
        400,
      ),
    );
    renderProfile();
    openChangeEmail();
    fillForm({ email: NEW_EMAIL, password: 'wrongpassword!!!!!' });

    await act(async () => {
      submit();
    });

    expect(screen.getByTestId('change-email-modal')).toBeTruthy();
    expect(screen.getByText('Current password is incorrect.')).toBeTruthy();
    expect(
      (screen.getByLabelText('New Email') as HTMLInputElement).value,
    ).toBe(NEW_EMAIL);
    expect(authMocks.clearSession).not.toHaveBeenCalled();
  });

  it('Cancel closes without request and reopens blank', () => {
    renderProfile();
    openChangeEmail();
    fillForm({ email: NEW_EMAIL, password: CURRENT_PW });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(accountApiMocks.requestEmailChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('change-email-modal')).toBeNull();

    openChangeEmail();
    expect((screen.getByLabelText('New Email') as HTMLInputElement).value).toBe(
      '',
    );
    expect(
      (screen.getByLabelText('Current Password') as HTMLInputElement).value,
    ).toBe('');
  });
});
