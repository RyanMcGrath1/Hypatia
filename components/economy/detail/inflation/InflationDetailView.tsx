import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { InflationCpiChart } from "@/components/economy/detail/inflation/InflationCpiChart";
import { laborMarketDetailStyles as laborStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import type { InflationComponentIcon } from "@/components/economy/detail/inflation/inflationDetailData";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyCpi } from "@/hooks/useEconomyCpi";
import { useEconomyInflationCpiComponents } from "@/hooks/useEconomyInflationCpiComponents";
import { useEconomyInflationPceVsTarget } from "@/hooks/useEconomyInflationPceVsTarget";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { inflationCpiComponentsFromApi } from "@/lib/economy/inflationCpiComponentsViewModel";
import { inflationCpiHeadlineFromApi } from "@/lib/economy/inflationCpiViewModel";
import { inflationPceVsTargetFromApi } from "@/lib/economy/inflationPceVsTargetViewModel";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";

const RED = "#DC2626";

/** Set to true to show the Live Fed Terminal promo widget again. */
const SHOW_LIVE_FED_TERMINAL = false;

function componentIcon(name: InflationComponentIcon) {
  switch (name) {
    case "home":
      return "home-outline" as const;
    case "restaurant":
      return "restaurant-outline" as const;
    case "flash":
      return "flash-outline" as const;
    case "briefcase":
      return "briefcase-outline" as const;
    case "cube":
      return "cube-outline" as const;
    default:
      return "ellipse-outline" as const;
  }
}

