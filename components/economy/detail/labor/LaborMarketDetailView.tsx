import Feather from "@expo/vector-icons/Feather";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  LABOR_EMPLOYMENT_BY_SECTOR,
  LABOR_PAYROLL_MONTHS,
  LABOR_PAYROLL_RELATIVE,
} from "@/components/economy/detail/labor/laborDetailData";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const CHART_GRAY_LIGHT = "#E5E7EB";
const CHART_GRAY_DARK = "#475569";

export function LaborMarketDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";
  const chartMuted = isDark ? CHART_GRAY_DARK : CHART_GRAY_LIGHT;
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const rows = useMemo(() => LABOR_EMPLOYMENT_BY_SECTOR, []);

  return (
    <EconomyDetailShell pageTitle="LABOR MARKET">
      <EconomyCard>
        <View style={styles.cardTopRow}>
          <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>NON-FARM PAYROLLS</ThemedText>
          <ThemedText style={[styles.periodLabel, { color: theme.text }]}>PERIOD DECEMBER 2023</ThemedText>
        </View>
        <ThemedText style={[styles.heroMetric, { color: theme.text }]}>+216k</ThemedText>
        <View style={styles.consensusRow}>
          <Feather name="trending-up" size={16} color={green} />
          <ThemedText style={[styles.consensusText, { color: green }]}>Above Consensus</ThemedText>
        </View>
        <View style={styles.chartArea}>
          <View style={[styles.dottedRule, { borderColor: semantic.hairline }]} />
          <View style={styles.barsRow}>
            {LABOR_PAYROLL_MONTHS.map((m, i) => {
              const isLast = i === LABOR_PAYROLL_MONTHS.length - 1;
              const h = LABOR_PAYROLL_RELATIVE[i] ?? 0.5;
              return (
                <View key={m} style={styles.barCol}>
                  {isLast ? (
                    <ThemedText style={[styles.barCallout, { color: interactive.primary }]}>216k</ThemedText>
                  ) : (
                    <View style={{ height: 16 }} />
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: Math.max(10, Math.round(h * 88)),
                          backgroundColor: isLast ? interactive.primary : chartMuted,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[styles.monthLabel, { color: semantic.mutedText }]}>{m}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>AVG HOURLY EARNINGS</ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>+0.4%</ThemedText>
          <ThemedText style={[styles.momBadge, { color: green }]}>MoM</ThemedText>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: semantic.hairline }]} />
        <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
          Prior: +0.3% | Est: +0.3%
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>PARTICIPATION RATE</ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>62.5%</ThemedText>
          <ThemedText style={[styles.deltaNeg, { color: interactive.danger }]}>-0.3%</ThemedText>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: semantic.hairline }]} />
        <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
          Multi-year low in labor force entry.
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <View style={styles.tableHeaderRow}>
          <ThemedText style={[styles.tableTitle, { color: theme.text }]}>
            EMPLOYMENT BY SECTOR (EST. CHANGE)
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export CSV"
            style={({ pressed }) => [
              styles.exportBtn,
              { borderColor: interactive.primary, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <ThemedText style={[styles.exportBtnText, { color: interactive.primary }]}>EXPORT CSV</ThemedText>
          </Pressable>
        </View>
        <View style={[styles.tableRule, { backgroundColor: semantic.hairline }]} />
        <View style={styles.tableHead}>
          <ThemedText style={[styles.th, { color: semantic.mutedText }]}>SECTOR</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>ADDED/LOST</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>GROWTH %</ThemedText>
          <ThemedText style={[styles.th, styles.thDist, { color: semantic.mutedText }]} numberOfLines={1}>
            DISTRIBUTION
          </ThemedText>
        </View>
        {rows.map((row) => (
          <View key={row.sector} style={[styles.tr, { borderTopColor: semantic.hairline }]}>
            <ThemedText style={[styles.td, { color: theme.text }]} numberOfLines={2}>
              {row.sector}
            </ThemedText>
            <ThemedText
              style={[
                styles.td,
                styles.tdNum,
                row.deltaPositive === true && { color: green },
                row.deltaPositive === false && { color: interactive.danger },
                row.deltaPositive === null && { color: semantic.mutedText },
              ]}
            >
              {row.delta}
            </ThemedText>
            <ThemedText
              style={[
                styles.td,
                styles.tdNum,
                row.growthPositive === true && { color: green },
                row.growthPositive === false && { color: interactive.danger },
                row.growthPositive === null && { color: semantic.mutedText },
              ]}
            >
              {row.growth}
            </ThemedText>
            <View style={styles.distCell}>
              <View style={[styles.distTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
                <View
                  style={[
                    styles.distFill,
                    {
                      width: `${Math.round(row.barFill * 100)}%`,
                      backgroundColor: row.barNegative ? interactive.danger : green,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </EconomyCard>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardKicker: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
    flex: 1,
  },
  periodLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.2,
    textAlign: "right",
    maxWidth: "48%",
  },
  heroMetric: {
    fontSize: 32,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  consensusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.md,
  },
  consensusText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  chartArea: {
    marginTop: Spacing.sm,
    position: "relative",
  },
  dottedRule: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 52,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
    minHeight: 120,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
  },
  barCallout: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    marginBottom: 4,
  },
  barTrack: {
    width: "100%",
    height: 88,
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 8,
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 8,
  },
  inlineMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  midMetric: {
    fontSize: 28,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.3,
  },
  momBadge: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
  },
  deltaNeg: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tableTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  exportBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exportBtnText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
  tableRule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: 4,
  },
  th: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
    flex: 1.15,
  },
  thNum: {
    flex: 0.75,
    textAlign: "right",
  },
  thDist: {
    flex: 1.1,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  td: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    flex: 1.15,
  },
  tdNum: {
    flex: 0.75,
    textAlign: "right",
    fontFamily: Fonts.bodySemiBold,
  },
  distCell: {
    flex: 1.1,
    justifyContent: "center",
  },
  distTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distFill: {
    height: "100%",
    borderRadius: 4,
  },
});
