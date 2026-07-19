import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { InflationCpiChart } from "@/components/economy/detail/inflation/InflationCpiChart";
import { laborMarketDetailStyles as laborStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  INFLATION_CPI_COMPONENTS,
  INFLATION_METRIC_TABLE,
  INFLATION_PCE_CORE,
  INFLATION_PCE_HEADLINE,
  INFLATION_PCE_SCALE_MAX,
  INFLATION_PCE_TARGET,
  type InflationComponentCard,
} from "@/components/economy/detail/inflation/inflationDetailData";
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
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";

const RED = "#DC2626";

function componentIcon(name: InflationComponentCard["icon"]) {
  switch (name) {
    case "home":
      return "home-outline" as const;
    case "restaurant":
      return "restaurant-outline" as const;
    case "flash":
      return "flash-outline" as const;
    case "briefcase":
      return "briefcase-outline" as const;
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

  const headlinePct = (INFLATION_PCE_HEADLINE / INFLATION_PCE_SCALE_MAX) * 100;
  const corePct = (INFLATION_PCE_CORE / INFLATION_PCE_SCALE_MAX) * 100;
  const targetPct = (INFLATION_PCE_TARGET / INFLATION_PCE_SCALE_MAX) * 100;

  const { economyOverview } = useEconomyTabDashboard();
  const updatedDisplay = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

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
          CONSUMER PRICE INDEX (YOY)
        </ThemedText>
        <View style={styles.cpiTopRow}>
          <ThemedText style={[styles.cpiHero, { color: interactive.primary }]}>3.1%</ThemedText>
          <View style={styles.trendCol}>
            <ThemedText style={[styles.trendLabel, { color: semantic.mutedText }]}>12-MONTH TREND</ThemedText>
            <View style={styles.trendDeltaRow}>
              <Feather name="trending-down" size={14} color={RED} />
              <ThemedText style={[styles.trendDelta, { color: RED }]}>~ −0.1% FROM PREV</ThemedText>
            </View>
          </View>
        </View>
        <InflationCpiChart />
      </EconomyCard>

      <EconomyCard>
        <ThemedText
          style={[laborStyles.tableTitle, { color: theme.text, marginBottom: Spacing.sm }]}
        >
          PCE PRICE INDEX VS TARGET
        </ThemedText>
        <View style={styles.pceRow}>
          <ThemedText style={[styles.pceLabel, { color: theme.text }]}>PCE Headline</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            {INFLATION_PCE_HEADLINE}%
          </ThemedText>
        </View>
        <View style={styles.barTrackWrap}>
          <View style={[styles.barTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.barFill, { width: `${headlinePct}%`, backgroundColor: interactive.primary }]} />
          </View>
          <View style={[styles.targetLine, { left: `${targetPct}%` }]} />
        </View>
        <View style={[styles.pceRow, { marginTop: Spacing.md }]}>
          <ThemedText style={[styles.pceLabel, { color: theme.text }]}>Core PCE</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            {INFLATION_PCE_CORE}%
          </ThemedText>
        </View>
        <View style={styles.barTrackWrap}>
          <View style={[styles.barTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.barFill, { width: `${corePct}%`, backgroundColor: interactive.primary }]} />
          </View>
          <View style={[styles.targetLine, { left: `${targetPct}%` }]} />
        </View>
        <ThemedText style={[styles.targetCaption, { color: semantic.mutedText }]}>FED TARGET (2.0%)</ThemedText>
        <View style={[styles.quoteBox, { backgroundColor: interactive.primarySoft }]}>
          <ThemedText style={[styles.quoteText, { color: theme.text }]}>
            {"The Core PCE index, which excludes food and energy, remains the Federal Reserve's preferred inflation gauge."}
          </ThemedText>
        </View>
      </EconomyCard>

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
        <ThemedText style={[styles.promoKicker, { color: interactive.primary }]}>LIVE FED TERMINAL</ThemedText>
        <ThemedText style={styles.promoTitle}>Access Premium Real-Time Datasets</ThemedText>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Feather name="list" size={18} color={interactive.primary} />
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
          CPI COMPONENTS BREAKDOWN
        </ThemedText>
      </View>

      <View style={styles.componentGrid}>
        {INFLATION_CPI_COMPONENTS.map((c) => (
          <View
            key={c.id}
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
            <View style={[styles.weightPill, { backgroundColor: semantic.cardSubtleBackground }]}>
              <ThemedText style={[styles.weightText, { color: semantic.mutedText }]}>WEIGHT: {c.weightPct}%</ThemedText>
            </View>
            <ThemedText
              style={[
                styles.compYoy,
                c.yoyPositive === true && { color: ECONOMY_DASHBOARD_POSITIVE_GREEN },
                c.yoyPositive === false && { color: RED },
                c.yoyPositive === null && { color: theme.text },
              ]}
            >
              {c.yoy} YOY
            </ThemedText>
            <ThemedText style={[styles.compContrib, { color: semantic.mutedText }]}>
              Contribution: {c.contribution}
            </ThemedText>
          </View>
        ))}
      </View>

      <EconomyCard>
        <View style={styles.tableHead}>
          <ThemedText style={[styles.th, { color: semantic.mutedText, flex: 1.4 }]}>METRIC</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>LATEST</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>PREVIOUS</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>DELTA</ThemedText>
        </View>
        {INFLATION_METRIC_TABLE.map((row) => (
          <View key={row.metric} style={[styles.tr, { borderTopColor: semantic.hairline }]}>
            <ThemedText style={[styles.td, { color: theme.text, flex: 1.4 }]} numberOfLines={2}>
              {row.metric}
            </ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.latest}</ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.previous}</ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: RED }]}>{row.delta}</ThemedText>
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
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
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
  weightPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  weightText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
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
