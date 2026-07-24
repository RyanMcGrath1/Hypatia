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

const { mockRegister, mockEstablishSession, mockReplace, mockPush } =
  vi.hoisted(() => ({
    mockRegister: vi.fn(),
    mockEstablishSession: vi.fn(),
    mockReplace: vi.fn(),
    mockPush: vi.fn(),
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
    register: (...args: unknown[]) => mockRegister(...args),
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

vi.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

import RegisterScreen from '@/app/(auth)/register';
import { AuthApiError } from '@/hooks/api/authApi';
import { AppRoutes } from '@/constants/app/routes';

const SESSION_TOKEN = 'opaque_session_tok_RegisterTest123';
const VALID_PASSWORD = 'fifteen chars!!';

function fillValidForm(overrides?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}) {
  fireEvent.change(screen.getByLabelText('First Name'), {
    target: { value: overrides?.firstName ?? 'Ada' },
  });
  fireEvent.change(screen.getByLabelText('Last Name'), {
    target: { value: overrides?.lastName ?? 'Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: overrides?.email ?? 'ada@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: overrides?.password ?? VALID_PASSWORD },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockRegister.mockReset();
  mockEstablishSession.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockEstablishSession.mockResolvedValue(undefined);
});

describe('RegisterScreen rendering', () => {
  it('renders required fields and Create Account button', () => {
    render(<RegisterScreen />);

    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByLabelText('First Name')).toBeTruthy();
    expect(screen.getByLabelText('Last Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Create Account' }),
    ).toBeTruthy();
    expect(screen.getByText('Use at least 15 characters.')).toBeTruthy();
    expect(screen.getByText('Already have an account?')).toBeTruthy();
    expect(screen.getByLabelText('Log In')).toBeTruthy();
  });

  it('Log In navigates to the Login route', () => {
    render(<RegisterScreen />);
    fireEvent.click(screen.getByLabelText('Log In'));
    expect(mockPush).toHaveBeenCalledWith(AppRoutes.authLogin);
  });

  it('does not render AppBanner and does not call SecureStore directly', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/register.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/AppBanner/);
    expect(source).not.toMatch(/tokenStorage/);
    expect(source).not.toMatch(/SecureStore/);
    expect(source).not.toMatch(/setSessionToken/);
    expect(source).not.toMatch(/getSessionToken/);

    render(<RegisterScreen />);
    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('does not alter development auth bypass behavior', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/register.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/resolveDevAuthBypass/);
    expect(source).not.toMatch(/isDevAuthBypass/);
    expect(source).not.toMatch(/process\.env\.EXPO_PUBLIC_DEV_AUTH_BYPASS/);
  });
});

