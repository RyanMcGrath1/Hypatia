import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormNotice } from '@/components/forms/FormNotice';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ChangeEmailModal } from '@/components/profile/ChangeEmailModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { ProfileAccountSection } from '@/components/profile/ProfileAccountSection';
import { ProfileLoadingSkeleton } from '@/components/profile/ProfileLoadingSkeleton';
import { ProfilePersonalInfoSection } from '@/components/profile/ProfilePersonalInfoSection';
import { ProfileSecuritySection } from '@/components/profile/ProfileSecuritySection';
import { StateNoticeCard } from '@/components/surfaces/StateNoticeCard';
import { TAB_BAR_SCROLL_CLEARANCE } from '@/constants/navigation/floatingTabBar';
import { TAB_SCREEN_CONTENT_INSETS } from '@/constants/navigation/tabScreenContentInsets';
import { Brand, Palette } from '@/constants/theme/Colors';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { ProfileApiError, type Profile } from '@/hooks/api/profileApi';
import type { UpdatePersonalInfoParams } from '@/hooks/useProfile';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

export type ProfilePageContentProps = {
  isRestoring: boolean;
  isDevAuthBypass: boolean;
  profile: Profile | null;
  isLoading: boolean;
  error: ProfileApiError | Error | null;
  hasAuthenticatedSession: boolean;
  onRetry: () => void;
  /** PATCH first/last name; omit when no authenticated Session (e.g. bypass). */
  updatePersonalInfo?: (
    params: UpdatePersonalInfoParams,
  ) => Promise<Profile>;
};

function initialErrorCopy(error: ProfileApiError | Error | null): {
  title: string;
  message: string;
} {
  if (error instanceof ProfileApiError && error.status === 401) {
    return {
      title: 'Unable to load profile',
      message:
        'Your session may no longer be valid. Your profile could not be loaded with the current session.',
    };
  }
  return {
    title: 'Unable to load profile',
    message: "We couldn't load your account information.",
  };
}

/**
 * Profile page body — name editing, Change Email, and Change Password.
 * TOTP Profile controls remain read-only in this step.
 */
