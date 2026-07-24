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
  enableTotp as enableTotpRequest,
  setupTotp as setupTotpRequest,
} from '@/hooks/api/securityTotpApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

const TOTP_CODE_LENGTH = 6;
const DIGITS_ONLY_RE = /^\d{6}$/;

const SESSION_PERSISTENCE_FAILURE_MESSAGE =
  'Authenticator app was enabled, but this device could not save your new login session. Please log in again.';

type SetupPhase = 'password' | 'configure';

type FieldErrors = {
  currentPassword?: string;
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

function mapSetupApiError(error: unknown): string {
  if (error instanceof SecurityTotpApiError) {
    if (error.status === 401) {
      return 'Authenticator setup could not continue with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (isSafeApiMessage(message)) {
        return message;
      }
      return 'Please check your password and try again.';
    }
  }
  return 'Unable to start authenticator setup. Please try again.';
}

function mapEnableApiError(error: unknown): string {
  if (error instanceof SecurityTotpApiError) {
    if (error.status === 401) {
      return 'Authenticator could not be enabled with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (/invalid authenticator code/i.test(message)) {
        return 'Invalid authenticator code.';
      }
      if (isSafeApiMessage(message)) {
        return message;
      }
      return 'Please check your authenticator code and try again.';
    }
  }
  return 'Unable to enable authenticator. Please try again.';
}

export type TotpSetupModalProps = {
  visible: boolean;
  /** Cancel / backdrop / hardware back — clear secrets and close. */
  onDismiss: () => void;
  /** Enable + replaceSession succeeded. */
  onSuccess: () => void;
  /**
   * Enable succeeded on the server but local Session persistence failed.
   * Parent should expect the Session to have been cleared.
   */
  onReauthRequired: (message: string) => void;
};

/**
 * Profile Authenticator setup sheet.
 *
 * Phase 1: current password → setupTotp (no Session rotation).
 * Phase 2: show one-time provisioning/manual key + code → enableTotp →
 * replaceSession.
 *
 * provisioningUri / manualKey live only in this modal's React state and are
 * cleared on dismiss, success, or replacement-persistence failure.
 *
 * QR rendering is not currently available because the project has no QR
 * dependency — manual setup key path is fully usable.
 *
 * Backend pending-setup note: there is no cancel endpoint. Cancel clears local
 * state only; a disabled pending method may remain server-side until another
 * setup replaces it or enable completes. Profile still shows Disabled
 * (totpEnabled === false).
 */
export function TotpSetupModal({
  visible,
  onDismiss,
  onSuccess,
  onReauthRequired,
}: TotpSetupModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const { token, replaceSession, clearSession } = useAuthSession();

  const [phase, setPhase] = useState<SetupPhase>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  /** In-memory only — cleared on dismiss/success/rotation failure. Never persisted. */
  const [setupSecrets, setSetupSecrets] = useState<{
    provisioningUri: string;
    manualKey: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearSensitiveState = useCallback(() => {
    setCurrentPassword('');
    setSetupSecrets(null);
    setCode('');
    setFieldErrors({});
    setSubmitError(null);
    setPhase('password');
  }, []);

  // Opening always starts blank; closing clears any retained secrets.
  useEffect(() => {
    clearSensitiveState();
    setIsSubmitting(false);
  }, [visible, clearSensitiveState]);

  const handleDismiss = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    clearSensitiveState();
    onDismiss();
  }, [isSubmitting, onDismiss, clearSensitiveState]);

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

  const handleContinueSetup = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const passwordError = validateCurrentPassword(currentPassword);
    setFieldErrors({ currentPassword: passwordError });
    setSubmitError(null);

    if (passwordError) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Authenticator setup could not continue with the current session.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setupTotpRequest({
        token,
        currentPassword,
      });
      setSetupSecrets({
        provisioningUri: result.provisioningUri,
        manualKey: result.manualKey,
      });
      setCurrentPassword('');
      setPhase('configure');
    } catch (error) {
      setSubmitError(mapSetupApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPassword, isSubmitting, token]);

  const handleEnable = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const codeError = validateTotpCode(code);
    setFieldErrors({ code: codeError });
    setSubmitError(null);

    if (codeError) {
      return;
    }

    if (!token) {
      setSubmitError(
        'Authenticator could not be enabled with the current session.',
      );
      return;
    }

    const normalizedCode = normalizeTotpCode(code);

    setIsSubmitting(true);
    try {
      const result = await enableTotpRequest({
        token,
        code: normalizedCode,
      });

      try {
        await replaceSession(result.sessionToken);
      } catch {
        clearSensitiveState();
        try {
          await clearSession();
        } catch {
          // clearSession still drops in-memory auth even if storage fails.
        }
        onReauthRequired(SESSION_PERSISTENCE_FAILURE_MESSAGE);
        return;
      }

      clearSensitiveState();
      onSuccess();
    } catch (error) {
      setSubmitError(mapEnableApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearSensitiveState,
    clearSession,
    code,
    isSubmitting,
    onReauthRequired,
    onSuccess,
    replaceSession,
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
          accessibilityLabel="Dismiss authenticator setup"
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
                  Set Up Authenticator
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  hitSlop={12}
                  onPress={handleDismiss}
                  testID="totp-setup-cancel"
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
                  title={
                    phase === 'password'
                      ? 'Unable to start setup'
                      : 'Unable to enable authenticator'
                  }
                  message={submitError}
                />
              ) : null}

              {phase === 'password' ? (
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
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void handleContinueSetup();
                    }}
                  />
                  <FormButton
                    label="Continue"
                    onPress={() => {
                      void handleContinueSetup();
                    }}
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  />
                </View>
              ) : null}

              {phase === 'configure' && setupSecrets ? (
                <View style={styles.fields}>
                  <ThemedText
                    style={[styles.instructions, { color: semantic.mutedText }]}
                  >
                    1. Open your authenticator app.{'\n'}
                    2. Add a new account.{'\n'}
                    3. Enter the setup key below.{'\n'}
                    4. Enter the 6-digit code from the app.
                  </ThemedText>

                  {/*
                    QR rendering is not currently available because the project
                    has no QR dependency. Manual key path is fully usable.
                    setupSecrets.provisioningUri is held in memory only and is
                    never logged, persisted, routed, or sent to an external
                    QR-generation service.
                  */}
                  <View
                    style={[
                      styles.manualKeyBox,
                      {
                        backgroundColor: semantic.cardSubtleBackground,
                        borderColor: semantic.hairline,
                      },
                    ]}
                    testID="totp-manual-key"
                  >
                    <ThemedText
                      style={[
                        styles.manualKeyLabel,
                        { color: semantic.mutedText },
                      ]}
                    >
                      Setup key
                    </ThemedText>
                    <ThemedText
                      selectable
                      style={[
                        styles.manualKeyValue,
                        { color: interactive.primary },
                      ]}
                      accessibilityLabel="Authenticator setup key"
                    >
                      {setupSecrets.manualKey}
                    </ThemedText>
                  </View>

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
                      void handleEnable();
                    }}
                  />

                  <FormButton
                    label="Enable Authenticator"
                    onPress={() => {
                      void handleEnable();
                    }}
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  />
                </View>
              ) : null}
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
  instructions: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  manualKeyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  manualKeyLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.15,
  },
  manualKeyValue: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1,
  },
});
