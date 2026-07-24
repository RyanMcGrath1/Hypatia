import { StyleSheet, View } from 'react-native';

import { ProfileFieldRow } from '@/components/profile/ProfileFieldRow';
import { SectionCard } from '@/components/surfaces/SectionCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { Brand } from '@/constants/theme/Colors';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatPasswordChangedAt } from '@/lib/profile/formatProfileDate';

/** Decorative password mask — not derived from any real password. */
export const PROFILE_PASSWORD_MASK = '••••••••';

export type ProfileSecuritySectionProps = {
  passwordChangedAt: string | null;
  totpEnabled: boolean;
};

export function ProfileSecuritySection({
  passwordChangedAt,
  totpEnabled,
}: ProfileSecuritySectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const isDark = colorScheme === 'dark';

  const totpLabel = totpEnabled ? 'Enabled' : 'Disabled';
  const totpColor = totpEnabled
    ? isDark
      ? '#4ADE80'
      : Brand.success
    : semantic.mutedText;

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
        <ProfileFieldRow label="Password" value={PROFILE_PASSWORD_MASK} />
        <ProfileFieldRow
          label="Last Changed"
          value={formatPasswordChangedAt(passwordChangedAt)}
        />
        <ProfileFieldRow
          label="Authenticator App"
          value={totpLabel}
          valueColor={totpColor}
        />
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
});
