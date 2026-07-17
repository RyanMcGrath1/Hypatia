import { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { LaborDemographicComparisonChart } from "@/components/economy/detail/labor/LaborDemographicComparisonChart";
import { laborDemographicAnalysisStyles as styles } from "@/components/economy/detail/labor/LaborDemographicAnalysisCard.styles";
import { laborMarketDetailStyles as laborStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  LABOR_DEMOGRAPHIC_TABS,
  type LaborDemographicAgeBucket,
  type LaborDemographicTab,
} from "@/lib/economy/laborDemographicTypes";
import { LaborDemographicAnalysisSkeleton } from "@/components/economy/detail/labor/LaborDetailSkeletons";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, Colors, type ThemeInteractive } from "@/constants/theme/Colors";
import { Spacing, type AppColorScheme } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useEconomyLaborAgeMetrics } from "@/hooks/useEconomyLaborAgeMetrics";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { laborDemographicModelFromAgeMetrics } from "@/lib/economy/laborAgeMetricsViewModel";
import { laborEarningsInflationFetchWindow } from "@/lib/economy/laborEarningsInflationWindow";
import type { PayrollObservationWindow } from "@/lib/economy/laborEarningsInflationWindow";

const BUCKET_SPARK_W = 120;
const BUCKET_SPARK_H = 28;

type Semantic = ReturnType<
  typeof import("@/constants/theme/ThemeTokens").getSemanticColors
>;

