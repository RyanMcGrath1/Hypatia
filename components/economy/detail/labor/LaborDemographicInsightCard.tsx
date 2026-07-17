import { Pressable, View } from "react-native";

import { laborDemographicAnalysisStyles as styles } from "@/components/economy/detail/labor/LaborDemographicAnalysisCard.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, type ThemeInteractive } from "@/constants/theme/Colors";
import type { LaborDemographicAnalysisModel } from "@/lib/economy/laborDemographicTypes";

/** Hypatia insight banner (e.g. "Youth Unemployment Elevated"). Not mounted on labor page — kept for re-implementation. */
export type LaborDemographicInsightCardProps = {
  insight: LaborDemographicAnalysisModel["insight"];
  interactive: Pick<ThemeInteractive, "primary">;
};

export function LaborDemographicInsightCard({
  insight,
  interactive,
}: LaborDemographicInsightCardProps) {
  return (
    <View
      style={[styles.insightCard, { backgroundColor: interactive.primary }]}
    >
      <ThemedText
        style={[styles.insightKicker, { color: "rgba(255,255,255,0.82)" }]}
      >
        ✦ {insight.kicker}
      </ThemedText>
      <ThemedText style={[styles.insightTitle, { color: Brand.paper }]}>
        {insight.title}
      </ThemedText>
      <ThemedText
        style={[styles.insightBody, { color: "rgba(255,255,255,0.92)" }]}
      >
        {insight.body}
      </ThemedText>
      <View style={styles.resilienceRow}>
        <ThemedText
          style={[
            styles.resilienceLabel,
            { color: "rgba(255,255,255,0.88)" },
          ]}
        >
          {insight.resilienceLabel}
        </ThemedText>
        <ThemedText style={[styles.resilienceLevel, { color: Brand.paper }]}>
          {insight.resilienceLevel}
        </ThemedText>
      </View>
      <View
        style={[
          styles.resilienceTrack,
          { backgroundColor: "rgba(255,255,255,0.22)" },
        ]}
      >
        <View
          style={[
            styles.resilienceFill,
            {
              width: `${Math.round(insight.resilienceFill * 100)}%`,
              backgroundColor: Brand.paper,
            },
          ]}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View detailed demographic report"
        style={({ pressed }) => [
          styles.insightCta,
          {
            backgroundColor: Brand.paper,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <ThemedText
          style={[styles.insightCtaText, { color: interactive.primary }]}
        >
          View Detailed Report
        </ThemedText>
      </Pressable>
    </View>
  );
}
