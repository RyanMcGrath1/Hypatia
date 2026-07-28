import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { FormNotice } from '@/components/forms/FormNotice';
import { ThemedText } from '@/components/theme/ThemedText';
import { Colors } from '@/constants/theme/Colors';
import { Radius, Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { Fonts } from '@/constants/theme/Typography';
import { AuthApiError, logout as logoutRequest } from '@/hooks/api/authApi';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';

const LOGOUT_FAILURE_MESSAGE = 'Unable to log out. Please try again.';
const SESSION_CLEANUP_WARNING =
  'You were logged out, but this device had trouble clearing its saved session.';

/**
 * Profile Log Out control — revokes the current Session via authApi.logout,
 * then clears local credentials through AuthProvider.clearSession.
 *
 * Shown only for a real authenticated Session (parent gates rendering).
 * Not destructive account deletion; uses neutral secondary styling.
 */
export function ProfileLogoutButton() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const { token, clearSession } = useAuthSession();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const clearLocalSession = useCallback(async (): Promise<string | undefined> => {
    try {
      await clearSession();
      return undefined;
    } catch {
      // clearSession still drops in-memory auth even if storage fails.
      // Backend logout already succeeded (or Session was already invalid).
      return SESSION_CLEANUP_WARNING;
    }
  }, [clearSession]);

  const handleLogout = useCallback(async () => {
    if (inFlightRef.current || isLoggingOut) {
      return;
    }

    if (!token) {
      setError(LOGOUT_FAILURE_MESSAGE);
      return;
    }

    inFlightRef.current = true;
    setIsLoggingOut(true);
    setError(null);
    setCleanupWarning(null);

    try {
      await logoutRequest({ token });

      // Backend revoked the current Session — clear local credential next.
      const warning = await clearLocalSession();
      if (warning) {
        setCleanupWarning(warning);
      }
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        // Bearer 401 also notifies AuthProvider centrally; clear again here so
        // storage-cleanup warnings still surface if persistent deletion fails.
        // clearSession is idempotent when invalidation already ran.
        const warning = await clearLocalSession();
        if (warning) {
          setCleanupWarning(warning);
        }
        return;
      }

      setError(LOGOUT_FAILURE_MESSAGE);
    } finally {
      inFlightRef.current = false;
      setIsLoggingOut(false);
    }
  }, [clearLocalSession, isLoggingOut, token]);

  return (
    <View style={styles.root} testID="profile-logout-section">
      {error ? (
        <FormNotice tone="error" title="Log out" message={error} />
      ) : null}
      {cleanupWarning ? (
        <FormNotice
          tone="error"
          title="Session"
          message={cleanupWarning}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Out"
        accessibilityState={{ disabled: isLoggingOut, busy: isLoggingOut }}
        disabled={isLoggingOut}
        onPress={() => {
          void handleLogout();
        }}
        testID="profile-logout"
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: semantic.hairline,
            backgroundColor: semantic.cardBackground,
            opacity: isLoggingOut ? 0.45 : pressed ? 0.88 : 1,
          },
        ]}
      >
        {isLoggingOut ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <ThemedText style={[styles.label, { color: theme.text }]}>
            Log Out
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
  },
});
