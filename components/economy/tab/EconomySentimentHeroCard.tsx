import { View } from "react-native";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { EconomySentimentGauge } from "@/components/economy/tab/EconomySentimentGauge";
import { ThemedText } from "@/components/theme/ThemedText";

import type { EconomySentimentPayload } from "@/lib/economy/economyOverviewTypes";
import { sentimentLabel } from "@/lib/economy/economyTabFeed";

type Semantic = {
  mutedText: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: object;
};

export type EconomySentimentHeroCardProps = {
  semantic: Semantic;
  isDark: boolean;
  gaugePositiveColor: string;
  sentiment: EconomySentimentPayload;
};

function formatHeroStat(
  value: number | undefined,
  fallback: string,
  suffix = "",
): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(1)}${suffix}`;
  }
  return fallback;
}

export function EconomySentimentHeroCard({
  semantic,
  isDark,
  gaugePositiveColor,
  sentiment,
}: EconomySentimentHeroCardProps) {
  const { score, volatility_pct, stability, status_label, period_label, trend } =
    sentiment;

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: semantic.cardBackground,
          borderColor: semantic.cardBorder,
        },
        semantic.cardShadow,
      ]}
    >
      <EconomySentimentGauge
        score={score}
        statusLabel={status_label}
        periodLabel={period_label}
        trend={trend}
        isDark={isDark}
        mutedTextColor={semantic.mutedText}
        positiveAccentColor={gaugePositiveColor}
      />

      <ThemedText type="defaultSemiBold" style={styles.heroTitle}>
        Economic Sentiment Index
      </ThemedText>
      <ThemedText
        style={[styles.heroDescription, { color: semantic.mutedText }]}
      >
        Aggregate trend score across broad macro conditions and labor
        momentum.
      </ThemedText>

      <View style={styles.heroStatsRow}>
        <View
          style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
        >
          <ThemedText
            style={[styles.heroStatLabel, { color: semantic.mutedText }]}
          >
            TREND
          </ThemedText>
          <ThemedText
            style={[styles.heroStatValue, { color: gaugePositiveColor }]}
          >
            {sentimentLabel(score)}
          </ThemedText>
        </View>
        <View
          style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
        >
          <ThemedText
            style={[styles.heroStatLabel, { color: semantic.mutedText }]}
          >
            VOLATILITY
          </ThemedText>
          <ThemedText
            style={[
              styles.heroStatValue,
              { color: isDark ? "#FACC15" : "#A16207" },
            ]}
          >
            {formatHeroStat(volatility_pct, "—", "%")}
          </ThemedText>
        </View>
        <View
          style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
        >
          <ThemedText
            style={[styles.heroStatLabel, { color: semantic.mutedText }]}
          >
            STABILITY
          </ThemedText>
          <ThemedText
            style={[
              styles.heroStatValue,
              { color: isDark ? "#60A5FA" : "#1D4ED8" },
            ]}
          >
            {formatHeroStat(stability, "—")}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
