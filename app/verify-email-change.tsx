import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { ThemedText } from '@/components/theme/ThemedText';
import { ThemedView } from '@/components/theme/ThemedView';
import { AppRoutes } from '@/constants/app/routes';
import { Spacing } from '@/constants/theme/ThemeTokens';
import {
  AccountApiError,
  verifyEmailChange,
} from '@/hooks/api/accountApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

type ScreenState =
  | { kind: 'missing_token' }
  | { kind: 'loading' }
  | { kind: 'pending'; message: string }
  | { kind: 'completed'; message: string }
  | { kind: 'invalid' }
  | { kind: 'retryable'; message: string };

function resolveTokenParam(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    const trimmed = raw[0].trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function mapVerifyError(error: unknown): {
  kind: 'invalid' | 'retryable';
  message: string;
} {
  if (error instanceof AccountApiError) {
    if (error.status === 400 || error.status === 409) {
      return {
        kind: 'invalid',
        message:
          'This email verification link is invalid or has expired.',
      };
    }
    if (error.status === 503 || error.status >= 500) {
      return {
        kind: 'retryable',
        message: 'Unable to verify this email change. Please try again.',
      };
    }
  }
  return {
    kind: 'retryable',
    message: 'Unable to verify this email change. Please try again.',
  };
}

/**
 * Public email-change verification route (outside `(auth)` / `(app)`).
 * Deep link: hypatia://verify-email-change?token=...
 *
 * No AppBanner. Uses AuthProvider only so completed verification can clearSession.
 * The verification token is never persisted, logged, rendered, or sent as a Session credential.
 */
export default function VerifyEmailChangeScreen() {
  const insets = useSafeAreaInsets();
  const interactive = useThemeInteractive();
  const { token: tokenParam } = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const { isAuthenticated, clearSession } = useAuthSession();

  const verificationToken = resolveTokenParam(tokenParam);
  const startedForTokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const [state, setState] = useState<ScreenState>(() =>
    verificationToken ? { kind: 'loading' } : { kind: 'missing_token' },
  );

  const runVerify = useCallback(
    async (token: string) => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      setState({ kind: 'loading' });

      try {
        const result = await verifyEmailChange({ verificationToken: token });

        if (result.kind === 'completed') {
          try {
            await clearSession();
          } catch {
            // In-memory auth is cleared even when persistent deletion fails.
          }
          setState({ kind: 'completed', message: result.message });
          return;
        }

        setState({ kind: 'pending', message: result.message });
      } catch (error) {
        const mapped = mapVerifyError(error);
        if (mapped.kind === 'invalid') {
          setState({ kind: 'invalid' });
        } else {
          setState({
            kind: 'retryable',
            message: mapped.message,
          });
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [clearSession],
  );

  useEffect(() => {
    if (!verificationToken) {
      startedForTokenRef.current = null;
      setState({ kind: 'missing_token' });
      return;
    }

    if (startedForTokenRef.current === verificationToken) {
      return;
    }
    startedForTokenRef.current = verificationToken;
    void runVerify(verificationToken);
  }, [verificationToken, runVerify]);

  const goLogin = useCallback(() => {
    router.replace(AppRoutes.authLogin as Parameters<typeof router.replace>[0]);
  }, []);

  const goProfile = useCallback(() => {
    router.replace(AppRoutes.profile as Parameters<typeof router.replace>[0]);
  }, []);

  const handleRetry = useCallback(() => {
    if (!verificationToken) {
      return;
    }
    // Allow a deliberate Retry for temporary failures without persisting the token.
    startedForTokenRef.current = verificationToken;
    void runVerify(verificationToken);
  }, [runVerify, verificationToken]);

  return (
    <ThemedView
      style={[
        styles.screen,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      <View style={styles.content}>
        <ThemedText type="title" accessibilityRole="header">
          Hypatia
        </ThemedText>

        {state.kind === 'loading' ? (
          <View style={styles.loadingBlock} accessibilityLabel="Verifying email change">
            <ActivityIndicator color={interactive.primary} />
            <ThemedText style={styles.subtitle}>
              Verifying email change…
            </ThemedText>
          </View>
        ) : null}

        {state.kind === 'missing_token' ? (
          <>
            <FormNotice
              tone="error"
              title="Invalid link"
              message="Invalid email verification link."
            />
            <FormButton label="Log In" onPress={goLogin} />
          </>
        ) : null}

        {state.kind === 'pending' ? (
          <>
            <FormNotice
              tone="success"
              title="Email confirmed"
              message="One more confirmation is required. Open the verification email sent to the other email address to complete the change."
            />
            {isAuthenticated ? (
              <FormButton label="Return to Profile" onPress={goProfile} />
            ) : (
              <FormButton label="Return to Log In" onPress={goLogin} />
            )}
          </>
        ) : null}

        {state.kind === 'completed' ? (
          <>
            <FormNotice
              tone="success"
              title="Email changed successfully"
              message="Please log in again using your new email address."
            />
            <FormButton label="Log In" onPress={goLogin} />
          </>
        ) : null}

        {state.kind === 'invalid' ? (
          <>
            <FormNotice
              tone="error"
              title="Unable to verify"
              message="This email verification link is invalid or has expired. Log in and start the email change again."
            />
            <FormButton label="Log In" onPress={goLogin} />
          </>
        ) : null}

        {state.kind === 'retryable' ? (
          <>
            <FormNotice
              tone="error"
              title="Unable to verify"
              message={state.message}
            />
            <FormButton label="Retry" onPress={handleRetry} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log In"
              onPress={goLogin}
              hitSlop={8}
            >
              <ThemedText
                style={[styles.link, { color: interactive.primary }]}
              >
                Log In
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.containerPadding,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  subtitle: {
    opacity: 0.85,
    textAlign: 'center',
  },
  link: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});
