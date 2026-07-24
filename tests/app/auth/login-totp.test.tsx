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
      maxLength?: number;
      autoFocus?: boolean;
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
      maxLength,
      autoFocus,
    },
    ref,
  ) {
    return React.createElement('input', {
      ref,
      value: value ?? '',
      placeholder,
      type: secureTextEntry ? 'password' : 'text',
      disabled: editable === false,
      maxLength,
      autoFocus,
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
  mockCompleteTotpLogin,
  mockEstablishSession,
  mockReplace,
  mockPush,
  mockClearTotpLogin,
  authFlowState,
} = vi.hoisted(() => ({
  mockCompleteTotpLogin: vi.fn(),
  mockEstablishSession: vi.fn(),
  mockReplace: vi.fn(),
  mockPush: vi.fn(),
  mockClearTotpLogin: vi.fn(),
  authFlowState: {
    pendingTotpChallenge: null as string | null,
  },
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
    completeTotpLogin: (...args: unknown[]) => mockCompleteTotpLogin(...args),
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
    get pendingTotpChallenge() {
      return authFlowState.pendingTotpChallenge;
    },
    beginTotpLogin: vi.fn(),
    clearTotpLogin: (...args: unknown[]) => {
      authFlowState.pendingTotpChallenge = null;
      return mockClearTotpLogin(...args);
    },
  }),
}));

vi.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

import LoginTotpScreen from '@/app/(auth)/login-totp';
import { AuthApiError } from '@/hooks/api/authApi';
import { AppRoutes } from '@/constants/app/routes';

const SESSION_TOKEN = 'opaque_session_tok_TotpLoginTest456';
const CHALLENGE_TOKEN = 'secret-challenge-exact-value';
const LEADING_ZERO_CODE = '012345';

function fillCode(value: string) {
  fireEvent.change(screen.getByLabelText('Authenticator Code'), {
    target: { value },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockCompleteTotpLogin.mockReset();
  mockEstablishSession.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockClearTotpLogin.mockReset();
  authFlowState.pendingTotpChallenge = CHALLENGE_TOKEN;
  mockEstablishSession.mockResolvedValue(undefined);
});

describe('LoginTotpScreen rendering', () => {
  it('renders brand, instructions, code field, Verify, and Back to Log In', () => {
    render(<LoginTotpScreen />);

    expect(screen.getByText('Hypatia')).toBeTruthy();
    expect(screen.getByText('Authenticator Verification')).toBeTruthy();
    expect(
      screen.getByText('Enter the 6-digit code from your authenticator app.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Authenticator Code')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
    expect(screen.getByLabelText('Back to Log In')).toBeTruthy();
  });

  it('does not render AppBanner and has no tokenStorage/SecureStore imports', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/login-totp.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/AppBanner/);
    expect(source).not.toMatch(/tokenStorage/);
    expect(source).not.toMatch(/SecureStore/);
    expect(source).not.toMatch(/setSessionToken/);
    expect(source).not.toMatch(/console\.(log|debug|info|warn|error)/);
    expect(source).not.toMatch(/Bearer/);

    render(<LoginTotpScreen />);
    expect(screen.queryByText('Profile')).toBeNull();
    expect(document.body.textContent).not.toContain(CHALLENGE_TOKEN);
  });
});

describe('LoginTotpScreen missing challenge', () => {
  it('replaces to Login and does not call the API when challenge is null', () => {
    authFlowState.pendingTotpChallenge = null;

    render(<LoginTotpScreen />);

    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.authLogin);
    expect(mockCompleteTotpLogin).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Authenticator Code')).toBeNull();
  });
});

describe('LoginTotpScreen validation', () => {
  it('rejects a blank code', () => {
    render(<LoginTotpScreen />);
    submit();

    expect(screen.getByText('Authenticator code is required.')).toBeTruthy();
    expect(mockCompleteTotpLogin).not.toHaveBeenCalled();
  });

  it('rejects fewer than 6 digits', () => {
    render(<LoginTotpScreen />);
    fillCode('12345');
    submit();

    expect(
      screen.getByText('Enter the 6-digit authenticator code.'),
    ).toBeTruthy();
    expect(mockCompleteTotpLogin).not.toHaveBeenCalled();
  });

  it('rejects letters', () => {
    render(<LoginTotpScreen />);
    fillCode('12ab56');
    submit();

    expect(
      screen.getByText('Enter the 6-digit authenticator code.'),
    ).toBeTruthy();
    expect(mockCompleteTotpLogin).not.toHaveBeenCalled();
  });

  it('prevents more than 6 characters via maxLength', () => {
    render(<LoginTotpScreen />);
    const input = screen.getByLabelText(
      'Authenticator Code',
    ) as HTMLInputElement;
    expect(input.maxLength).toBe(6);
  });

  it('preserves a leading-zero code like 012345 exactly as a string', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginTotpScreen />);
    fillCode(LEADING_ZERO_CODE);
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(1));
    expect(mockCompleteTotpLogin).toHaveBeenCalledWith({
      challengeToken: CHALLENGE_TOKEN,
      code: LEADING_ZERO_CODE,
    });
    expect(typeof mockCompleteTotpLogin.mock.calls[0]![0].code).toBe('string');
    expect(mockCompleteTotpLogin.mock.calls[0]![0].code).not.toBe(12345);
  });

  it('trims surrounding whitespace before validation and submission', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginTotpScreen />);
    fillCode('  654321  ');
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(1));
    expect(mockCompleteTotpLogin).toHaveBeenCalledWith({
      challengeToken: CHALLENGE_TOKEN,
      code: '654321',
    });
  });
});