export function ProfilePageContent({
  isRestoring,
  isDevAuthBypass,
  profile,
  isLoading,
  error,
  hasAuthenticatedSession,
  onRetry,
  updatePersonalInfo,
}: ProfilePageContentProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changeEmailVisible, setChangeEmailVisible] = useState(false);
  const [accountNotice, setAccountNotice] = useState<{
    tone: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [securityNotice, setSecurityNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const showLoading =
    isRestoring || (hasAuthenticatedSession && isLoading && profile === null);

  const showDevBypassNotice =
    !isRestoring && !hasAuthenticatedSession && isDevAuthBypass;

  const showInitialError =
    hasAuthenticatedSession && profile === null && error !== null && !isLoading;

  const showLoadedProfile = profile !== null;

  const refreshNotice =
    showLoadedProfile && error !== null
      ? {
          title: "Couldn't refresh profile",
          message:
            'Showing your last loaded account details. Tap Retry to try again.',
        }
      : null;

  const errorColors = {
    borderColor: interactive.danger,
    backgroundColor: interactive.dangerSoft,
    messageColor: semantic.danger,
  };

  const infoColors = {
    borderColor: interactive.info,
    backgroundColor: interactive.infoSoft,
    messageColor: interactive.info,
  };

  const warningColors = {
    borderColor: Brand.warning,
    backgroundColor: isDark
      ? 'rgba(255, 182, 142, 0.14)'
      : Palette.warningSoft,
    messageColor: isDark ? Brand.darkTertiary : Brand.warning,
  };

  const initialError = showInitialError ? initialErrorCopy(error) : null;

  const openChangePassword = useCallback(() => {
    setSecurityNotice(null);
    setChangePasswordVisible(true);
  }, []);

  const openChangeEmail = useCallback(() => {
    setAccountNotice(null);
    setChangeEmailVisible(true);
  }, []);

  const handleChangePasswordSuccess = useCallback(() => {
    setChangePasswordVisible(false);
    setSecurityNotice({
      tone: 'success',
      message: 'Password changed successfully.',
    });
  }, []);

  const handleChangePasswordReauthRequired = useCallback((message: string) => {
    setChangePasswordVisible(false);
    setSecurityNotice({
      tone: 'error',
      message,
    });
  }, []);

  const handleChangeEmailSuccess = useCallback(() => {
    setChangeEmailVisible(false);
    setAccountNotice({
      tone: 'info',
      message:
        'Verification emails were sent to your current and new email addresses. Confirm both to complete the change.',
    });
  }, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          TAB_SCREEN_CONTENT_INSETS,
          { paddingBottom: insets.bottom + TAB_BAR_SCROLL_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Profile" />

        {showLoading ? <ProfileLoadingSkeleton /> : null}

        {showDevBypassNotice ? (
          <StateNoticeCard
            title="Development bypass active"
            message="Profile account data is unavailable while using the development authentication bypass. Disable the bypass and sign in with a local development account to test account features."
            borderColor={infoColors.borderColor}
            backgroundColor={infoColors.backgroundColor}
            messageColor={infoColors.messageColor}
          />
        ) : null}

        {initialError ? (
          <StateNoticeCard
            title={initialError.title}
            message={initialError.message}
            borderColor={errorColors.borderColor}
            backgroundColor={errorColors.backgroundColor}
            messageColor={errorColors.messageColor}
            actionLabel="Retry"
            actionColor={interactive.primary}
            onActionPress={onRetry}
          />
        ) : null}

        {showLoadedProfile && profile ? (
          <View style={styles.sections}>
            {refreshNotice ? (
              <StateNoticeCard
                title={refreshNotice.title}
                message={refreshNotice.message}
                borderColor={warningColors.borderColor}
                backgroundColor={warningColors.backgroundColor}
                messageColor={warningColors.messageColor}
                actionLabel="Retry"
                actionColor={interactive.primary}
                onActionPress={onRetry}
              />
            ) : null}
            <ProfilePersonalInfoSection
              firstName={profile.firstName}
              lastName={profile.lastName}
              dateJoined={profile.dateJoined}
              editable={hasAuthenticatedSession && !!updatePersonalInfo}
              updatePersonalInfo={updatePersonalInfo}
            />
            {accountNotice ? (
              <FormNotice
                tone={accountNotice.tone}
                title="Email change"
                message={accountNotice.message}
              />
            ) : null}
            <ProfileAccountSection
              email={profile.email}
              onChangeEmail={
                hasAuthenticatedSession ? openChangeEmail : undefined
              }
            />
            {securityNotice ? (
              <FormNotice
                tone={securityNotice.tone}
                title={
                  securityNotice.tone === 'success' ? 'Updated' : 'Session'
                }
                message={securityNotice.message}
              />
            ) : null}
            <ProfileSecuritySection
              passwordChangedAt={profile.passwordChangedAt}
              totpEnabled={profile.totpEnabled}
              onChangePassword={
                hasAuthenticatedSession ? openChangePassword : undefined
              }
            />
          </View>
        ) : null}
      </ScrollView>

      {hasAuthenticatedSession && profile ? (
        <ChangeEmailModal
          visible={changeEmailVisible}
          currentEmail={profile.email}
          onDismiss={() => setChangeEmailVisible(false)}
          onSuccess={handleChangeEmailSuccess}
        />
      ) : null}

      {hasAuthenticatedSession ? (
        <ChangePasswordModal
          visible={changePasswordVisible}
          onDismiss={() => setChangePasswordVisible(false)}
          onSuccess={handleChangePasswordSuccess}
          onReauthRequired={handleChangePasswordReauthRequired}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  sections: {
    gap: Spacing.lg,
  },
});
