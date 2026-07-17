import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { EconomyDashboardInfoSections } from "@/components/economy/tab/EconomyDashboardInfoSections";
import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { EconomyFeedSkeletonList } from "@/components/economy/tab/EconomyFeedCardSkeleton";
import { EconomySectorFeedList } from "@/components/economy/tab/EconomySectorFeedList";
import { EconomySentimentHeroCard } from "@/components/economy/tab/EconomySentimentHeroCard";
import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Colors } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { buildEconomyFeedRows } from "@/lib/economy/economyTabFeed";

const sentimentScore = 74;
const sentimentDelta = 2.4;
const sentimentStability = 68.2;

const DEVELOPMENTS = [
  "Fed Beige Book highlights modest growth and resilient labor conditions.",
  "Crude oil inventories rise more than expected, softening energy inflation risk.",
  "Initial jobless claims hold near cycle lows as hiring remains steady.",
];

const MONITORING = [
  "Unemployment claims trend",
  "Treasury curve shape",
  "Inflation expectations",
  "Bank credit conditions",
];

export default function EconomyDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const gaugePositiveColor = isDark ? "#4ADE80" : "#2e7d32";

  const [selectedBarIndexBySector, setSelectedBarIndexBySector] = useState<
    Record<string, number>
  >({});

  const { economyOverview, isEconomyOverviewLoading, economyOverviewError } =
    useEconomyTabDashboard();

  const feedRows = useMemo(
    () => buildEconomyFeedRows(economyOverview),
    [economyOverview],
  );

  const overviewPending = isEconomyDataPending({
    isLoading: isEconomyOverviewLoading,
    error: economyOverviewError,
    hasData: economyOverview != null,
  });

  const displayAsOf = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeader}>
          <AppBrandBar icon="bar-chart" />
          <ThemedText style={[styles.pageMeta, { color: semantic.mutedText }]}>
            UPDATED {displayAsOf}
          </ThemedText>
        </View>

        <EconomySentimentHeroCard
          semantic={semantic}
          isDark={isDark}
          gaugePositiveColor={gaugePositiveColor}
          sentimentScore={sentimentScore}
          sentimentDelta={sentimentDelta}
          sentimentStability={sentimentStability}
        />

        {overviewPending ? (
          <EconomyFeedSkeletonList count={4} semantic={semantic} />
        ) : (
          <EconomySectorFeedList
            router={router}
            feedRows={feedRows}
            semantic={semantic}
            theme={theme}
            isDark={isDark}
            isEconomyOverviewLoading={isEconomyOverviewLoading}
            economyOverview={economyOverview}
            selectedBarIndexBySector={selectedBarIndexBySector}
            onSelectBarIndex={(sectorId, index) =>
              setSelectedBarIndexBySector((prev) => ({
                ...prev,
                [sectorId]: index,
              }))
            }
          />
        )}

        <EconomyDashboardInfoSections
          semantic={semantic}
          theme={theme}
          developments={DEVELOPMENTS}
          monitoring={MONITORING}
        />
      </ScrollView>
    </ThemedView>
  );
}
