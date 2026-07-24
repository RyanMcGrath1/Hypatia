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

vi.mock('react-native', () => {
  const React = require('react') as typeof import('react');

  const View = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    testID,
    style,
  }: {
    children?: ReactNode;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    testID?: string;
    style?: unknown;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        'aria-disabled': accessibilityState?.disabled ? true : undefined,
        'aria-busy': accessibilityState?.busy ? true : undefined,
        role: accessibilityRole,
        'data-style': JSON.stringify(style ?? null),
      },
      children,
    );

  const Text = ({
    children,
    accessibilityRole,
    accessibilityLabel,
    accessibilityState,
    style,
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
        'data-style': JSON.stringify(style ?? null),
      },
      children,
    );

  const TextInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
      onChangeText?: (text: string) => void;
      onSubmitEditing?: () => void;
      placeholderTextColor?: string;
      secureTextEntry?: boolean;
      editable?: boolean;
      accessibilityLabel?: string;
      accessibilityState?: { disabled?: boolean };
      style?: unknown;
      autoCapitalize?: string;
      autoCorrect?: boolean;
      textContentType?: string;
      autoComplete?: string;
      returnKeyType?: string;
      keyboardType?: string;
      blurOnSubmit?: boolean;
    }
  >(function MockTextInput(
    {
      onChangeText,
      onSubmitEditing,
      value,
      placeholder,
      editable = true,
      secureTextEntry,
      accessibilityLabel,
      accessibilityState,
      style,
      autoCapitalize,
      autoCorrect,
      textContentType,
      autoComplete,
      returnKeyType,
      keyboardType,
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
      'data-style': JSON.stringify(style ?? null),
      'data-autocapitalize': autoCapitalize,
      'data-autocorrect':
        autoCorrect === undefined ? undefined : String(autoCorrect),
      'data-text-content-type': textContentType,
      'data-autocomplete': autoComplete,
      'data-return-key-type': returnKeyType,
      'data-keyboard-type': keyboardType,
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
    style,
  }: {
    children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
    onPress?: () => void;
    disabled?: boolean;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    accessibilityState?: { disabled?: boolean; busy?: boolean };
    style?: unknown | ((state: { pressed: boolean }) => unknown);
  }) => {
    const resolvedStyle =
      typeof style === 'function' ? style({ pressed: false }) : style;
    const content =
      typeof children === 'function' ? children({ pressed: false }) : children;
    return React.createElement(
      'button',
      {
        type: 'button',
        disabled: !!disabled,
        'aria-label': accessibilityLabel,
        'aria-disabled':
          accessibilityState?.disabled || disabled ? true : undefined,
        'aria-busy': accessibilityState?.busy ? true : undefined,
        role: accessibilityRole ?? 'button',
        'data-style': JSON.stringify(resolvedStyle ?? null),
        onClick: () => {
          if (!disabled) {
            onPress?.();
          }
        },
      } as ButtonHTMLAttributes<HTMLButtonElement>,
      content,
    );
  };

  const ActivityIndicator = ({ color }: { color?: string }) =>
    React.createElement('div', {
      role: 'progressbar',
      'data-testid': 'activity-indicator',
      'data-color': color,
    });

  const ScrollView = ({
    children,
    contentContainerStyle,
    style,
  }: {
    children?: ReactNode;
    contentContainerStyle?: unknown;
    style?: unknown;
    keyboardShouldPersistTaps?: string;
    keyboardDismissMode?: string;
    showsVerticalScrollIndicator?: boolean;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'scroll-view',
        'data-style': JSON.stringify(style ?? null),
        'data-content-style': JSON.stringify(contentContainerStyle ?? null),
      },
      children,
    );

  const KeyboardAvoidingView = ({
    children,
    style,
  }: {
    children?: ReactNode;
    style?: unknown;
    behavior?: string;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'keyboard-avoiding-view',
        'data-style': JSON.stringify(style ?? null),
      },
      children,
    );

  return {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
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

vi.mock('@expo/vector-icons/Feather', () => ({
  default: ({ name }: { name: string }) =>
    createElement('span', { 'data-testid': `icon-${name}` }, name),
}));

vi.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

const {
  mockLogin,
  mockEstablishSession,
  mockReplace,
  mockPush,
  mockBeginTotpLogin,
  mockClearTotpLogin,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockEstablishSession: vi.fn(),
  mockReplace: vi.fn(),
  mockPush: vi.fn(),
  mockBeginTotpLogin: vi.fn(),
  mockClearTotpLogin: vi.fn(),
}));

