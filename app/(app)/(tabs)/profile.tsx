import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { ProfilePageContent } from '@/components/profile/ProfilePageContent';
import { ThemedView } from '@/components/theme/ThemedView';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useProfile } from '@/hooks/useProfile';

/**
 * Profile route — wires auth + useProfile into ProfilePageContent.
 * Account actions (email/password/TOTP/delete/logout) live in page content.
 */
export default function ProfileScreen() {
  const { isRestoring, isDevAuthBypass } = useAuthSession();
  const {
    profile,
    isLoading,
    error,
    hasAuthenticatedSession,
    refresh,
    updatePersonalInfo,
  } = useProfile();

  const onRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfilePageContent
        isRestoring={isRestoring}
        isDevAuthBypass={isDevAuthBypass}
        profile={profile}
        isLoading={isLoading}
        error={error}
        hasAuthenticatedSession={hasAuthenticatedSession}
        onRetry={onRetry}
        updatePersonalInfo={
          hasAuthenticatedSession ? updatePersonalInfo : undefined
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
