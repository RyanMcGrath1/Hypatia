import { Pressable, StyleSheet, View } from 'react-native';

import { ProfileFieldRow } from '@/components/profile/ProfileFieldRow';
import { SectionCard } from '@/components/surfaces/SectionCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { Brand, Colors } from '@/constants/theme/Colors';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { Fonts } from '@/constants/theme/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';
import { formatPasswordChangedAt } from '@/lib/profile/formatProfileDate';

/** Decorative password mask — not derived from any real password. */
export const PROFILE_PASSWORD_MASK = '••••••••';

export type ProfileSecuritySectionProps = {
  passwordChangedAt: string | null;
  totpEnabled: boolean;
  /** Opens Change Password when provided (authenticated Session only). */
  onChangePassword?: () => void;
  /** Opens TOTP setup when provided and authenticator is disabled. */
  onSetupTotp?: () => void;
  /** Opens TOTP disable when provided and authenticator is enabled. */
  onDisableTotp?: () => void;
};

export function ProfileSecuritySection({
  passwordChangedAt,
  totpEnabled,
  onChangePassword,
  onSetupTotp,
  onDisableTotp,
}: ProfileSecuritySectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const isDark = colorScheme === 'dark';

  const totpLabel = totpEnabled ? 'Enabled' : 'Disabled';
  const totpColor = totpEnabled
    ? isDark
      ? '#4ADE80'
      : Brand.success
    : semantic.mutedText;

  const totpAction = totpEnabled
    ? onDisableTotp
      ? {
          label: 'Disable',
          accessibilityLabel: 'Disable authenticator app',
          testID: 'profile-disable-totp',
          onPress: onDisableTotp,
        }
      : null
    : onSetupTotp
      ? {
          label: 'Set Up',
          accessibilityLabel: 'Set up authenticator app',
          testID: 'profile-setup-totp',
          onPress: onSetupTotp,
        }
      : null;

  return (
    <View style={styles.section}>
      <ThemedText
        type="subtitle"
        style={[styles.heading, { color: semantic.mutedText }]}
        accessibilityRole="header"
      >
        Security
      </ThemedText>
      <SectionCard
        backgroundColor={semantic.cardBackground}
        borderColor={semantic.cardBorder}
      >
        <View style={styles.passwordRow}>
          <View
            style={styles.passwordCopy}
            accessibilityRole="text"
            accessibilityLabel={`Password: ${PROFILE_PASSWORD_MASK}`}
          >
            <ThemedText
              style={[styles.label, { color: semantic.mutedText }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              Password
            </ThemedText>
            <ThemedText
              style={[styles.value, { color: theme.text }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {PROFILE_PASSWORD_MASK}
            </ThemedText>
          </View>
          {onChangePassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change password"
              onPress={onChangePassword}
              hitSlop={8}
              testID="profile-change-password"
            >
              <ThemedText
                style={[styles.changeAction, { color: interactive.primary }]}
              >
                Change
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ProfileFieldRow
          label="Last Changed"
          value={formatPasswordChangedAt(passwordChangedAt)}
        />
        <View style={styles.passwordRow}>
          <View
            style={styles.passwordCopy}
            accessibilityRole="text"
            accessibilityLabel={`Authenticator App: ${totpLabel}`}
          >
            <ThemedText
              style={[styles.label, { color: semantic.mutedText }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              Authenticator App
            </ThemedText>
            <ThemedText
              style={[styles.value, { color: totpColor }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {totpLabel}
            </ThemedText>
          </View>
          {totpAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={totpAction.accessibilityLabel}
              onPress={totpAction.onPress}
              hitSlop={8}
              testID={totpAction.testID}
            >
              <ThemedText
                style={[styles.changeAction, { color: interactive.primary }]}
              >
                {totpAction.label}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  passwordCopy: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  value: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
  },
  changeAction: {
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: Spacing.xs,
  },
});
