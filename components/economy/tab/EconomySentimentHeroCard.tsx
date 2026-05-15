import { View } from "react-native";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { EconomySentimentGauge } from "@/components/economy/tab/EconomySentimentGauge";
import { ThemedText } from "@/components/theme/ThemedText";

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
  sentimentScore: number;
  sentimentDelta: number;
  sentimentStability: number;
};

export function EconomySentimentHeroCard({
  semantic,
  isDark,
  gaugePositiveColor,
  sentimentScore,
  sentimentDelta,
  sentimentStability,
}: EconomySentimentHeroCardProps) {
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
        score={sentimentScore}
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
            {sentimentLabel(sentimentScore)}
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
            {sentimentDelta.toFixed(1)}%
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
            {sentimentStability.toFixed(1)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
