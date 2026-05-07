import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Brand, Colors } from "@/constants/theme/Colors";
import { TAB_SCREEN_CONTENT_INSETS } from "@/constants/navigation/tabScreenContentInsets";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const RECENT_SEARCHES = ["Alex Rivera", "CPI Data", "Semiconductor Trade"] as const;

const FEATURED_IMAGE =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  const browseDomains = useMemo(
    () =>
      [
        {
          id: "economy",
          title: "National Economics",
          subtitle: "GDP, Labor, Inflation",
          icon: "bar-chart" as const,
          iconBg: interactive.primarySoft,
          iconColor: interactive.primary,
          href: "/(tabs)/economy" as const,
        },
        {
          id: "politician",
          title: "Politician Research",
          subtitle: "Profiles, Voting Records, Financials",
          icon: "people" as const,
          iconBg: interactive.infoSoft,
          iconColor: interactive.primary,
          href: "/(tabs)/politician" as const,
        },
        {
          id: "news",
          title: "AI News Feed",
          subtitle: "Latest headlines & AI insights",
          icon: "newspaper" as const,
          iconBg: interactive.warningSoft,
          iconColor: interactive.tertiary,
          href: "/(tabs)/" as const,
        },
      ] as const,
    [interactive],
  );

  const canvasTint = isDark ? semantic.screenBackground : "#F4F2FA";
  const [searchQuery, setSearchQuery] = useState("");

  const goTab = useCallback((href: string) => {
    router.push(href as Parameters<typeof router.push>[0]);
  }, []);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: canvasTint }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          TAB_SCREEN_CONTENT_INSETS,
          { paddingBottom: insets.bottom + FLOATING_TAB_CLEARANCE },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppBrandBar icon="search" />

        <View
          style={[
            styles.searchShell,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={semantic.mutedText} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search politicians, economic data, or reports"
            placeholderTextColor={semantic.mutedText}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
        </View>

        <View style={styles.recentRow}>
          <ThemedText style={[styles.recentLabel, { color: semantic.mutedText }]}>
            Recent:
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentChipsContent}
          >
            {RECENT_SEARCHES.map((label) => (
              <Pressable
                key={label}
                onPress={() => setSearchQuery(label)}
                style={({ pressed }) => [
                  styles.recentChip,
                  {
                    backgroundColor: semantic.cardSubtleBackground,
                    borderColor: semantic.cardBorder,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <ThemedText style={[styles.recentChipText, { color: theme.text }]}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ThemedText type="defaultSemiBold" style={[styles.sectionHeading, { color: theme.text }]}>
          Browse by Domain
        </ThemedText>
        <View style={styles.domainList}>
          {browseDomains.map((domain) => (
            <Pressable
              key={domain.id}
              accessibilityRole="button"
              accessibilityLabel={`${domain.title}: ${domain.subtitle}`}
              onPress={() => goTab(domain.href)}
              style={({ pressed }) => [
                styles.domainCard,
                {
                  backgroundColor: semantic.cardBackground,
                  borderColor: semantic.cardBorder,
                  opacity: pressed ? 0.92 : 1,
                },
                semantic.cardShadow,
              ]}
            >
              <View style={[styles.domainIcon, { backgroundColor: domain.iconBg }]}>
                <Ionicons name={domain.icon} size={22} color={domain.iconColor} />
              </View>
              <View style={styles.domainTextCol}>
                <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
                  {domain.title}
                </ThemedText>
                <ThemedText style={[styles.domainSubtitle, { color: semantic.mutedText }]}>
                  {domain.subtitle}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={semantic.mutedText} />
            </Pressable>
          ))}
        </View>

        <View style={styles.trendingHeader}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionHeading, { color: theme.text }]}>
            Trending Insights
          </ThemedText>
          <Pressable onPress={() => goTab("/(tabs)/economy")} hitSlop={8}>
            <ThemedText style={[styles.viewAnalysis, { color: interactive.primary }]}>
              View Analysis →
            </ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.featuredCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <View style={styles.featuredImageWrap}>
            <Image
              source={{ uri: FEATURED_IMAGE }}
              style={styles.featuredImage}
              contentFit="cover"
              transition={200}
            />
            <View style={[styles.pill, { backgroundColor: interactive.primaryFill }]}>
              <ThemedText style={styles.pillText}>AI IMPACT REPORT</ThemedText>
            </View>
          </View>
          <View style={styles.featuredBody}>
            <ThemedText type="defaultSemiBold" style={[styles.featuredTitle, { color: theme.text }]}>
              Tech Regulation Impact
            </ThemedText>
            <ThemedText style={[styles.featuredCopy, { color: semantic.mutedText }]}>
              Bill HR-842 could reshape semiconductor supply chains. Hypatia models
              second-order effects on labor and pricing over the next two quarters.
            </ThemedText>
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>
                  POTENTIAL RISK
                </ThemedText>
                <ThemedText style={[styles.metricValue, { color: interactive.danger }]}>
                  High
                </ThemedText>
              </View>
              <View style={styles.metricCol}>
                <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>
                  MARKET CONFIDENCE
                </ThemedText>
                <ThemedText style={[styles.metricValue, { color: interactive.info }]}>
                  68%
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => goTab("/(tabs)/economy")}
          style={({ pressed }) => [
            styles.promoCard,
            { backgroundColor: interactive.primaryFill, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Ionicons name="analytics" size={28} color={Brand.white} />
          <ThemedText style={styles.promoTitle}>Debt Ceiling Alpha</ThemedText>
          <ThemedText style={styles.promoSubtitle}>
            Forward-looking signal on fiscal headlines and rate sensitivity.
          </ThemedText>
          <View style={styles.promoCta}>
            <ThemedText style={[styles.promoCtaText, { color: interactive.primary }]}>
              Explore Signal
            </ThemedText>
          </View>
        </Pressable>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: semantic.cardSubtleBackground,
              borderColor: semantic.cardBorder,
            },
          ]}
        >
          <View style={styles.summaryTop}>
            <Ionicons name="shield-checkmark-outline" size={22} color={semantic.mutedText} />
            <ThemedText style={[styles.summaryDelta, { color: interactive.danger }]}>
              -1.2%
            </ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            Trade Tariffs
          </ThemedText>
          <ThemedText style={[styles.summaryCopy, { color: semantic.mutedText }]}>
            Watchlist item: import-sensitive sectors and retaliatory risk scenarios.
          </ThemedText>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick insights"
        onPress={() => goTab("/(tabs)/economy")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: interactive.primaryFill,
            bottom: insets.bottom + FAB_BOTTOM,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Ionicons name="flash" size={24} color={Brand.white} />
      </Pressable>
    </ThemedView>
  );
}

/** Space above the floating tab bar (height + offset + padding). */
const FLOATING_TAB_CLEARANCE = 112;
const FAB_BOTTOM = 88;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    gap: Spacing.md,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.body,
    paddingVertical: 10,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -4,
  },
  recentLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  recentChipsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recentChipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  sectionHeading: {
    fontSize: 16,
    marginTop: 4,
  },
  domainList: {
    gap: Spacing.sm,
  },
  domainCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 12,
  },
  domainIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  domainTextCol: {
    flex: 1,
    gap: 2,
  },
  domainSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  trendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  viewAnalysis: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  featuredCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  featuredImageWrap: {
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Brand.border,
  },
  pill: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    color: Brand.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  featuredBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  featuredTitle: {
    fontSize: 17,
  },
  featuredCopy: {
    fontSize: 13,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: 4,
  },
  metricCol: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
  },
  promoCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 8,
  },
  promoTitle: {
    color: Brand.white,
    fontSize: 18,
    fontFamily: Fonts.bodySemiBold,
  },
  promoSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 18,
  },
  promoCta: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  promoCtaText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 8,
    marginBottom: 8,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryDelta: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
  },
  summaryCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
