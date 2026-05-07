import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { EconomyDetailShell } from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const GDP_SPARK = [0.3, 0.34, 0.31, 0.38, 0.55, 0.63, 0.57, 0.43, 0.36, 0.42, 0.7];
const GDP_SPARK_LABELS = ["Q1 23", "Q1 24", "Q2 24", "Q3 24"];

function curvePath(values: number[], width: number, height: number): string {
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = (1 - v) * height;
    return { x, y };
  });
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const c1x = prev.x + stepX / 2;
    const c1y = prev.y;
    const c2x = curr.x - stepX / 2;
    const c2y = curr.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function GdpGrowthDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";

  const spark = useMemo(() => {
    const w = 288;
    const h = 84;
    return {
      line: curvePath(GDP_SPARK, w, h),
      area: `${curvePath(GDP_SPARK, w, h)} L ${w} ${h} L 0 ${h} Z`,
    };
  }, []);

  return (
    <EconomyDetailShell
      pageTitle="ECONOMICA"
      showLiveFeed={false}
      headerLayout="sectorInline"
      inlineHeaderIcon="trending-up"
    >
      <EconomyCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>
            REAL GDP GROWTH RATE
          </ThemedText>
          <View style={styles.heroIcons}>
            <Ionicons name="share-social-outline" size={16} color={semantic.mutedText} />
            <Ionicons name="ellipsis-vertical" size={14} color={semantic.mutedText} />
          </View>
        </View>
        <ThemedText style={[styles.heroValue, { color: theme.text }]}>+2.4%</ThemedText>
        <ThemedText style={[styles.heroSub, { color: semantic.mutedText }]}>
          Quarter-over-Quarter (Q3 2024)
        </ThemedText>
        <View style={[styles.sparkWrap, { backgroundColor: semantic.cardSubtleBackground }]}>
          <Svg width={288} height={84}>
            <Path d={spark.area} fill={isDark ? "rgba(74,108,247,0.18)" : "rgba(74,108,247,0.15)"} />
            <Path d={spark.line} stroke={interactive.primary} strokeWidth={2} fill="none" />
          </Svg>
        </View>
        <View style={styles.sparkLabels}>
          {GDP_SPARK_LABELS.map((label) => (
            <ThemedText key={label} style={[styles.sparkLabel, { color: semantic.mutedText }]}>
              {label}
            </ThemedText>
          ))}
        </View>
      </EconomyCard>

      <EconomyCard style={styles.forecastCard}>
        <View
          style={[
            styles.forecastGradient,
            {
              backgroundColor: isDark ? "rgba(74,108,247,0.12)" : "#EEF2FF",
            },
          ]}
        >
          <View style={styles.forecastKickerRow}>
            <Ionicons name="sparkles" size={12} color={interactive.primary} />
            <ThemedText style={[styles.forecastKicker, { color: interactive.primary }]}>
              AI ECONOMIC FORECAST
            </ThemedText>
          </View>
          <ThemedText style={[styles.forecastTitle, { color: theme.text }]}>
            Stable Convergence
          </ThemedText>
          <ThemedText style={[styles.forecastBody, { color: semantic.mutedText }]}>
            Predictive models suggest a 2.1% growth trajectory for Q4. Recent consumer spending data correlates
            with a cooling but resilient labor market.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.modelBtn,
              { backgroundColor: interactive.primaryFill, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText style={[styles.modelBtnText, { color: interactive.onPrimaryFill }]}>
              View Model Details
            </ThemedText>
          </Pressable>
        </View>
      </EconomyCard>

      <EconomyCard>
        <View style={styles.sectionHeadRow}>
          <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>SECTOR CONTRIBUTION</ThemedText>
          <Ionicons name="information-circle-outline" size={14} color={semantic.mutedText} />
        </View>
        {[
          { label: "Services", value: 72, color: interactive.primary },
          { label: "Manufacturing", value: 18, color: "#4B5563" },
          { label: "Agriculture", value: 10, color: "#B45309" },
        ].map((row) => (
          <View key={row.label} style={styles.contribRow}>
            <View style={styles.contribLabelRow}>
              <ThemedText style={[styles.contribLabel, { color: theme.text }]}>{row.label}</ThemedText>
              <ThemedText style={[styles.contribPct, { color: theme.text }]}>{row.value}%</ThemedText>
            </View>
            <View style={[styles.contribTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
              <View style={[styles.contribFill, { width: `${row.value}%`, backgroundColor: row.color }]} />
            </View>
          </View>
        ))}
      </EconomyCard>

      <EconomyCard>
        <View style={styles.sectionHeadRow}>
          <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>GROWTH HEADWINDS & RISKS</ThemedText>
          <Ionicons name="warning-outline" size={14} color={isDark ? "#FCA5A5" : "#991B1B"} />
        </View>
        {[
          { icon: "git-branch", title: "Supply Chain", body: "Logistical constraints in key ports.", risk: "Medium Risk" },
          { icon: "bank", title: "Interest Rates", body: "Potential +25bps hike in Q1.", risk: "High Risk" },
        ].map((risk) => (
          <View key={risk.title} style={[styles.riskCard, { borderColor: semantic.hairline }]}>
            <View style={styles.riskHead}>
              <Feather name={risk.icon as keyof typeof Feather.glyphMap} size={13} color={semantic.mutedText} />
              <ThemedText style={[styles.riskTitle, { color: theme.text }]}>{risk.title}</ThemedText>
            </View>
            <ThemedText style={[styles.riskBody, { color: semantic.mutedText }]}>{risk.body}</ThemedText>
            <ThemedText style={[styles.riskFlag, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>{risk.risk}</ThemedText>
          </View>
        ))}
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.historyTitle, { color: theme.text }]}>Historical Performance</ThemedText>
        <ThemedText style={[styles.historySub, { color: semantic.mutedText }]}>
          Real vs. Nominal GDP Growth (5-Year Horizon)
        </ThemedText>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.pillDot, { backgroundColor: interactive.primary }]} />
            <ThemedText style={[styles.pillText, { color: semantic.mutedText }]}>Real GDP</ThemedText>
          </View>
          <View style={[styles.pill, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.pillDot, { backgroundColor: "#111827" }]} />
            <ThemedText style={[styles.pillText, { color: semantic.mutedText }]}>Nominal GDP</ThemedText>
          </View>
        </View>
        <View style={[styles.historyViz, { backgroundColor: semantic.cardSubtleBackground }]}>
          <Ionicons name="trending-up-outline" size={34} color={interactive.primary} />
          <ThemedText style={[styles.historyHint, { color: semantic.mutedText }]}>
            Interactive Historical Data Visualizer
          </ThemedText>
        </View>
      </EconomyCard>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    paddingBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  heroIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kicker: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.4,
  },
  heroValue: {
    marginTop: 2,
    fontSize: 38,
    lineHeight: 42,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.6,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  sparkWrap: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  sparkLabels: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sparkLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodyMedium,
  },
  forecastCard: {
    padding: 0,
    overflow: "hidden",
  },
  forecastGradient: {
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: "#4A6CF7",
    gap: 8,
  },
  forecastKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  forecastKicker: {
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.4,
  },
  forecastTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.displaySemibold,
  },
  forecastBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  modelBtn: {
    marginTop: Spacing.sm,
    minHeight: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modelBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  sectionHeadRow: {
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contribRow: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  contribLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contribLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  contribPct: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  contribTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  contribFill: {
    height: "100%",
    borderRadius: 999,
  },
  riskCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  riskHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  riskTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  riskBody: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  riskFlag: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  historyTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Fonts.displaySemibold,
  },
  historySub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  historyViz: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  historyHint: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
});
