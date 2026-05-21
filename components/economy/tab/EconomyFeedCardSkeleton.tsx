import { View } from "react-native";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { Skeleton } from "@/components/ui/Skeleton";
import { Radius } from "@/constants/theme/ThemeTokens";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";

const BAR_HEIGHTS = [14, 22, 18, 26, 16, 24, 20, 12];

type EconomyFeedCardSkeletonProps = {
  borderColor: string;
  backgroundColor: string;
  cardShadow: object;
};

export function EconomyFeedCardSkeleton({
  borderColor,
  backgroundColor,
  cardShadow,
}: EconomyFeedCardSkeletonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  return (
    <View
      style={[
        styles.feedCard,
        { backgroundColor, borderColor },
        cardShadow,
      ]}
      accessibilityLabel="Loading sector summary"
      accessibilityRole="progressbar"
    >
      <View style={styles.feedHeader}>
        <Skeleton width={88} height={10} borderRadius={4} />
        <Skeleton width={14} height={14} borderRadius={Radius.full} />
      </View>
      <View
        style={[
          styles.feedHeaderDivider,
          { backgroundColor: semantic.hairline },
        ]}
      />
      <Skeleton
        width="55%"
        height={34}
        borderRadius={Radius.sm}
        style={{ marginTop: 6, marginHorizontal: 12 }}
      />
      <SkeletonRow gap={6} style={{ marginTop: 8, paddingHorizontal: 12 }}>
        <Skeleton width={5} height={5} borderRadius={Radius.full} />
        <Skeleton width={72} height={10} borderRadius={4} />
      </SkeletonRow>
      <View style={styles.sparklineRow}>
        <View style={styles.miniBarsRow}>
          {BAR_HEIGHTS.map((h, i) => (
            <View key={i} style={styles.miniBarHit}>
              <Skeleton width="100%" height={h} borderRadius={2} />
            </View>
          ))}
        </View>
      </View>
      <View
        style={[
          styles.cardCtaRow,
          {
            borderTopColor: semantic.hairline,
            backgroundColor: semantic.cardSubtleBackground,
          },
        ]}
      >
        <Skeleton width={160} height={13} borderRadius={4} />
        <Skeleton width={14} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

function SkeletonRow({
  gap,
  style,
  children,
}: {
  gap: number;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>
      {children}
    </View>
  );
}

export function EconomyFeedSkeletonList({
  count = 4,
  semantic,
}: {
  count?: number;
  semantic: {
    cardBackground: string;
    cardBorder: string;
    cardShadow: object;
  };
}) {
  return (
    <View style={styles.feed}>
      {Array.from({ length: count }, (_, i) => (
        <EconomyFeedCardSkeleton
          key={`feed-skeleton-${i}`}
          borderColor={semantic.cardBorder}
          backgroundColor={semantic.cardBackground}
          cardShadow={semantic.cardShadow}
        />
      ))}
    </View>
  );
}
