import { StyleSheet, View } from "react-native";

import { laborMarketDetailStyles as styles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";

const PAYROLL_BAR_HEIGHTS = [48, 72, 56, 88, 64, 40, 76, 52, 68, 44, 80, 60];
const HEATMAP_TILES = 9;
const GRID_COLS = 3;
const TILE_GAP = 8;

export function LaborPayrollChartSkeleton() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  return (
    <View
      style={[styles.chartNativeWrap, { borderColor: semantic.hairline }]}
      accessibilityLabel="Loading payroll chart"
      accessibilityRole="progressbar"
    >
      <View style={[styles.chartPlotRow, { minHeight: 150, paddingVertical: 12 }]}>
        <View style={[styles.yAxisColumn, { borderRightColor: semantic.hairline }]}>
          <Skeleton width={28} height={10} style={{ marginBottom: 24 }} />
          <Skeleton width={28} height={10} style={{ marginBottom: 24 }} />
          <Skeleton width={28} height={10} />
        </View>
        <View style={[styles.barsRow, { alignItems: "flex-end", gap: 4, flex: 1 }]}>
          {PAYROLL_BAR_HEIGHTS.map((h, i) => (
            <Skeleton
              key={i}
              width={12}
              height={h}
              borderRadius={Radius.sm}
              style={{ flex: 1, maxWidth: 24 }}
            />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingBottom: 8 }}>
        {PAYROLL_BAR_HEIGHTS.map((_, i) => (
          <Skeleton key={`m-${i}`} height={8} style={{ flex: 1 }} borderRadius={2} />
        ))}
      </View>
    </View>
  );
}

export function LaborPayrollHeroSkeleton() {
  return (
    <View accessibilityLabel="Loading payroll summary" accessibilityRole="progressbar">
      <View style={styles.cardTopRow}>
        <Skeleton width={120} height={11} borderRadius={4} />
        <Skeleton width={96} height={10} borderRadius={4} />
      </View>
      <Skeleton width="48%" height={36} borderRadius={Radius.sm} style={{ marginBottom: 8 }} />
      <Skeleton width="72%" height={14} borderRadius={4} />
    </View>
  );
}

export function YearlyTotalJobsMetricSkeleton() {
  return (
    <View
      style={{ marginTop: Spacing.sm, minHeight: 44 }}
      accessibilityLabel="Loading total jobs"
      accessibilityRole="progressbar"
    >
      <Skeleton width="62%" height={34} borderRadius={Radius.sm} tone="onPrimary" />
      <Skeleton
        width={72}
        height={28}
        borderRadius={Radius.md}
        tone="onPrimary"
        style={{ marginTop: 10 }}
      />
    </View>
  );
}

type LaborSectorSectionSkeletonProps = {
  mode: "heatmap" | "list";
  width: number;
};

export function LaborSectorSectionSkeleton({
  mode,
  width,
}: LaborSectorSectionSkeletonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  if (mode === "list") {
    return (
      <View accessibilityLabel="Loading sector table" accessibilityRole="progressbar">
        <View style={styles.tableHead}>
          <Skeleton width="28%" height={9} borderRadius={3} />
          <Skeleton width="18%" height={9} borderRadius={3} />
          <Skeleton width="18%" height={9} borderRadius={3} />
          <Skeleton width="22%" height={9} borderRadius={3} />
        </View>
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[styles.tr, { borderTopColor: semantic.hairline }]}
          >
            <Skeleton width="70%" height={12} style={{ flex: 1.15 }} />
            <Skeleton width="80%" height={12} style={{ flex: 0.75 }} />
            <Skeleton width="60%" height={12} style={{ flex: 0.75 }} />
            <Skeleton width="100%" height={8} style={{ flex: 1.1 }} borderRadius={4} />
          </View>
        ))}
      </View>
    );
  }

  const tileSize = (Math.max(width, 240) - TILE_GAP * (GRID_COLS - 1)) / GRID_COLS;

  return (
    <View accessibilityLabel="Loading sector heatmap" accessibilityRole="progressbar">
      <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: Spacing.sm }} />
      <View style={[skeletonStyles.heatmapGrid, { width }]}>
        {Array.from({ length: HEATMAP_TILES }, (_, i) => (
          <Skeleton
            key={i}
            width={tileSize}
            height={tileSize}
            borderRadius={Radius.md}
          />
        ))}
      </View>
      <Skeleton width="100%" height={10} borderRadius={Radius.full} style={{ marginTop: Spacing.sm }} />
      <View
        style={[
          skeletonStyles.heatmapDetailCard,
          {
            backgroundColor: semantic.cardSubtleBackground,
            borderColor: semantic.hairline,
          },
        ]}
      >
        <View style={skeletonStyles.heatmapDetailHeader}>
          <Skeleton width="55%" height={22} borderRadius={Radius.sm} />
          <Skeleton width={72} height={24} borderRadius={Radius.full} />
        </View>
        <Skeleton width="70%" height={13} borderRadius={4} />
        <View style={skeletonStyles.heatmapDetailMetrics}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={80} height={9} borderRadius={3} />
            <Skeleton width="50%" height={18} borderRadius={4} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={80} height={9} borderRadius={3} />
            <Skeleton width="40%" height={18} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={72} borderRadius={Radius.md} style={{ marginTop: Spacing.sm }} />
      </View>
    </View>
  );
}

export function WagesInflationCardSkeleton() {
  return (
    <View accessibilityLabel="Loading wages and inflation" accessibilityRole="progressbar">
      <View style={styles.cardTopRow}>
        <Skeleton width={130} height={11} borderRadius={4} />
        <Skeleton width={100} height={10} borderRadius={4} />
      </View>
      <View style={styles.splitMetricRow}>
        <View style={styles.splitMetricSection}>
          <Skeleton width={48} height={9} borderRadius={3} />
          <Skeleton width="75%" height={26} borderRadius={Radius.sm} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.splitMetricSection}>
          <Skeleton width={56} height={9} borderRadius={3} />
          <Skeleton width="70%" height={26} borderRadius={Radius.sm} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton
        width="85%"
        height={12}
        borderRadius={4}
        style={{ marginTop: Spacing.md }}
      />
    </View>
  );
}

export function LaborDemographicAnalysisSkeleton() {
  return (
    <View
      style={{ gap: Spacing.md }}
      accessibilityLabel="Loading demographic analysis"
      accessibilityRole="progressbar"
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: Spacing.sm }}>
        <Skeleton width="55%" height={28} borderRadius={Radius.sm} />
        <Skeleton width={120} height={28} borderRadius={Radius.full} />
      </View>
      <Skeleton width="100%" height={52} borderRadius={Radius.lg} />
      <View
        style={{
          borderRadius: Radius.xl,
          padding: Spacing.lg,
          gap: Spacing.md,
        }}
      >
        <Skeleton width="70%" height={20} borderRadius={4} />
        <Skeleton width="90%" height={14} borderRadius={4} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: Spacing.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={108} borderRadius={Radius.lg} />
          ))}
        </View>
        <Skeleton width="100%" height={148} borderRadius={Radius.lg} />
        <Skeleton width="100%" height={220} borderRadius={Radius.xl} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TILE_GAP,
  },
  heatmapDetailCard: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  heatmapDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  heatmapDetailMetrics: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
});
