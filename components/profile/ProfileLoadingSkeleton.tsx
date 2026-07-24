import { StyleSheet, View } from 'react-native';

import { SectionCard } from '@/components/surfaces/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Radius, Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

function ProfileFieldSkeleton() {
  return (
    <View style={styles.field}>
      <Skeleton width={88} height={12} borderRadius={Radius.sm} />
      <Skeleton width="62%" height={16} borderRadius={Radius.sm} />
    </View>
  );
}

function ProfileSectionSkeleton({ fieldCount }: { fieldCount: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);

  return (
    <View style={styles.section}>
      <Skeleton width={140} height={12} borderRadius={Radius.sm} />
      <SectionCard
        backgroundColor={semantic.cardBackground}
        borderColor={semantic.cardBorder}
      >
        {Array.from({ length: fieldCount }, (_, i) => (
          <ProfileFieldSkeleton key={`profile-skel-field-${i}`} />
        ))}
      </SectionCard>
    </View>
  );
}

/**
 * Loading placeholder matching Personal / Account / Security section structure.
 * No textual placeholder values — skeleton only.
 */
export function ProfileLoadingSkeleton() {
  return (
    <View
      style={styles.list}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading profile"
    >
      <ProfileSectionSkeleton fieldCount={3} />
      <ProfileSectionSkeleton fieldCount={1} />
      <ProfileSectionSkeleton fieldCount={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
