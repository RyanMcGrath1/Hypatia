import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { ThemedText } from "@/components/theme/ThemedText";

type Semantic = {
  mutedText: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: object;
};

type ThemeTint = { tint: string };

/** Placeholder tile — no live feed yet (FRED has no news API). Flip on when wired up. */
const SHOW_LATEST_DEVELOPMENTS = false;

/** Placeholder tile — static watchlist until a live source exists. Flip on when wired up. */
const SHOW_MONITORING_ITEMS = false;

export type EconomyDashboardInfoSectionsProps = {
  semantic: Semantic;
  theme: ThemeTint;
  developments: string[];
  monitoring: string[];
};

export function EconomyDashboardInfoSections({
  semantic,
  theme,
  developments,
  monitoring,
}: EconomyDashboardInfoSectionsProps) {
  return (
    <>
      {SHOW_LATEST_DEVELOPMENTS ? (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <View style={styles.infoHeader}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              LATEST DEVELOPMENTS
            </ThemedText>
            <Feather name="bell" size={13} color={semantic.mutedText} />
          </View>
          {developments.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View
                style={[styles.bulletDot, { backgroundColor: theme.tint }]}
              />
              <ThemedText
                style={[styles.bulletText, { color: semantic.mutedText }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {SHOW_MONITORING_ITEMS ? (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <View style={styles.infoHeader}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              MONITORING ITEMS
            </ThemedText>
            <Feather name="alert-circle" size={13} color={semantic.mutedText} />
          </View>
          {monitoring.map((item) => (
            <View key={item} style={styles.monitorRow}>
              <Feather name="activity" size={12} color={semantic.mutedText} />
              <ThemedText
                style={[styles.monitorText, { color: semantic.mutedText }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
