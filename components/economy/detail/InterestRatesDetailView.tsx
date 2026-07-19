import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { EconomyDetailShell } from "@/components/economy/detail/shared/EconomyDetailShell";
import { laborMarketDetailStyles as laborStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { getEconomicSectorById } from "@/constants/data/usEconomicData";
import { Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyRatesFedFundsTarget } from "@/hooks/useEconomyRatesFedFundsTarget";
import { useEconomyRatesKeyMetrics } from "@/hooks/useEconomyRatesKeyMetrics";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";
import { ratesFedFundsTargetFromApi } from "@/lib/economy/ratesFedFundsTargetViewModel";
import { ratesKeyMetricsFromApi } from "@/lib/economy/ratesKeyMetricsViewModel";

const RATES_SECTOR = getEconomicSectorById("rates");

export function InterestRatesDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];

  const { economyOverview } = useEconomyTabDashboard();
  const {
    data: fedFundsTargetApi,
    isLoading: fedFundsTargetLoading,
    error: fedFundsTargetError,
  } = useEconomyRatesFedFundsTarget();
  const fedFundsTargetWidget = useMemo(
    () => ratesFedFundsTargetFromApi(fedFundsTargetApi),
    [fedFundsTargetApi],
  );
  const fedFundsTargetPending = isEconomyDataPending({
    isLoading: fedFundsTargetLoading,
    error: fedFundsTargetError,
    hasData: fedFundsTargetApi != null,
  });
  const {
    data: keyMetricsApi,
    isLoading: keyMetricsLoading,
    error: keyMetricsError,
  } = useEconomyRatesKeyMetrics();
  const keyMetricsWidget = useMemo(
    () => ratesKeyMetricsFromApi(keyMetricsApi),
    [keyMetricsApi],
  );
  const keyMetricsPending = isEconomyDataPending({
    isLoading: keyMetricsLoading,
    error: keyMetricsError,
    hasData: keyMetricsApi != null,
  });
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
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
          {RATES_SECTOR.headlineLabel.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.heroValue}>
          {fedFundsTargetPending ? "—" : fedFundsTargetWidget.headlineValueLabel}
        </ThemedText>
        {!fedFundsTargetPending && fedFundsTargetWidget.observationDateLabel ? (
          <ThemedText style={[styles.asOf, { color: semantic.mutedText }]}>
            As of {fedFundsTargetWidget.observationDateLabel}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
          {RATES_SECTOR.summary}
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText
          style={[
            laborStyles.tableTitle,
            { color: theme.text, marginBottom: Spacing.sm },
          ]}
        >
          INTERPRETATION
        </ThemedText>
        <ThemedText style={styles.copy}>{RATES_SECTOR.interpretation}</ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText
          style={[
            laborStyles.tableTitle,
            { color: theme.text, marginBottom: Spacing.sm },
          ]}
        >
          KEY METRICS
        </ThemedText>
        {keyMetricsWidget.metrics.map((metric) => (
          <View
            key={metric.key}
            style={[styles.metricRow, { borderTopColor: semantic.hairline }]}
          >
            <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>
              {metric.label}
            </ThemedText>
            <ThemedText style={styles.metricValue}>
              {keyMetricsPending ? "—" : metric.valueLabel}
            </ThemedText>
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
  heroValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Fonts.displaySemibold,
  },
  asOf: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.body,
  },
  copy: {
    lineHeight: 20,
    fontFamily: Fonts.body,
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
