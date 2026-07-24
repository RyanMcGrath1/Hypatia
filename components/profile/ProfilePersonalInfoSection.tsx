import { StyleSheet, View } from 'react-native';

import { ProfileFieldRow } from '@/components/profile/ProfileFieldRow';
import { SectionCard } from '@/components/surfaces/SectionCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatProfileDate } from '@/lib/profile/formatProfileDate';

export type ProfilePersonalInfoSectionProps = {
  firstName: string;
  lastName: string;
  dateJoined: string;
};

export function ProfilePersonalInfoSection({
  firstName,
  lastName,
  dateJoined,
}: ProfilePersonalInfoSectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);

  return (
    <View style={styles.section}>
      <ThemedText
        type="subtitle"
        style={[styles.heading, { color: semantic.mutedText }]}
        accessibilityRole="header"
      >
        Personal Information
      </ThemedText>
      <SectionCard
        backgroundColor={semantic.cardBackground}
        borderColor={semantic.cardBorder}
      >
        <ProfileFieldRow label="First Name" value={firstName} />
        <ProfileFieldRow label="Last Name" value={lastName} />
        <ProfileFieldRow
          label="Date Joined"
          value={formatProfileDate(dateJoined)}
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
