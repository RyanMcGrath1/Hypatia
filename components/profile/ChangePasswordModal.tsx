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
  changePassword as changePasswordRequest,
} from '@/hooks/api/accountApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const PASSWORD_MIN_LENGTH = 15;

const SESSION_PERSISTENCE_FAILURE_MESSAGE =
  'Your password was changed, but this device could not save your new login session. Please log in again.';

export type ChangePasswordModalProps = {
  visible: boolean;
  /** Cancel / backdrop / hardware back — clear fields and close. */
  onDismiss: () => void;
  /** Password changed and replaceSession succeeded. */
  onSuccess: () => void;
  /**
   * Password changed on the server but local Session persistence failed.
   * Parent should expect the Session to have been cleared.
   */
  onReauthRequired: (message: string) => void;
};

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
};

function validateCurrentPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Current password is required.';
  }
  return undefined;
}

function validateNewPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'New password is required.';
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 15 characters.';
  }
  return undefined;
}

function validateConfirmPassword(
  confirm: string,
  newPassword: string,
): string | undefined {
  if (confirm.length === 0) {
    return 'Confirm new password is required.';
  }
  if (confirm !== newPassword) {
    return 'Passwords do not match.';
  }
  return undefined;
}

function mapChangePasswordApiError(error: unknown): string {
  if (error instanceof AccountApiError) {
    if (error.status === 401) {
      return 'Your password could not be changed with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (
        message.length > 0 &&
        message.length < 200 &&
        !message.includes('{') &&
        !/token|stack|traceback/i.test(message)
      ) {
        // Prefer client-facing confirm copy when backend mismatch message differs.
        if (/new passwords do not match/i.test(message)) {
          return 'Passwords do not match.';
        }
        return message;
      }
      return 'Please check your password details and try again.';
    }
  }
  return 'Unable to change your password. Please try again.';
}

/**
 * Change Password sheet — local password state only; Session rotation via
 * AuthProvider.replaceSession after a successful accountApi.changePassword.
 */
export function ChangePasswordModal({
  visible,
  onDismiss,
  onSuccess,
  onReauthRequired,
}: ChangePasswordModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const { token, replaceSession, clearSession } = useAuthSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFieldErrors({});
    setSubmitError(null);
  }, []);

  // Opening always starts blank; closing clears any retained credentials.
  useEffect(() => {
    if (visible) {
      resetForm();
      setIsSubmitting(false);
    } else {
      resetForm();
      setIsSubmitting(false);
    }
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

    const nextErrors: FieldErrors = {
      currentPassword: validateCurrentPassword(currentPassword),
      newPassword: validateNewPassword(newPassword),
      confirmNewPassword: validateConfirmPassword(
        confirmNewPassword,
        newPassword,
      ),
    };
    setFieldErrors(nextErrors);
    setSubmitError(null);

    if (
      nextErrors.currentPassword ||
      nextErrors.newPassword ||
      nextErrors.confirmNewPassword
    ) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Your password could not be changed with the current session.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePasswordRequest({
        token,
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      try {
        await replaceSession(result.sessionToken);
      } catch {
        resetForm();
        try {
          await clearSession();
        } catch {
          // clearSession still drops in-memory auth even if storage fails.
        }
        onReauthRequired(SESSION_PERSISTENCE_FAILURE_MESSAGE);
        return;
      }

      resetForm();
      onSuccess();
    } catch (error) {
      setSubmitError(mapChangePasswordApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearSession,
    confirmNewPassword,
    currentPassword,
    isSubmitting,
    newPassword,
    onReauthRequired,
    onSuccess,
    replaceSession,
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
          accessibilityLabel="Dismiss change password"
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
                  Change Password
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  hitSlop={12}
                  onPress={handleDismiss}
                  testID="change-password-cancel"
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
                  title="Unable to change password"
                  message={submitError}
                />
              ) : null}

              <View style={styles.fields}>
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
                  returnKeyType="next"
                />
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    clearFieldError('newPassword');
                    if (fieldErrors.confirmNewPassword) {
                      clearFieldError('confirmNewPassword');
                    }
                  }}
                  error={fieldErrors.newPassword}
                  helperText="Use at least 15 characters."
                  disabled={isSubmitting}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                />
                <PasswordField
                  label="Confirm New Password"
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    clearFieldError('confirmNewPassword');
                  }}
                  error={fieldErrors.confirmNewPassword}
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
                label="Change Password"
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