export function InflationDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";

  const { economyOverview } = useEconomyTabDashboard();
  const { data: cpiApi, isLoading: cpiLoading, error: cpiError } = useEconomyCpi();
  const {
    data: pceApi,
    isLoading: pceLoading,
    error: pceError,
  } = useEconomyInflationPceVsTarget();
  const {
    data: cpiComponentsApi,
    isLoading: cpiComponentsLoading,
    error: cpiComponentsError,
  } = useEconomyInflationCpiComponents();
  const cpiHeadline = useMemo(
    () => inflationCpiHeadlineFromApi(cpiApi),
    [cpiApi],
  );
  const pceWidget = useMemo(() => inflationPceVsTargetFromApi(pceApi), [pceApi]);
  const cpiComponentsWidget = useMemo(
    () => inflationCpiComponentsFromApi(cpiComponentsApi),
    [cpiComponentsApi],
  );
  const cpiPending = isEconomyDataPending({
    isLoading: cpiLoading,
    error: cpiError,
    hasData: cpiApi != null,
  });
  const pcePending = isEconomyDataPending({
    isLoading: pceLoading,
    error: pceError,
    hasData: pceApi != null,
  });
  const cpiComponentsPending = isEconomyDataPending({
    isLoading: cpiComponentsLoading,
    error: cpiComponentsError,
    hasData: cpiComponentsApi != null,
  });
  const updatedDisplay = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

  const lastSegmentDelta = cpiHeadline.lastSegmentDelta;
  const segmentTrendColor =
    lastSegmentDelta.trendsUp === true
      ? RED
      : lastSegmentDelta.trendsUp === false
        ? ECONOMY_DASHBOARD_POSITIVE_GREEN
        : semantic.mutedText;
  const segmentTrendIcon =
    lastSegmentDelta.trendsUp === true
      ? ("trending-up" as const)
      : lastSegmentDelta.trendsUp === false
        ? ("trending-down" as const)
        : ("minus" as const);

  return (
    <EconomyDetailShell
      pageTitle="INFLATION & PRICES"
      showLiveFeed={false}
      headerLayout="sectorInline"
      updatedDisplay={updatedDisplay}
    >
      <EconomyCard>
        <ThemedText
          style={[laborStyles.tableTitle, { color: theme.text, marginBottom: Spacing.sm }]}
        >
          CONSUMER PRICE INDEX
        </ThemedText>
        <View style={styles.cpiTopRow}>
          <ThemedText style={[styles.cpiHero, { color: interactive.primary }]}>
            {cpiPending ? "—" : cpiHeadline.valueLabel}
          </ThemedText>
          <View style={styles.trendCol}>
            <ThemedText style={[styles.trendLabel, { color: semantic.mutedText }]}>
              {cpiPending
                ? "PERIOD CHANGE"
                : cpiHeadline.periodLabel.toUpperCase() || "PERIOD CHANGE"}
            </ThemedText>
            {!cpiPending && lastSegmentDelta.label ? (
              <View style={styles.trendDeltaRow}>
                <Feather name={segmentTrendIcon} size={14} color={segmentTrendColor} />
                <ThemedText style={[styles.trendDelta, { color: segmentTrendColor }]}>
                  {lastSegmentDelta.label}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
        <InflationCpiChart
          observations={cpiHeadline.observations}
          isLoading={cpiPending}
          errorMessage={cpiError}
        />
      </EconomyCard>

      <EconomyCard>
        <ThemedText
          style={[laborStyles.tableTitle, { color: theme.text, marginBottom: Spacing.sm }]}
        >
          PCE PRICE INDEX VS TARGET
        </ThemedText>
        <View style={styles.pceRow}>
          <ThemedText style={[styles.pceLabel, { color: theme.text }]}>{pceWidget.headlineLabel}</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            {pcePending ? "—" : pceWidget.headlineValueLabel}
          </ThemedText>
        </View>
        <View style={styles.barTrackWrap}>
          <View style={[styles.barTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: pcePending ? "0%" : `${pceWidget.headlinePct}%`,
                  backgroundColor: interactive.primary,
                },
              ]}
            />
          </View>
          <View style={[styles.targetLine, { left: `${pceWidget.targetPct}%` }]} />
        </View>
        <View style={[styles.pceRow, { marginTop: Spacing.md }]}>
          <ThemedText style={[styles.pceLabel, { color: theme.text }]}>{pceWidget.coreLabel}</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            {pcePending ? "—" : pceWidget.coreValueLabel}
          </ThemedText>
        </View>
        <View style={styles.barTrackWrap}>
          <View style={[styles.barTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: pcePending ? "0%" : `${pceWidget.corePct}%`,
                  backgroundColor: interactive.primary,
                },
              ]}
            />
          </View>
          <View style={[styles.targetLine, { left: `${pceWidget.targetPct}%` }]} />
        </View>
        <ThemedText style={[styles.targetCaption, { color: semantic.mutedText }]}>
          {pcePending ? "FED TARGET (—)" : `FED TARGET (${pceWidget.targetValueLabel})`}
        </ThemedText>
        <View style={[styles.quoteBox, { backgroundColor: interactive.primarySoft }]}>
          <ThemedText style={[styles.quoteText, { color: theme.text }]}>
            {"The Core PCE index, which excludes food and energy, remains the Federal Reserve's preferred inflation gauge."}
          </ThemedText>
        </View>
      </EconomyCard>

      {SHOW_LIVE_FED_TERMINAL ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.promoCard,
            {
              backgroundColor: isDark ? Brand.darkSurfaceContainerHigh : "#334155",
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.promoKicker, { color: interactive.primary }]}>
            LIVE FED TERMINAL
          </ThemedText>
          <ThemedText style={styles.promoTitle}>Access Premium Real-Time Datasets</ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.sectionHeader}>
        <Feather name="list" size={18} color={interactive.primary} />
        <View style={styles.sectionHeaderText}>
          <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
            CPI COMPONENTS BREAKDOWN
          </ThemedText>
          {!cpiComponentsPending && cpiComponentsWidget.observationDateLabel ? (
            <ThemedText style={[styles.sectionSubtitle, { color: semantic.mutedText }]}>
              {`YoY as of ${cpiComponentsWidget.observationDateLabel} · Headline ${cpiComponentsWidget.headlineYoyLabel}`}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {cpiComponentsError && !cpiComponentsPending ? (
        <ThemedText style={[styles.sectionSubtitle, { color: semantic.mutedText, marginBottom: Spacing.sm }]}>
          {cpiComponentsError}
        </ThemedText>
      ) : null}

      <View style={styles.componentGrid}>
        {(cpiComponentsPending ? [] : cpiComponentsWidget.components).map((c) => (
          <View
            key={c.key}
            style={[
              styles.componentCell,
              {
                backgroundColor: semantic.cardBackground,
                borderColor: isDark ? semantic.hairline : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
              semantic.cardShadow,
            ]}
          >
            <Ionicons name={componentIcon(c.icon)} size={22} color={interactive.primary} />
            <ThemedText type="defaultSemiBold" style={[styles.compTitle, { color: theme.text }]} numberOfLines={2}>
              {c.title}
            </ThemedText>
            {c.nestedNote ? (
              <ThemedText style={[styles.compNestedNote, { color: semantic.mutedText }]} numberOfLines={2}>
                {c.nestedNote}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[
                styles.compYoy,
                c.yoyPositive === true && { color: ECONOMY_DASHBOARD_POSITIVE_GREEN },
                c.yoyPositive === false && { color: RED },
                c.yoyPositive === null && { color: theme.text },
              ]}
            >
              {c.yoyLabel} YOY
            </ThemedText>
            {c.vsHeadlineLabel ? (
              <ThemedText style={[styles.compContrib, { color: semantic.mutedText }]}>
                {c.vsHeadlineLabel}
              </ThemedText>
            ) : c.hasError ? (
              <ThemedText style={[styles.compContrib, { color: semantic.mutedText }]}>
                Data unavailable
              </ThemedText>
            ) : null}
          </View>
        ))}
        {cpiComponentsPending
          ? Array.from({ length: 5 }, (_, index) => (
              <View
                key={`cpi-component-placeholder-${index}`}
                style={[
                  styles.componentCell,
                  {
                    backgroundColor: semantic.cardBackground,
                    borderColor: isDark ? semantic.hairline : "transparent",
                    borderWidth: isDark ? 1 : 0,
                  },
                  semantic.cardShadow,
                ]}
              >
                <ThemedText style={[styles.compTitle, { color: semantic.mutedText }]}>—</ThemedText>
                <ThemedText style={[styles.compYoy, { color: semantic.mutedText }]}>— YOY</ThemedText>
              </View>
            ))
          : null}
      </View>

      <EconomyCard>
        <View style={styles.tableHead}>
          <ThemedText style={[styles.th, { color: semantic.mutedText, flex: 1.4 }]}>METRIC</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>LATEST</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>PREVIOUS</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>DELTA</ThemedText>
        </View>
        {(cpiComponentsPending
          ? Array.from({ length: 6 }, (_, index) => ({
              key: `cpi-metric-placeholder-${index}`,
              metric: "—",
              latest: "—",
              previous: "—",
              delta: "—",
              deltaPositive: null,
            }))
          : cpiComponentsWidget.metricTable
        ).map((row) => (
          <View key={row.key} style={[styles.tr, { borderTopColor: semantic.hairline }]}>
            <ThemedText style={[styles.td, { color: theme.text, flex: 1.4 }]} numberOfLines={2}>
              {row.metric}
            </ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.latest}</ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.previous}</ThemedText>
            <ThemedText
              style={[
                styles.td,
                styles.tdNum,
                row.deltaPositive === true && { color: ECONOMY_DASHBOARD_POSITIVE_GREEN },
                row.deltaPositive === false && { color: RED },
                row.deltaPositive === null && { color: semantic.mutedText },
              ]}
            >
              {row.delta}
            </ThemedText>
          </View>
        ))}
      </EconomyCard>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  cpiTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cpiHero: {
    fontSize: 36,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.8,
  },
  trendCol: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  trendLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  trendDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendDelta: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  pceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pceLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
  },
  barTrackWrap: {
    marginTop: 8,
    position: "relative",
    height: 12,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  targetLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 12,
    marginLeft: -1,
    backgroundColor: Brand.outline,
    borderRadius: 1,
  },
  targetCaption: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 6,
    textAlign: "center",
  },
  quoteBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    fontFamily: Fonts.body,
  },
  promoCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 8,
  },
  promoKicker: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 17,
    fontFamily: Fonts.displaySemibold,
    color: "#f8fafc",
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.body,
    lineHeight: 15,
  },
  componentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  componentCell: {
    width: "47%",
    flexGrow: 1,
    minWidth: 148,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 8,
  },
  compTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  compNestedNote: {
    fontSize: 11,
    fontFamily: Fonts.body,
    lineHeight: 14,
  },
  compYoy: {
    fontSize: 16,
    fontFamily: Fonts.displaySemibold,
  },
  compContrib: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  th: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.15,
  },
  thNum: {
    flex: 0.85,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  td: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  tdNum: {
    flex: 0.85,
    textAlign: "right",
    fontFamily: Fonts.bodySemiBold,
  },
});