describe('LoginTotpScreen submit', () => {
  it('calls completeTotpLogin once with the exact stored challenge and code', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(1));
    expect(mockCompleteTotpLogin).toHaveBeenCalledWith({
      challengeToken: CHALLENGE_TOKEN,
      code: '123456',
    });
  });

  it('prevents duplicate Verify presses while loading', async () => {
    let resolveTotp: (value: {
      message: string;
      sessionToken: string;
    }) => void = () => {};
    mockCompleteTotpLogin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTotp = resolve;
        }),
    );

    render(<LoginTotpScreen />);
    fillCode('123456');

    await act(async () => {
      submit();
    });
    await waitFor(() => expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();

    await act(async () => {
      submit();
    });
    expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveTotp({
        message: 'ok',
        sessionToken: SESSION_TOKEN,
      });
    });
  });
});

describe('LoginTotpScreen success', () => {
  it('establishes session, clears challenge, and routes to tabsRoot', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(mockEstablishSession).toHaveBeenCalledWith(SESSION_TOKEN),
    );
    expect(mockClearTotpLogin).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.tabsRoot);
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
    expect(document.body.textContent).not.toContain(CHALLENGE_TOKEN);

    const source = readFileSync(
      resolve(__dirname, '../../../app/(auth)/login-totp.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/SecureStore/);
    expect(source).not.toMatch(/tokenStorage/);
  });
});

describe('LoginTotpScreen incorrect code', () => {
  it('shows a safe error, keeps the challenge, and allows retry', async () => {
    mockCompleteTotpLogin.mockRejectedValueOnce(
      new AuthApiError('Invalid email or password', 401, {
        error: 'Invalid email or password',
      }),
    );

    render(<LoginTotpScreen />);
    fillCode('000000');
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(screen.getByText('Invalid authenticator code.')).toBeTruthy(),
    );
    // Backend returns the same 401 for wrong code and dead challenges;
    // keep challenge so ordinary wrong codes can be retried.
    expect(mockClearTotpLogin).not.toHaveBeenCalled();
    expect(authFlowState.pendingTotpChallenge).toBe(CHALLENGE_TOKEN);
    expect(mockEstablishSession).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/remaining/i);
    expect(document.body.textContent).not.toMatch(/expected code/i);

    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockCompleteTotpLogin).toHaveBeenCalledTimes(2));
    expect(mockCompleteTotpLogin.mock.calls[1]![0].challengeToken).toBe(
      CHALLENGE_TOKEN,
    );
  });
});

describe('LoginTotpScreen session persistence failure', () => {
  it('clears challenge and shows verified-but-could-not-save notice', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });
    mockEstablishSession.mockRejectedValueOnce(
      new Error('Unable to store session token'),
    );

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Your sign-in was verified, but this device could not save your login session. Please log in again.',
        ),
      ).toBeTruthy(),
    );
    expect(mockClearTotpLogin).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith(AppRoutes.tabsRoot);
    expect(screen.queryByRole('button', { name: 'Verify' })).toBeNull();
    expect(screen.getByLabelText('Back to Log In')).toBeTruthy();
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
    expect(document.body.textContent).not.toMatch(/Invalid authenticator code/);
  });
});

describe('LoginTotpScreen back to login', () => {
  it('clears challenge and replaces to Login', () => {
    render(<LoginTotpScreen />);
    fireEvent.click(screen.getByLabelText('Back to Log In'));

    expect(mockClearTotpLogin).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(AppRoutes.authLogin);
  });
});

describe('LoginTotpScreen API errors', () => {
  it('maps 503 to a temporary unavailability notice and keeps challenge', async () => {
    mockCompleteTotpLogin.mockRejectedValueOnce(
      new AuthApiError('Service unavailable', 503, null),
    );

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Verification is temporarily unavailable. Please try again.',
        ),
      ).toBeTruthy(),
    );
    expect(mockClearTotpLogin).not.toHaveBeenCalled();
  });

  it('maps unexpected failures to a generic notice', async () => {
    mockCompleteTotpLogin.mockRejectedValueOnce(new Error('network down'));

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() =>
      expect(
        screen.getByText('Unable to verify. Please try again.'),
      ).toBeTruthy(),
    );
    expect(mockClearTotpLogin).not.toHaveBeenCalled();
  });
});

describe('LoginTotpScreen security', () => {
  it('never puts challenge or session token in rendered output or router params', async () => {
    mockCompleteTotpLogin.mockResolvedValueOnce({
      message: 'Login successful',
      sessionToken: SESSION_TOKEN,
    });

    render(<LoginTotpScreen />);
    fillCode('123456');
    await act(async () => {
      submit();
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    expect(document.body.textContent).not.toContain(CHALLENGE_TOKEN);
    expect(document.body.textContent).not.toContain(SESSION_TOKEN);
    for (const call of mockReplace.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(CHALLENGE_TOKEN);
      expect(JSON.stringify(call)).not.toContain(SESSION_TOKEN);
    }
  });
});
