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

import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { FormTextField } from '@/components/forms/FormTextField';
import { PasswordField } from '@/components/forms/PasswordField';
import { ThemedText } from '@/components/theme/ThemedText';
import { ThemedView } from '@/components/theme/ThemedView';
import { AppRoutes } from '@/constants/app/routes';
import { Spacing } from '@/constants/theme/ThemeTokens';
import { AuthApiError, register as registerAccount } from '@/hooks/api/authApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const NAME_MAX_LENGTH = 128;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 15;

/** Basic email shape check — backend remains the authority. */
const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

function validateName(
  value: string,
  label: 'First name' | 'Last name',
): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${label} is required.`;
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `${label} must be 128 characters or fewer.`;
  }
  return undefined;
}

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
  if (value.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 15 characters.';
  }
  return undefined;
}

function mapRegisterApiError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 409) {
      return 'An account with this email already exists.';
    }
    if (error.status === 503) {
      return 'Registration is temporarily unavailable. Please try again.';
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
  return 'Unable to create your account. Please try again.';
}

/**
 * Registration screen for unauthenticated users (`canAccessApp === false`).
 * Creates an account via authApi, then establishes a session through AuthProvider.
 *
 * Dev note: with `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`, `(auth)` is gated off.
 * Set bypass to false and reload to exercise this screen locally.
 */
export default function RegisterScreen() {
  const { establishSession } = useAuthSession();
  const interactive = useThemeInteractive();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
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
      firstName: validateName(firstName, 'First name'),
      lastName: validateName(lastName, 'Last name'),
      email: validateEmail(email),
      password: validatePassword(password),
    };

    setFieldErrors(nextErrors);
    setFormNotice(null);

    if (
      nextErrors.firstName ||
      nextErrors.lastName ||
      nextErrors.email ||
      nextErrors.password
    ) {
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    setIsSubmitting(true);
    try {
      const result = await registerAccount({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password,
      });

      try {
        await establishSession(result.sessionToken);
      } catch {
        // Registration already succeeded — never auto-retry register.
        setFormNotice(
          'Your account was created, but this device could not save your login session. Please log in.',
        );
        return;
      }

      // Protected `(app)` unlocks via canAccessApp; replace selects the home tab.
      router.replace(
        AppRoutes.tabsRoot as Parameters<typeof router.replace>[0],
      );
    } catch (error) {
      setFormNotice(mapRegisterApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    email,
    establishSession,
    firstName,
    isSubmitting,
    lastName,
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
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header">
              Create your account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Join Hypatia with your name, email, and a password.
            </ThemedText>
          </View>

          {formNotice ? (
            <FormNotice tone="error" title="Registration" message={formNotice} />
          ) : null}

          <View style={styles.fields}>
            <FormTextField
              label="First Name"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                clearFieldError('firstName');
              }}
              error={fieldErrors.firstName}
              disabled={isSubmitting}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              blurOnSubmit={false}
            />
            <FormTextField
              label="Last Name"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                clearFieldError('lastName');
              }}
              error={fieldErrors.lastName}
              disabled={isSubmitting}
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              returnKeyType="next"
              blurOnSubmit={false}
            />
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
              helperText="Use at least 15 characters."
              disabled={isSubmitting}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleSubmit();
              }}
            />
          </View>

          <FormButton
            label="Create Account"
            onPress={() => {
              void handleSubmit();
            }}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          />

          <View style={styles.loginRow}>
            <ThemedText style={styles.loginPrompt}>
              Already have an account?
            </ThemedText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Log In"
              disabled={isSubmitting}
              onPress={() => {
                router.push(
                  AppRoutes.authLogin as Parameters<typeof router.push>[0],
                );
              }}
              hitSlop={8}
            >
              <ThemedText
                style={[styles.loginLink, { color: interactive.primary }]}
              >
                Log In
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
  header: {
    gap: Spacing.xs,
  },
  subtitle: {
    opacity: 0.85,
  },
  fields: {
    gap: Spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  loginPrompt: {
    opacity: 0.85,
  },
  loginLink: {
    fontWeight: '600',
  },
});
