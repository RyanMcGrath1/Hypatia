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
  SecurityTotpApiError,
  disableTotp as disableTotpRequest,
} from '@/hooks/api/securityTotpApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const TOTP_CODE_LENGTH = 6;
const DIGITS_ONLY_RE = /^\d{6}$/;

const SESSION_PERSISTENCE_FAILURE_MESSAGE =
  'Authenticator app was disabled, but this device could not save your new login session. Please log in again.';

type FieldErrors = {
  currentPassword?: string;
  code?: string;
};

/**
 * Normalize authenticator code for validation/submission.
 * Trims surrounding whitespace only — never converts to Number.
 */
function normalizeTotpCode(value: string): string {
  return value.trim();
}

function validateCurrentPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Current password is required.';
  }
  return undefined;
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

function isSafeApiMessage(message: string): boolean {
  return (
    message.length > 0 &&
    message.length < 200 &&
    !message.includes('{') &&
    !/token|stack|traceback|secret|provisioning|otpauth/i.test(message)
  );
}

function mapDisableApiError(error: unknown): string {
  if (error instanceof SecurityTotpApiError) {
    if (error.status === 401) {
      return 'Authenticator could not be disabled with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (/invalid authenticator code/i.test(message)) {
        return 'Invalid authenticator code.';
      }
      if (isSafeApiMessage(message)) {
        return message;
      }
      return 'Please check your password and authenticator code and try again.';
    }
  }
  return 'Unable to disable authenticator. Please try again.';
}

export type TotpDisableModalProps = {
  visible: boolean;
  /** Cancel / backdrop / hardware back — clear fields and close. */
  onDismiss: () => void;
  /** Disable + replaceSession succeeded. */
  onSuccess: () => void;
  /**
   * Disable succeeded on the server but local Session persistence failed.
   * Parent should expect the Session to have been cleared.
   */
  onReauthRequired: (message: string) => void;
};

/**
 * Profile Authenticator disable sheet — requires current password + TOTP code.
 * On success, rotates Session via AuthProvider.replaceSession.
 */
export function TotpDisableModal({
  visible,
  onDismiss,
  onSuccess,
  onReauthRequired,
}: TotpDisableModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const { token, replaceSession, clearSession } = useAuthSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setCode('');
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

    const nextErrors: FieldErrors = {
      currentPassword: validateCurrentPassword(currentPassword),
      code: validateTotpCode(code),
    };
    setFieldErrors(nextErrors);
    setSubmitError(null);

    if (nextErrors.currentPassword || nextErrors.code) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Authenticator could not be disabled with the current session.',
      );
      return;
    }

    const normalizedCode = normalizeTotpCode(code);

    setIsSubmitting(true);
    try {
      const result = await disableTotpRequest({
        token,
        currentPassword,
        code: normalizedCode,
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
      setSubmitError(mapDisableApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearSession,
    code,
    currentPassword,
    isSubmitting,
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
          accessibilityLabel="Dismiss authenticator disable"
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
                  Disable Authenticator
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  hitSlop={12}
                  onPress={handleDismiss}
                  testID="totp-disable-cancel"
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
                  title="Unable to disable authenticator"
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
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={TOTP_CODE_LENGTH + 2}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                />
              </View>

              <FormButton
                label="Disable Authenticator"
                variant="destructive"
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
