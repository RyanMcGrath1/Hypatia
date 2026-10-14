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
  deleteAccount as deleteAccountRequest,
} from '@/hooks/api/accountApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const TOTP_CODE_LENGTH = 6;
const DIGITS_ONLY_RE = /^\d{6}$/;
const DELETE_CONFIRMATION = 'DELETE';

const SESSION_CLEANUP_WARNING =
  'Your account was deleted, but this device had trouble clearing its saved login information.';

type FieldErrors = {
  currentPassword?: string;
  totpCode?: string;
  confirmation?: string;
};

function validateCurrentPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Current password is required.';
  }
  return undefined;
}

function validateTotpCode(value: string): string | undefined {
  if (value.length === 0 || !DIGITS_ONLY_RE.test(value)) {
    return 'Enter the 6-digit authenticator code.';
  }
  return undefined;
}

function validateConfirmation(value: string): string | undefined {
  if (value !== DELETE_CONFIRMATION) {
    return 'Type DELETE exactly to confirm account deletion.';
  }
  return undefined;
}

function isSafeApiMessage(message: string): boolean {
  return (
    message.length > 0 &&
    message.length < 200 &&
    !message.includes('{') &&
    !/token|stack|traceback|authorization|password|secret/i.test(message)
  );
}

function mapDeleteApiError(error: unknown): string {
  if (error instanceof AccountApiError) {
    if (error.status === 401) {
      return 'Your account could not be deleted with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (/current password is incorrect/i.test(message)) {
        return 'Current password is incorrect.';
      }
      if (/confirmation must be DELETE/i.test(message)) {
        return 'Type DELETE exactly to confirm account deletion.';
      }
      if (/invalid authenticator code/i.test(message)) {
        return 'Invalid authenticator code.';
      }
      if (isSafeApiMessage(message)) {
        return message;
      }
      return 'Please check your details and try again.';
    }
  }
  return 'Unable to delete your account. Please try again.';
}

export type DeleteAccountConfirmModalProps = {
  visible: boolean;
  /** Real Profile.totpEnabled — controls whether totp_code is required. */
  totpEnabled: boolean;
  /** Cancel / backdrop / hardware back — clear fields and close. */
  onDismiss: () => void;
  /**
   * Backend deletion succeeded and local Session cleanup completed
   * (or in-memory auth was cleared despite a storage warning).
   */
  onDeleted: (opts?: { cleanupWarning?: string }) => void;
};

/**
 * Delete Account confirmation sheet — password + exact DELETE confirmation,
 * with conditional authenticator code when Profile.totpEnabled is true.
 *
 * On backend success, clears the Session via AuthProvider.clearSession.
 * Does not rotate or establish a new Session — none is returned by delete.
 */
export function DeleteAccountConfirmModal({
  visible,
  totpEnabled,
  onDismiss,
  onDeleted,
}: DeleteAccountConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const { token, clearSession } = useAuthSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setTotpCode('');
    setConfirmation('');
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

  const canSubmit =
    !isSubmitting &&
    currentPassword.length > 0 &&
    confirmation === DELETE_CONFIRMATION &&
    (!totpEnabled || DIGITS_ONLY_RE.test(totpCode));

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const nextErrors: FieldErrors = {
      currentPassword: validateCurrentPassword(currentPassword),
      confirmation: validateConfirmation(confirmation),
    };
    if (totpEnabled) {
      nextErrors.totpCode = validateTotpCode(totpCode);
    }
    setFieldErrors(nextErrors);
    setSubmitError(null);

    if (
      nextErrors.currentPassword ||
      nextErrors.confirmation ||
      nextErrors.totpCode
    ) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Your account could not be deleted with the current session.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAccountRequest({
        token,
        currentPassword,
        confirmation,
        ...(totpEnabled ? { totpCode } : {}),
      });

      // Backend already deleted/anonymized the account and revoked Sessions.
      let cleanupWarning: string | undefined;
      try {
        await clearSession();
      } catch {
        // clearSession still drops in-memory auth even if storage fails.
        // Account deletion succeeded — do not retry DELETE or report failure.
        cleanupWarning = SESSION_CLEANUP_WARNING;
      }

      resetForm();
      onDeleted(cleanupWarning ? { cleanupWarning } : undefined);
    } catch (error) {
      setSubmitError(mapDeleteApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearSession,
    confirmation,
    currentPassword,
    isSubmitting,
    onDeleted,
    resetForm,
    token,
    totpCode,
    totpEnabled,
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
          accessibilityLabel="Dismiss delete account"
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
            testID="delete-account-modal"
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.headerRow}>
                <ThemedText
                  type="subtitle"
                  style={[styles.title, { color: interactive.danger }]}
                  accessibilityRole="header"
                >
                  Delete Account
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  hitSlop={12}
                  onPress={handleDismiss}
                  testID="delete-account-cancel"
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

              <FormNotice
                tone="error"
                title="This action cannot be undone from this screen"
                message={
                  totpEnabled
                    ? 'This action will delete your Hypatia account and sign you out. To continue, enter your current password, enter your authenticator code, and type DELETE exactly.'
                    : 'This action will delete your Hypatia account and sign you out. To continue, enter your current password and type DELETE exactly.'
                }
              />

              {submitError ? (
                <FormNotice
                  tone="error"
                  title="Unable to delete account"
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
                {totpEnabled ? (
                  <FormTextField
                    label="Authenticator Code"
                    value={totpCode}
                    onChangeText={(text) => {
                      setTotpCode(text);
                      clearFieldError('totpCode');
                    }}
                    error={fieldErrors.totpCode}
                    disabled={isSubmitting}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={TOTP_CODE_LENGTH}
                    returnKeyType="next"
                  />
                ) : null}
                <FormTextField
                  label="Type DELETE to confirm"
                  value={confirmation}
                  onChangeText={(text) => {
                    setConfirmation(text);
                    clearFieldError('confirmation');
                  }}
                  error={fieldErrors.confirmation}
                  disabled={isSubmitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canSubmit) {
                      void handleSubmit();
                    }
                  }}
                />
              </View>

              <FormButton
                label="Delete Account"
                variant="destructive"
                onPress={() => {
                  void handleSubmit();
                }}
                isLoading={isSubmitting}
                disabled={!canSubmit}
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
    ...StyleSheet.absoluteFill,
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
