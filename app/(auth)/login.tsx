import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import darkLogo from '@/assets/images/dark-logo.png';
import lightLogo from '@/assets/images/light-logo.png';
import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { FormTextField } from '@/components/forms/FormTextField';
import { PasswordField } from '@/components/forms/PasswordField';
import { ThemedText } from '@/components/theme/ThemedText';
import { ThemedView } from '@/components/theme/ThemedView';
import { AppRoutes } from '@/constants/app/routes';
import { Spacing } from '@/constants/theme/ThemeTokens';
import { AuthApiError, login as loginAccount } from '@/hooks/api/authApi';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const EMAIL_MAX_LENGTH = 255;

/** Basic email shape check — backend remains the authority. */
const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Email is required.';
  }
  if (trimmed.length > EMAIL_MAX_LENGTH || !BASIC_EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Password is required.';
  }
  return undefined;
}

function mapLoginApiError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      return 'Invalid email or password.';
    }
    if (error.status === 403) {
      return 'You do not have access to sign in right now.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Please try again later.';
    }
    if (error.status === 503) {
      return 'Login is temporarily unavailable. Please try again.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (
        message.length > 0 &&
        message.length < 200 &&
        !message.includes('{') &&
        !/token|password|stack|traceback/i.test(message)
      ) {
        return message;
      }
      return 'Please check your details and try again.';
    }
  }
  return 'Unable to log in. Please try again.';
}

/**
 * Login screen for unauthenticated users (`canAccessApp === false`).
 * Authenticates via authApi, then establishes a session through AuthProvider.
 *
 * When the backend requires TOTP, the MFA challenge is held only in
 * AuthFlowProvider memory and the user is sent to login-totp — no Session yet.
 *
 * Dev note: with `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`, `(auth)` is gated off.
 * Set bypass to false and reload to exercise this screen locally.
 */
export default function LoginScreen() {
  const { establishSession } = useAuthSession();
  const { beginTotpLogin, clearTotpLogin } = useAuthFlow();
  const interactive = useThemeInteractive();
  const colorScheme = useColorScheme() ?? 'light';
  const logoSource = colorScheme === 'dark' ? darkLogo : lightLogo;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [formNoticeTone, setFormNoticeTone] = useState<'error' | 'info'>(
    'error',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) {
      return;
    }

    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };

    setFieldErrors(nextErrors);
    setFormNotice(null);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    const trimmedEmail = email.trim();

    // Fresh password Login must not carry a stale MFA challenge forward.
    clearTotpLogin();

    setIsSubmitting(true);
    try {
      const result = await loginAccount({
        email: trimmedEmail,
        password,
      });

      if (result.kind === 'totp_required') {
        // Challenge stays in AuthFlowProvider memory only — never Session/storage/URL.
        beginTotpLogin(result.challengeToken);
        router.replace(
          AppRoutes.authLoginTotp as Parameters<typeof router.replace>[0],
        );
        return;
      }

      try {
        await establishSession(result.sessionToken);
      } catch {
        setFormNoticeTone('error');
        setFormNotice(
          'Your credentials were accepted, but this device could not save your login session. Please try again.',
        );
        return;
      }

      // Protected `(app)` unlocks via canAccessApp; replace selects the home tab.
      router.replace(
        AppRoutes.tabsRoot as Parameters<typeof router.replace>[0],
      );
    } catch (error) {
      setFormNoticeTone('error');
      setFormNotice(mapLoginApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    beginTotpLogin,
    clearTotpLogin,
    email,
    establishSession,
    isSubmitting,
    password,
  ]);

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
          <View style={styles.logoWrap}>
            <Image
              source={logoSource}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Hypatia"
            />
          </View>

          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Log in
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in to Hypatia with your email and password.
            </ThemedText>
          </View>

          {formNotice ? (
            <FormNotice
              tone={formNoticeTone}
              title="Login"
              message={formNotice}
            />
          ) : null}

          <View style={styles.fields}>
            <FormTextField
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              error={fieldErrors.email}
              disabled={isSubmitting}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
            />
            <PasswordField
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              error={fieldErrors.password}
              disabled={isSubmitting}
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleSubmit();
              }}
            />
          </View>

          <FormButton
            label="Log In"
            onPress={() => {
              void handleSubmit();
            }}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          />

          <ThemedText
            style={styles.forgotPassword}
            accessibilityRole="text"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Forgot Password (coming soon)"
          >
            Forgot Password
          </ThemedText>

          <View style={styles.registerRow}>
            <ThemedText style={styles.registerPrompt}>
              {"Don't have an account?"}
            </ThemedText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Create Account"
              disabled={isSubmitting}
              onPress={() => {
                router.push(
                  AppRoutes.authRegister as Parameters<typeof router.push>[0],
                );
              }}
              hitSlop={8}
            >
              <ThemedText
                style={[styles.registerLink, { color: interactive.primary }]}
              >
                Create Account
              </ThemedText>
            </Pressable>
          </View>
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
  logoWrap: {
    alignItems: 'center',
    marginTop: -Spacing.lg,
  },
  logo: {
    width: 360,
    height: 110,
  },
  header: {
    gap: Spacing.xs,
  },
  subtitle: {
    opacity: 0.85,
  },
  fields: {
    gap: Spacing.md,
  },
  forgotPassword: {
    alignSelf: 'center',
    opacity: 0.45,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  registerPrompt: {
    opacity: 0.85,
  },
  registerLink: {
    fontWeight: '600',
  },
});
