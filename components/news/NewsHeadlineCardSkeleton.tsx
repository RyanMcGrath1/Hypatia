import { StyleSheet, View } from "react-native";

import { SectionCard } from "@/components/surfaces/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Radius, Spacing } from "@/constants/theme/ThemeTokens";

type NewsHeadlineCardSkeletonProps = {
  borderColor: string;
  backgroundColor: string;
  isFirst?: boolean;
};

export function NewsHeadlineCardSkeleton({
  borderColor,
  backgroundColor,
  isFirst,
}: NewsHeadlineCardSkeletonProps) {
  return (
    <View
      accessibilityLabel="Loading headline"
      accessibilityRole="progressbar"
    >
      <SectionCard
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        style={isFirst ? { ...styles.card, ...styles.cardFirst } : styles.card}
      >
      <View style={styles.stampRow}>
        <Skeleton width={72} height={20} borderRadius={Radius.full} />
      </View>
      <Skeleton width="92%" height={20} borderRadius={4} />
      <Skeleton width="78%" height={20} borderRadius={4} style={{ marginTop: 6 }} />
      <SkeletonRow style={{ marginTop: Spacing.sm }}>
        <Skeleton width={64} height={13} borderRadius={4} />
        <Skeleton width={80} height={13} borderRadius={4} />
      </SkeletonRow>
      <Skeleton width="100%" height={160} borderRadius={Radius.md} />
      <Skeleton width="100%" height={14} borderRadius={4} />
      <Skeleton width="88%" height={14} borderRadius={4} />
      <Skeleton width="62%" height={14} borderRadius={4} />
      </SectionCard>
    </View>
  );
}

function SkeletonRow({
  style,
  children,
}: {
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, style]}>
      {children}
    </View>
  );
}

export function NewsFeedSkeletonList({
  count = 4,
  borderColor,
  backgroundColor,
}: {
  count?: number;
  borderColor: string;
  backgroundColor: string;
}) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <View key={`news-skeleton-${i}`}>
          <NewsHeadlineCardSkeleton
            borderColor={borderColor}
            backgroundColor={backgroundColor}
            isFirst={i === 0}
          />
          {i < count - 1 ? <View style={styles.separator} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  separator: {
    height: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
    overflow: "hidden",
  },
  cardFirst: {
    marginTop: 0,
  },
  stampRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