vi.mock('@/hooks/api/authApi', () => {
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
    login: (...args: unknown[]) => mockLogin(...args),
  };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    token: null,
    isRestoring: false,
    isAuthenticated: false,
    isDevAuthBypass: false,
    canAccessApp: false,
    establishSession: mockEstablishSession,
    replaceSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuthFlow', () => ({
  useAuthFlow: () => ({
    pendingTotpChallenge: null,
    beginTotpLogin: mockBeginTotpLogin,
    clearTotpLogin: mockClearTotpLogin,
  }),
}));

vi.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

import LoginScreen from '@/app/(auth)/login';
import { AuthApiError } from '@/hooks/api/authApi';
import { AppRoutes } from '@/constants/app/routes';

const SESSION_TOKEN = 'opaque_session_tok_LoginTest123';
const CHALLENGE_TOKEN = 'secret-challenge';
const SHORT_PASSWORD = 'short-pass';
const PASSWORD_WITH_SPACES = '  padded password ';

function fillValidForm(overrides?: { email?: string; password?: string }) {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: overrides?.email ?? 'ada@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: overrides?.password ?? SHORT_PASSWORD },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockLogin.mockReset();
  mockEstablishSession.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockBeginTotpLogin.mockReset();
  mockClearTotpLogin.mockReset();
  mockEstablishSession.mockResolvedValue(undefined);
});

describe('LoginScreen rendering', () => {
  it('renders email, password, Log In, Forgot Password, and Create Account', () => {
    render(<LoginScreen />);

    expect(screen.getByText('Log in')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
    expect(screen.getByText('Forgot Password')).toBeTruthy();
    expect(
      screen.getByLabelText('Forgot Password (coming soon)'),
    ).toBeTruthy();
    expect(screen.getByText("Don't have an account?")).toBeTruthy();
    expect(screen.getByLabelText('Create Account')).toBeTruthy();
  });

  it('shows Forgot Password as nonfunctional (no navigation)', () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByText('Forgot Password'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not render AppBanner and does not call SecureStore directly', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/login.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/AppBanner/);
    expect(source).not.toMatch(/tokenStorage/);
    expect(source).not.toMatch(/SecureStore/);
    expect(source).not.toMatch(/setSessionToken/);
    expect(source).not.toMatch(/getSessionToken/);
    expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);

    render(<LoginScreen />);
    expect(screen.queryByText('Profile')).toBeNull();
  });
});

describe('LoginScreen validation', () => {
  it('shows required errors on empty submit and does not call login', () => {
    render(<LoginScreen />);
    submit();

    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('rejects invalid email', () => {
    render(<LoginScreen />);
    fillValidForm({ email: 'not-an-email' });
    submit();

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('requires password even when email is valid', () => {
    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    submit();

    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('does not enforce a 15-character password minimum on Login', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'authenticated',
      message: 'ok',
      sessionToken: SESSION_TOKEN,
    });
    render(<LoginScreen />);
    fillValidForm({ password: SHORT_PASSWORD });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockLogin.mock.calls[0]![0].password).toBe(SHORT_PASSWORD);
    expect(screen.queryByText(/at least 15 characters/i)).toBeNull();
  });

  it('preserves password whitespace and does not trim password', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'authenticated',
      message: 'ok',
      sessionToken: SESSION_TOKEN,
    });
    render(<LoginScreen />);
    fillValidForm({ password: PASSWORD_WITH_SPACES });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockLogin.mock.calls[0]![0].password).toBe(PASSWORD_WITH_SPACES);
    expect(mockLogin.mock.calls[0]![0].password).not.toBe(
      PASSWORD_WITH_SPACES.trim(),
    );
  });

  it('clears a field error when the user edits that field', () => {
    render(<LoginScreen />);
    submit();
    expect(screen.getByText('Email is required.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a' },
    });
    expect(screen.queryByText('Email is required.')).toBeNull();
  });
});