function buildSparklinePoints(
  norm: number[],
  width: number,
  height: number,
  padX = 2,
  padY = 4,
): string {
  if (norm.length < 2) {
    return "";
  }
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const pts: string[] = [];
  for (let i = 0; i < norm.length; i += 1) {
    const x = padX + (i / Math.max(norm.length - 1, 1)) * innerW;
    const y = padY + (1 - norm[i]!) * innerH;
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function DemographicSparkline({
  norm,
  width,
  height,
  stroke,
}: {
  norm: number[];
  width: number;
  height: number;
  stroke: string;
}) {
  const points = useMemo(
    () => buildSparklinePoints(norm, width, height),
    [norm, width, height],
  );
  if (!points) {
    return null;
  }
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AgeBucketTile({
  bucket,
  theme,
  semantic,
  interactive,
}: {
  bucket: LaborDemographicAgeBucket;
  theme: (typeof Colors)[keyof typeof Colors];
  semantic: Semantic;
  interactive: Pick<ThemeInteractive, "primary" | "danger">;
}) {
  const sparkColor = bucket.trendStress ? interactive.danger : interactive.primary;
  return (
    <View
      style={[
        styles.bucketTile,
        {
          backgroundColor: semantic.cardSubtleBackground,
          borderColor: semantic.hairline,
        },
      ]}
    >
      <ThemedText style={[styles.bucketLabel, { color: semantic.mutedText }]}>
        {bucket.label}
      </ThemedText>
      <ThemedText style={[styles.bucketValue, { color: theme.text }]}>
        {bucket.valueLabel}
      </ThemedText>
      <View style={styles.bucketSparkWrap}>
        <DemographicSparkline
          norm={bucket.trendNorm}
          width={BUCKET_SPARK_W}
          height={BUCKET_SPARK_H}
          stroke={sparkColor}
        />
      </View>
      <View
        style={[
          styles.bucketBarTrack,
          { backgroundColor: semantic.cardBackground },
        ]}
      >
        <View
          style={[
            styles.bucketBarFill,
            {
              width: `${Math.round(bucket.barFill * 100)}%`,
              backgroundColor: interactive.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

export type LaborDemographicAnalysisCardProps = {
  colorScheme: AppColorScheme;
  semantic: Semantic;
  interactive: Pick<ThemeInteractive, "primary" | "danger">;
  payrollFetchWindow: PayrollObservationWindow;
};

export function LaborDemographicAnalysisCard({
  colorScheme,
  semantic,
  interactive,
  payrollFetchWindow,
}: LaborDemographicAnalysisCardProps) {
  const theme = Colors[colorScheme];
  const { width: windowWidth } = useWindowDimensions();
  const [tab, setTab] = useState<LaborDemographicTab>("unemployment");

  const comparisonChartWidth = Math.max(windowWidth - Spacing.lg * 4, 280);

  const fetchParams = useMemo(
    () => laborEarningsInflationFetchWindow(payrollFetchWindow),
    [
      payrollFetchWindow.observationStart,
      payrollFetchWindow.observationEnd,
    ],
  );

  const { data: ageMetricsApi, isLoading, error } = useEconomyLaborAgeMetrics(
    fetchParams,
  );

  const pending = isEconomyDataPending({
    isLoading,
    error,
    hasData: ageMetricsApi != null,
  });

  const model = useMemo(() => {
    if (!ageMetricsApi) {
      return null;
    }
    return laborDemographicModelFromAgeMetrics(
      ageMetricsApi,
      tab,
      comparisonChartWidth,
    );
  }, [ageMetricsApi, tab, comparisonChartWidth]);

  if (pending) {
    return <LaborDemographicAnalysisSkeleton />;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
          DEMOGRAPHIC ANALYSIS
        </ThemedText>
        {model?.updateBadge ? (
          <View
            style={[
              styles.updateBadge,
              {
                backgroundColor: semantic.cardSubtleBackground,
                borderColor: semantic.hairline,
              },
            ]}
          >
            <ThemedText
              style={[styles.updateBadgeText, { color: semantic.mutedText }]}
            >
              {model.updateBadge}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View
        accessibilityRole="tablist"
        style={[
          styles.segmentWrap,
          { backgroundColor: semantic.cardSubtleBackground },
        ]}
      >
        {LABOR_DEMOGRAPHIC_TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={({ pressed }) => [
                styles.segmentBtn,
                {
                  backgroundColor: selected
                    ? interactive.primary
                    : "transparent",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <ThemedText
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[
                  styles.segmentLabel,
                  {
                    color: selected ? Brand.paper : semantic.mutedText,
                    fontFamily: selected ? Fonts.bodyBold : Fonts.bodySemiBold,
                  },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <EconomyCard>
        {!model ? (
          <ThemedText style={[styles.metricCardSubtitle, { color: semantic.mutedText }]}>
            No age-group metrics in this time range.
          </ThemedText>
        ) : (
          <>
            <View style={styles.metricCardHeader}>
              <View style={styles.metricCardTitleBlock}>
                <ThemedText style={[styles.metricCardTitle, { color: theme.text }]}>
                  {model.chartTitle}
                </ThemedText>
                <ThemedText
                  style={[styles.metricCardSubtitle, { color: semantic.mutedText }]}
                >
                  {model.chartSubtitle}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.frequencyPill,
                  { backgroundColor: semantic.cardSubtleBackground },
                ]}
              >
                <View
                  style={[
                    styles.frequencyDot,
                    { backgroundColor: interactive.primary },
                  ]}
                />
                <ThemedText
                  style={[styles.frequencyText, { color: semantic.mutedText }]}
                >
                  {model.frequencyLabel}
                </ThemedText>
              </View>
            </View>

            <View style={styles.bucketGrid}>
              {model.buckets.map((bucket) => (
                <AgeBucketTile
                  key={bucket.id}
                  bucket={bucket}
                  theme={theme}
                  semantic={semantic}
                  interactive={interactive}
                />
              ))}
            </View>

            {model.comparisonChart ? (
              <LaborDemographicComparisonChart
                model={model.comparisonChart}
                colorScheme={colorScheme}
                semantic={semantic}
              />
            ) : (
              <ThemedText
                style={[styles.metricCardSubtitle, { color: semantic.mutedText }]}
              >
                Not enough history to compare age cohorts.
              </ThemedText>
            )}
          </>
        )}
      </EconomyCard>
    </View>
  );
}