describe('RegisterScreen validation', () => {
  it('shows required errors on empty submit and does not call register', () => {
    render(<RegisterScreen />);
    submit();

    expect(screen.getByText('First name is required.')).toBeTruthy();
    expect(screen.getByText('Last name is required.')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only first and last names', () => {
    render(<RegisterScreen />);
    fillValidForm({ firstName: '   ', lastName: '\t\n' });
    submit();

    expect(screen.getByText('First name is required.')).toBeTruthy();
    expect(screen.getByText('Last name is required.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects names longer than 128 characters', () => {
    render(<RegisterScreen />);
    const longName = 'A'.repeat(129);
    fillValidForm({ firstName: longName, lastName: longName });
    submit();

    expect(
      screen.getByText('First name must be 128 characters or fewer.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Last name must be 128 characters or fewer.'),
    ).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects invalid email', () => {
    render(<RegisterScreen />);
    fillValidForm({ email: 'not-an-email' });
    submit();

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 15 characters', () => {
    render(<RegisterScreen />);
    fillValidForm({ password: 'short-password' });
    submit();

    expect(
      screen.getByText('Password must be at least 15 characters.'),
    ).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('accepts passwords of exactly 15 characters', async () => {
    mockRegister.mockResolvedValueOnce({
      message: 'ok',
      sessionToken: SESSION_TOKEN,
    });
    render(<RegisterScreen />);
    fillValidForm({ password: '123456789012345' });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(mockRegister.mock.calls[0]![0].password).toBe('123456789012345');
  });

  it('preserves password spaces and does not trim password', async () => {
    const passwordWithSpaces = '  padded password ';
    expect(passwordWithSpaces.length).toBeGreaterThanOrEqual(15);
    mockRegister.mockResolvedValueOnce({
      message: 'ok',
      sessionToken: SESSION_TOKEN,
    });
    render(<RegisterScreen />);
    fillValidForm({ password: passwordWithSpaces });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(mockRegister.mock.calls[0]![0].password).toBe(passwordWithSpaces);
    expect(mockRegister.mock.calls[0]![0].password).not.toBe(
      passwordWithSpaces.trim(),
    );
  });

  it('clears a field error when the user edits that field', () => {
    render(<RegisterScreen />);
    submit();
    expect(screen.getByText('First name is required.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'A' },
    });
    expect(screen.queryByText('First name is required.')).toBeNull();
  });
});

describe('RegisterScreen submission', () => {
  it('calls register once with trimmed names/email and exact password', async () => {
    mockRegister.mockResolvedValueOnce({
      message: 'Registration successful',
      sessionToken: SESSION_TOKEN,
    });
    render(<RegisterScreen />);
    fillValidForm({
      firstName: '  Ada  ',
      lastName: '  Lovelace ',
      email: '  ada@example.com  ',
      password: VALID_PASSWORD,
    });
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(mockRegister).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: VALID_PASSWORD,
    });
  });

  it('prevents duplicate submit while loading', async () => {
    let resolveRegister: (value: {
      message: string;
      sessionToken: string;
    }) => void = () => {};
    mockRegister.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
    );

    render(<RegisterScreen />);
    fillValidForm();

    await act(async () => {
      submit();
    });
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();

    await act(async () => {
      submit();
    });
    expect(mockRegister).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRegister({
        message: 'ok',
        sessionToken: SESSION_TOKEN,
      });
    });
  });
});

describe('RegisterScreen success', () => {
  it('establishes session and routes to the home tab without showing the token', async () => {
    mockRegister.mockResolvedValueOnce({
      message: 'Registration successful',
      sessionToken: SESSION_TOKEN,
    });
    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(mockEstablishSession).toHaveBeenCalledWith(SESSION_TOKEN),
    );
    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.tabsRoot);
    expect(screen.queryByText(SESSION_TOKEN)).toBeNull();
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });
});

describe('RegisterScreen API errors', () => {
  it('maps 409 duplicate email to a FormNotice', async () => {
    mockRegister.mockRejectedValueOnce(
      new AuthApiError('Email already registered', 409, {
        error: 'Email already registered',
      }),
    );
    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText('An account with this email already exists.'),
      ).toBeTruthy(),
    );
    expect(mockEstablishSession).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(VALID_PASSWORD);
  });

  it('maps 400 validation to a usable notice without leaking secrets', async () => {
    mockRegister.mockRejectedValueOnce(
      new AuthApiError('Invalid email format', 400, {
        error: 'Invalid email format',
      }),
    );
    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(screen.getByText('Invalid email format')).toBeTruthy(),
    );
    expect(document.body.textContent).not.toContain(VALID_PASSWORD);
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });

  it('maps 503 to a temporary unavailability notice', async () => {
    mockRegister.mockRejectedValueOnce(
      new AuthApiError('Service unavailable', 503, null),
    );
    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Registration is temporarily unavailable. Please try again.',
        ),
      ).toBeTruthy(),
    );
  });

  it('maps unexpected failures to a generic notice', async () => {
    mockRegister.mockRejectedValueOnce(new Error('network down'));
    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText('Unable to create your account. Please try again.'),
      ).toBeTruthy(),
    );
  });
});

describe('RegisterScreen session persistence failure', () => {
  it('shows account-created message and does not retry register', async () => {
    mockRegister.mockResolvedValueOnce({
      message: 'Registration successful',
      sessionToken: SESSION_TOKEN,
    });
    mockEstablishSession.mockRejectedValueOnce(
      new Error('Unable to store session token'),
    );

    render(<RegisterScreen />);
    fillValidForm();
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Your account was created, but this device could not save your login session. Please log in.',
        ),
      ).toBeTruthy(),
    );
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
  });
});
