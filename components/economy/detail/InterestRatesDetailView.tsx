import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { EconomyDetailShell } from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { getEconomicSectorById } from "@/constants/data/usEconomicData";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";

const RATES_SECTOR = getEconomicSectorById("rates");

export function InterestRatesDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  const { economyOverview } = useEconomyTabDashboard();
  const updatedDisplay = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

  if (!RATES_SECTOR) {
    return null;
  }

  return (
    <EconomyDetailShell
      pageTitle="INTEREST RATES"
      showLiveFeed={false}
      headerLayout="sectorInline"
      inlineHeaderIcon="percent"
      updatedDisplay={updatedDisplay}
    >
      <EconomyCard style={styles.heroCard}>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>
          {RATES_SECTOR.headlineLabel.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.heroValue}>{RATES_SECTOR.headlineValue}</ThemedText>
        <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
          {RATES_SECTOR.summary}
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.sectionTitle, { color: semantic.mutedText }]}>
          INTERPRETATION
        </ThemedText>
        <ThemedText style={styles.copy}>{RATES_SECTOR.interpretation}</ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.sectionTitle, { color: semantic.mutedText }]}>
          KEY METRICS
        </ThemedText>
        {RATES_SECTOR.metrics.map((metric) => (
          <View
            key={metric.label}
            style={[styles.metricRow, { borderTopColor: semantic.hairline }]}
          >
            <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>
              {metric.label}
            </ThemedText>
            <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
            <ThemedText style={[styles.metricNote, { color: semantic.mutedText }]}>
              {metric.note}
            </ThemedText>
          </View>
        ))}
      </EconomyCard>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Fonts.displaySemibold,
  },
  copy: {
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  metricValue: {
    fontFamily: Fonts.bodySemiBold,
  },
  metricNote: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
});
