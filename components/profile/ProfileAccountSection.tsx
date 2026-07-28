import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/forms/FormButton';
import { SectionCard } from '@/components/surfaces/SectionCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { Colors } from '@/constants/theme/Colors';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { Fonts } from '@/constants/theme/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';

export type ProfileAccountSectionProps = {
  email: string;
  /** Opens Change Email when provided (authenticated Session only). */
  onChangeEmail?: () => void;
  /** Opens Delete Account when provided (authenticated Session only). */
  onDeleteAccount?: () => void;
};

export function ProfileAccountSection({
  email,
  onChangeEmail,
  onDeleteAccount,
}: ProfileAccountSectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  return (
    <View style={styles.section}>
      <ThemedText
        type="subtitle"
        style={[styles.heading, { color: semantic.mutedText }]}
        accessibilityRole="header"
      >
        Account
      </ThemedText>
      <SectionCard
        backgroundColor={semantic.cardBackground}
        borderColor={semantic.cardBorder}
      >
        <View style={styles.emailRow}>
          <View
            style={styles.emailCopy}
            accessibilityRole="text"
            accessibilityLabel={`Email: ${email}`}
          >
            <ThemedText
              style={[styles.label, { color: semantic.mutedText }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              Email
            </ThemedText>
            <ThemedText
              style={[styles.value, { color: theme.text }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {email}
            </ThemedText>
          </View>
          {onChangeEmail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change email"
              onPress={onChangeEmail}
              hitSlop={8}
              testID="profile-change-email"
            >
              <ThemedText
                style={[styles.changeAction, { color: interactive.primary }]}
              >
                Change
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {onDeleteAccount ? (
          <>
            <View
              style={[
                styles.destructiveDivider,
                { backgroundColor: semantic.hairline },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View
              style={styles.destructiveBlock}
              testID="profile-delete-account-section"
            >
              <ThemedText
                style={[styles.destructiveTitle, { color: semantic.danger }]}
                accessibilityRole="header"
              >
                Delete Account
              </ThemedText>
              <ThemedText
                style={[styles.destructiveCopy, { color: semantic.mutedText }]}
              >
                Deleting your account removes access to the account and its
                profile information.
              </ThemedText>
              <FormButton
                label="Delete Account"
                variant="destructive"
                onPress={onDeleteAccount}
                style={styles.deleteButton}
              />
            </View>
          </>
        ) : null}
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emailCopy: {
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
  destructiveDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  destructiveBlock: {
    gap: Spacing.sm,
  },
  destructiveTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  destructiveCopy: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: Spacing.xs,
  },
});
