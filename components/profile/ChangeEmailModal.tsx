import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { FormTextField } from '@/components/forms/FormTextField';
import { PasswordField } from '@/components/forms/PasswordField';
import { ThemedText } from '@/components/theme/ThemedText';
import {
  Radius,
  Spacing,
  getSemanticColors,
} from '@/constants/theme/ThemeTokens';
import { Fonts } from '@/constants/theme/Typography';
import {
  AccountApiError,
  requestEmailChange as requestEmailChangeApi,
} from '@/hooks/api/accountApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const EMAIL_MAX_LENGTH = 255;
/** Basic shape check — backend remains the authority for normalization. */
const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ChangeEmailModalProps = {
  visible: boolean;
  /** Current Profile email (already normalized by backend). */
  currentEmail: string;
  onDismiss: () => void;
  /** Verification emails were initiated; Profile.email is unchanged. */
  onSuccess: () => void;
};

type FieldErrors = {
  newEmail?: string;
  currentPassword?: string;
};

function validateNewEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Email is required.';
  }
  if (trimmed.length > EMAIL_MAX_LENGTH || !BASIC_EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

function validateCurrentPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Current password is required.';
  }
  return undefined;
}

function mapRequestEmailChangeError(error: unknown): string {
  if (error instanceof AccountApiError) {
    if (error.status === 401) {
      return 'Your email could not be changed with the current session.';
    }
    if (error.status === 503) {
      return 'Verification emails could not be sent. Please try again.';
    }
    if (error.status === 409) {
      return 'An account with this email already exists.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (/current password is incorrect/i.test(message)) {
        return 'Current password is incorrect.';
      }
      if (
        message.length > 0 &&
        message.length < 200 &&
        !message.includes('{') &&
        !/token|stack|traceback/i.test(message)
      ) {
        return message;
      }
      return 'Please check your email and password and try again.';
    }
  }
  return 'Unable to start the email change. Please try again.';
}

/**
 * Change Email sheet — starts dual-confirmation flow.
 * Does not change Profile.email or rotate/clear Session on success.
 */
export function ChangeEmailModal({
  visible,
  currentEmail,
  onDismiss,
  onSuccess,
}: ChangeEmailModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const { token } = useAuthSession();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setNewEmail('');
    setCurrentPassword('');
    setFieldErrors({});
    setSubmitError(null);
  }, []);

  useEffect(() => {
    resetForm();
    setIsSubmitting(false);
  }, [visible, resetForm]);

  const handleDismiss = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    resetForm();
    onDismiss();
  }, [isSubmitting, onDismiss, resetForm]);

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

    const trimmedEmail = newEmail.trim();
    const nextErrors: FieldErrors = {
      newEmail: validateNewEmail(newEmail),
      currentPassword: validateCurrentPassword(currentPassword),
    };

    // Conservative same-email check aligned with backend casefold storage.
    if (
      !nextErrors.newEmail &&
      trimmedEmail.toLowerCase() === currentEmail.toLowerCase()
    ) {
      nextErrors.newEmail =
        'New email must be different from your current email.';
    }

    setFieldErrors(nextErrors);
    setSubmitError(null);

    if (nextErrors.newEmail || nextErrors.currentPassword) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Your email could not be changed with the current session.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await requestEmailChangeApi({
        token,
        newEmail: trimmedEmail,
        currentPassword,
      });
      resetForm();
      onSuccess();
    } catch (error) {
      setSubmitError(mapRequestEmailChangeError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentEmail,
    currentPassword,
    isSubmitting,
    newEmail,
    onSuccess,
    resetForm,
    token,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss change email"
          style={[styles.scrim, { backgroundColor: semantic.overlayScrim }]}
          disabled={isSubmitting}
          onPress={handleDismiss}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: semantic.cardBackground,
                borderTopColor: semantic.hairline,
                paddingBottom: Math.max(insets.bottom, Spacing.md),
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.headerRow}>
                <ThemedText
                  type="subtitle"
                  style={[styles.title, { color: interactive.primary }]}
                  accessibilityRole="header"
                >
                  Change Email
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  hitSlop={12}
                  onPress={handleDismiss}
                  testID="change-email-cancel"
                >
                  <ThemedText
                    style={[
                      styles.cancelLabel,
                      {
                        color: semantic.mutedText,
                        opacity: isSubmitting ? 0.45 : 1,
                      },
                    ]}
                  >
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>

              {submitError ? (
                <FormNotice
                  tone="error"
                  title="Unable to change email"
                  message={submitError}
                />
              ) : null}

              <View style={styles.fields}>
                <FormTextField
                  label="New Email"
                  value={newEmail}
                  onChangeText={(text) => {
                    setNewEmail(text);
                    clearFieldError('newEmail');
                  }}
                  error={fieldErrors.newEmail}
                  disabled={isSubmitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                />
                <PasswordField
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    clearFieldError('currentPassword');
                  }}
                  error={fieldErrors.currentPassword}
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
                label="Send Verification"
                onPress={() => {
                  void handleSubmit();
                }}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    maxHeight: '92%',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.containerPadding,
    paddingTop: Spacing.md,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fields: {
    gap: Spacing.md,
  },
});
