import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { EconomyDashboardInfoSections } from "@/components/economy/tab/EconomyDashboardInfoSections";
import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { EconomySectorFeedList } from "@/components/economy/tab/EconomySectorFeedList";
import { EconomySentimentHeroCard } from "@/components/economy/tab/EconomySentimentHeroCard";
import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Colors } from "@/constants/theme/Colors";
import {
    getSemanticColors,
    getTabScreenCanvasTint,
} from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { formatOverviewAsOfDisplay } from "@/lib/economy/economyOverviewTypes";
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
  const canvasTint = getTabScreenCanvasTint(colorScheme);
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

  const overviewAsOf = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const displayAsOf = useMemo(() => {
    const iso = economyOverview?.as_of;
    if (typeof iso === "string" && iso.trim() !== "") {
      return formatOverviewAsOfDisplay(iso);
    }
    return overviewAsOf;
  }, [economyOverview, overviewAsOf]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: canvasTint }]}>
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

        {isEconomyOverviewLoading && (
          <StateNoticeCard
            title="Loading"
            message="Fetching economy overview…"
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.mutedText}
          />
        )}

        {economyOverviewError !== null && (
          <StateNoticeCard
            title="Something went wrong"
            message={economyOverviewError}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
          />
        )}

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