describe('LoginScreen navigation', () => {
  it('auth index redirects to Login', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/index.tsx'),
      'utf8',
    );
    expect(source).toMatch(/AppRoutes\.authLogin|\/login/);
    expect(source).not.toMatch(/\/register/);
  });

  it('Create Account navigates to Registration', () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByLabelText('Create Account'));
    expect(mockPush).toHaveBeenCalledWith(AppRoutes.authRegister);
  });
});

describe('LoginScreen success', () => {
  it('calls login once with trimmed email and exact password, then establishes session', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'authenticated',
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });
    render(<LoginScreen />);
    fillValidForm({
      email: '  ada@example.com  ',
      password: SHORT_PASSWORD,
    });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: SHORT_PASSWORD,
    });
    expect(mockEstablishSession).toHaveBeenCalledWith(SESSION_TOKEN);
    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.tabsRoot);
    expect(screen.queryByText(SESSION_TOKEN)).toBeNull();
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });

  it('prevents duplicate submit while loading', async () => {
    let resolveLogin: (value: {
      kind: 'authenticated';
      message: string;
      sessionToken: string;
    }) => void = () => {};
    mockLogin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(<LoginScreen />);
    fillValidForm();

    await act(async () => {
      submit();
    });
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();

    await act(async () => {
      submit();
    });
    expect(mockLogin).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin({
        kind: 'authenticated',
        message: 'ok',
        sessionToken: SESSION_TOKEN,
      });
    });
  });
});

describe('LoginScreen API errors', () => {
  it('maps 401 to a generic invalid-credentials notice', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthApiError('Unauthorized', 401, { error: 'Unauthorized' }),
    );
    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(screen.getByText('Invalid email or password.')).toBeTruthy(),
    );
    expect(document.body.textContent).not.toMatch(/does not exist/i);
    expect(document.body.textContent).not.toMatch(/wrong password/i);
    expect(mockEstablishSession).not.toHaveBeenCalled();
  });

  it('maps 400 validation to a usable notice without leaking secrets', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthApiError('Invalid email format', 400, {
        error: 'Invalid email format',
      }),
    );
    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(screen.getByText('Invalid email format')).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain(SHORT_PASSWORD);
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });

  it('maps 503 to a temporary unavailability notice', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthApiError('Service unavailable', 503, null),
    );
    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Login is temporarily unavailable. Please try again.',
        ),
      ).toBeTruthy(),
    );
  });

  it('maps unexpected failures to a generic notice', async () => {
    mockLogin.mockRejectedValueOnce(new Error('network down'));
    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText('Unable to log in. Please try again.'),
      ).toBeTruthy(),
    );
  });
});

describe('LoginScreen session persistence failure', () => {
  it('shows safe message and does not route into the app', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'authenticated',
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });
    mockEstablishSession.mockRejectedValueOnce(
      new Error('Unable to store session token'),
    );

    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Your credentials were accepted, but this device could not save your login session. Please try again.',
        ),
      ).toBeTruthy(),
    );
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });
});

describe('LoginScreen TOTP required', () => {
  it('begins TOTP flow in memory and navigates without establishing session', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'totp_required',
      challengeToken: CHALLENGE_TOKEN,
      mfaMethod: 'totp',
    });

    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockBeginTotpLogin).toHaveBeenCalledTimes(1));
    expect(mockClearTotpLogin).toHaveBeenCalled();
    expect(mockBeginTotpLogin).toHaveBeenCalledWith(CHALLENGE_TOKEN);
    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.authLoginTotp);
    expect(mockEstablishSession).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        'Authenticator verification is required to finish signing in.',
      ),
    ).toBeNull();
    expect(document.body.textContent).not.toContain(CHALLENGE_TOKEN);
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);

    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/login.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/Bearer/);
    expect(source).not.toMatch(/setSessionToken/);
    expect(source).not.toMatch(/tokenStorage/);
    expect(source).not.toMatch(/SecureStore/);
  });

  it('clears any stale pending TOTP challenge when a fresh Login begins', async () => {
    mockLogin.mockResolvedValueOnce({
      kind: 'authenticated',
      message: 'ok',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockClearTotpLogin).toHaveBeenCalled();
    const clearOrder = mockClearTotpLogin.mock.invocationCallOrder[0]!;
    const loginOrder = mockLogin.mock.invocationCallOrder[0]!;
    expect(clearOrder).toBeLessThan(loginOrder);
  });
});
