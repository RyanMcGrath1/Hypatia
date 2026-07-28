import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { FormTextField } from '@/components/forms/FormTextField';
import { ThemedText } from '@/components/theme/ThemedText';
import { ThemedView } from '@/components/theme/ThemedView';
import { AppRoutes } from '@/constants/app/routes';
import { Spacing } from '@/constants/theme/ThemeTokens';
import {
  AuthApiError,
  completeTotpLogin,
} from '@/hooks/api/authApi';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const TOTP_CODE_LENGTH = 6;
const DIGITS_ONLY_RE = /^\d{6}$/;

type FieldErrors = {
  code?: string;
};

/**
 * Normalize authenticator code for validation/submission.
 * Trims surrounding whitespace only — never converts to Number (leading zeroes
 * like "012345" must remain the string "012345").
 */
function normalizeTotpCode(value: string): string {
  return value.trim();
}

function validateTotpCode(value: string): string | undefined {
  const normalized = normalizeTotpCode(value);
  if (normalized.length === 0) {
    return 'Authenticator code is required.';
  }
  if (!DIGITS_ONLY_RE.test(normalized)) {
    return 'Enter the 6-digit authenticator code.';
  }
  return undefined;
}

/**
 * Map TOTP completion API errors to safe user-facing copy.
 *
 * Backend contract (POST /api/auth/login/totp):
 * - Invalid code, expired/consumed/exhausted challenge, and nonexistent
 *   challenge all return HTTP 401 with the generic credentials message.
 * - The responses are intentionally indistinguishable, so the frontend cannot
 *   detect challenge death from status/message alone.
 * - On 401 we keep the in-memory challenge and allow another attempt (correct
 *   for ordinary wrong codes). Users with a dead challenge use Back to Log In.
 */
function mapTotpApiError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      return 'Invalid authenticator code.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Please try again later.';
    }
    if (error.status === 503) {
      return 'Verification is temporarily unavailable. Please try again.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (
        message.length > 0 &&
        message.length < 200 &&
        !message.includes('{') &&
        !/token|challenge|password|stack|traceback/i.test(message)
      ) {
        return message;
      }
      return 'Please check your authenticator code and try again.';
    }
  }
  return 'Unable to verify. Please try again.';
}

/**
 * Authenticator (TOTP) verification after password Login returns totp_required.
 * Challenge comes from AuthFlowProvider memory only — never URL/params/storage.
 *
 * Dev note: with `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`, `(auth)` is gated off.
 * Set bypass to false and use a TOTP-enabled account to exercise this screen.
 */
export default function LoginTotpScreen() {
  const { pendingTotpChallenge, clearTotpLogin } = useAuthFlow();
  const { establishSession } = useAuthSession();
  const interactive = useThemeInteractive();

  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Challenge cleared after verified-but-unpersisted Session — keep UI for the notice. */
  const [sessionPersistFailed, setSessionPersistFailed] = useState(false);
  /** Skip missing-challenge → Login redirect after a successful Session was established. */
  const [totpCompleted, setTotpCompleted] = useState(false);

  // Direct navigation / reload loses in-memory challenge — return to Login.
  useEffect(() => {
    if (
      pendingTotpChallenge === null &&
      !sessionPersistFailed &&
      !totpCompleted
    ) {
      router.replace(
        AppRoutes.authLogin as Parameters<typeof router.replace>[0],
      );
    }
  }, [pendingTotpChallenge, sessionPersistFailed, totpCompleted]);

  const goBackToLogin = useCallback(() => {
    clearTotpLogin();
    router.replace(
      AppRoutes.authLogin as Parameters<typeof router.replace>[0],
    );
  }, [clearTotpLogin]);

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || sessionPersistFailed || totpCompleted) {
      return;
    }

    const challengeToken = pendingTotpChallenge;
    if (challengeToken === null) {
      router.replace(
        AppRoutes.authLogin as Parameters<typeof router.replace>[0],
      );
      return;
    }

    const nextErrors: FieldErrors = {
      code: validateTotpCode(code),
    };
    setFieldErrors(nextErrors);
    setFormNotice(null);

    if (nextErrors.code) {
      return;
    }

    const normalizedCode = normalizeTotpCode(code);

    setIsSubmitting(true);
    try {
      const result = await completeTotpLogin({
        challengeToken,
        code: normalizedCode,
      });

      try {
        await establishSession(result.sessionToken);
      } catch {
        // Backend already consumed the challenge; local persist failed.
        clearTotpLogin();
        setSessionPersistFailed(true);
        setFormNotice(
          'Your sign-in was verified, but this device could not save your login session. Please log in again.',
        );
        return;
      }

      // Mark complete before clearing so the missing-challenge effect does not
      // replace back to Login and race the tabsRoot navigation.
      setTotpCompleted(true);
      clearTotpLogin();
      router.replace(
        AppRoutes.tabsRoot as Parameters<typeof router.replace>[0],
      );
    } catch (error) {
      // 401 and transient errors: keep challenge when still held so the user
      // can retry ordinary wrong codes (backend does not signal challenge death).
      setFormNotice(mapTotpApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearTotpLogin,
    code,
    establishSession,
    isSubmitting,
    pendingTotpChallenge,
    sessionPersistFailed,
    totpCompleted,
  ]);

  // Avoid flashing a broken form while redirecting without a challenge.
  if (pendingTotpChallenge === null && !sessionPersistFailed && !totpCompleted) {
    return <ThemedView style={styles.screen} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Hypatia
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitleHeading}>
              Authenticator Verification
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter the 6-digit code from your authenticator app.
            </ThemedText>
          </View>

          {formNotice ? (
            <FormNotice
              tone="error"
              title="Verification"
              message={formNotice}
            />
          ) : null}

          {!sessionPersistFailed ? (
            <>
              <View style={styles.fields}>
                <FormTextField
                  label="Authenticator Code"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    clearFieldError('code');
                  }}
                  error={fieldErrors.code}
                  disabled={isSubmitting}
                  keyboardType="number-pad"
                  maxLength={TOTP_CODE_LENGTH}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                />
              </View>

              <FormButton
                label="Verify"
                onPress={() => {
                  void handleSubmit();
                }}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              />
            </>
          ) : null}

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Back to Log In"
            disabled={isSubmitting}
            onPress={goBackToLogin}
            hitSlop={8}
            style={styles.backRow}
          >
            <ThemedText
              style={[styles.backLink, { color: interactive.primary }]}
            >
              Back to Log In
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.containerPadding,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  subtitleHeading: {
    marginTop: Spacing.xs,
  },
  subtitle: {
    opacity: 0.85,
  },
  fields: {
    gap: Spacing.md,
  },
  backRow: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
  },
  backLink: {
    fontWeight: '600',
  },
});
