import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PoliticianLineChart from "@/components/charts/PoliticianLineChart";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { usePoliticianSearch } from "@/hooks/usePoliticianSearch";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { MOCK_POLITICIANS } from "@/lib/politician/mockProfileSearch";
import type { PoliticianProfile } from "@/lib/politician/types";
import { politicianScreenStyles as ps } from "@/lib/politician/screenStyles";

type FilterId = "all" | "house" | "senate" | "democrat" | "republican";

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "house", label: "House" },
  { id: "senate", label: "Senate" },
  { id: "democrat", label: "Democrat" },
  { id: "republican", label: "Republican" },
];

const TRENDING_CARD_META: Record<
  string,
  { subtitle: string; sentiment: string; bars: "blue" | "red" }
> = {
  "Alex Harper": {
    subtitle: "CO • I",
    sentiment: "Sentiment: +8% Neutral/Positive",
    bars: "blue",
  },
  "Monica Reyes": {
    subtitle: "NM • D",
    sentiment: "Sentiment: +12% Neutral/Positive",
    bars: "blue",
  },
  "Daniel Brooks": {
    subtitle: "FL-07 • R",
    sentiment: "Sentiment: −4% Neutral/Negative",
    bars: "red",
  },
};

const LEGISLATIVE_ACTIONS = [
  {
    tag: "SENATE VOTE",
    variant: "blue" as const,
    time: "2 hours ago",
    title: "H.R. 2670: National Defense Authorization Act",
    footer: "Passed 87-13 • Bipartisan Support",
    description: null as string | null,
    showPartyDots: true,
  },
  {
    tag: "BILL SPONSOR",
    variant: "orange" as const,
    time: "Yesterday",
    title: "S. 451: Digital Privacy & Oversight Act",
    description:
      "Introduced by Sen. Murray to establish federal standards for consumer data protection in the...",
    footer: null as string | null,
    showPartyDots: false,
  },
];

function MiniApprovalBars({ color, variant }: { color: string; variant: "blue" | "red" }) {
  const heights =
    variant === "blue" ? [14, 22, 18, 28, 24] : [26, 22, 16, 14, 12];
  return (
    <View style={styles.miniBarsWrap}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.miniBar, { height: h, backgroundColor: color }]} />
      ))}
    </View>
  );
}

function matchesFilter(profile: PoliticianProfile, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "house") return profile.role.toLowerCase().includes("house");
  if (filter === "senate") return profile.role.toLowerCase().includes("senator");
  if (filter === "democrat") return profile.party === "Democratic";
  if (filter === "republican") return profile.party === "Republican";
  return true;
}

export default function PoliticianScreen() {
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput>(null);
  const [filter, setFilter] = useState<FilterId>("all");

  const {
    input,
    setInput,
    isInputFocused,
    setIsInputFocused,
    onBlurSearchField,
    submittedQuery,
    hasSearched,
    isLoading,
    selectedProfile,
    recentSearches,
    runSearch,
    submitSearch,
    suggestions,
    handleSelectSuggestion,
    statusCopy,
  } = usePoliticianSearch();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  const canvasTint = colorScheme === "dark" ? semantic.screenBackground : "#F4F2FA";

  const palette = useMemo(
    () => ({
      cardBackground: semantic.cardBackground,
      cardBorder: semantic.cardBorder,
      sectionBackground: semantic.cardSubtleBackground,
      badgeBackground:
        colorScheme === "dark" ? Brand.slate : semantic.cardSubtleBackground,
    }),
    [colorScheme, semantic],
  );

  const filteredTrending = useMemo(
    () => MOCK_POLITICIANS.filter((p) => matchesFilter(p, filter)),
    [filter],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: canvasTint }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.sm,
              paddingBottom: insets.bottom + 112,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={[styles.headerIconWrap, { backgroundColor: Brand.primarySoft }]}>
              <Ionicons name="business" size={20} color={Brand.primary} />
            </View>
            <ThemedText style={[styles.brandTitle, { color: Brand.primary }]}>
              HYPATIA
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Focus search"
              hitSlop={12}
              onPress={() => searchRef.current?.focus()}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginLeft: "auto" }]}
            >
              <Ionicons name="search-outline" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchShell,
              {
                backgroundColor: palette.cardBackground,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={semantic.mutedText} />
            <TextInput
              ref={searchRef}
              value={input}
              onChangeText={setInput}
              onFocus={() => setIsInputFocused(true)}
              onBlur={onBlurSearchField}
              placeholder="Search by name, district, or committee"
              placeholderTextColor={semantic.mutedText}
              style={[styles.searchInput, { color: textColor }]}
              returnKeyType="search"
              blurOnSubmit
              onSubmitEditing={submitSearch}
            />
            {input.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => setInput("")}
              >
                <FontAwesome name="times-circle" size={16} color={iconColor} />
              </Pressable>
            ) : null}
          </View>

          {isInputFocused && suggestions.length > 0 ? (
            <View
              style={[
                styles.suggestionsList,
                {
                  borderColor: palette.cardBorder,
                  backgroundColor: palette.sectionBackground,
                },
              ]}
            >
              {suggestions.map((profile) => (
                <Pressable
                  key={profile.name}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    {
                      backgroundColor: pressed ? palette.badgeBackground : "transparent",
                    },
                  ]}
                  onPress={() => handleSelectSuggestion(profile.name)}
                >
                  <ThemedText type="defaultSemiBold">{profile.name}</ThemedText>
                  <ThemedText style={[styles.suggestionMeta, { color: theme.icon }]}>
                    {profile.role}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {FILTER_OPTIONS.map((opt) => {
              const selected = filter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(opt.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: selected ? Brand.primary : palette.sectionBackground,
                      borderColor: selected ? Brand.primary : palette.cardBorder,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      { color: selected ? Brand.white : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.id === "republican" ? "R…" : opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {recentSearches.length > 0 ? (
            <View style={styles.recentWrap}>
              <ThemedText style={[styles.recentLabel, { color: theme.icon }]}>Recent</ThemedText>
              <View style={styles.recentChips}>
                {recentSearches.map((term) => (
                  <Pressable
                    key={term}
                    style={({ pressed }) => [
                      styles.recentChip,
                      {
                        borderColor: palette.cardBorder,
                        backgroundColor: palette.sectionBackground,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => {
                      setInput(term);
                      runSearch(term);
                    }}
                  >
                    <ThemedText style={styles.recentChipText}>{term}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {statusCopy ? (
            <ThemedText style={[styles.helperText, { color: theme.icon }]}>{statusCopy}</ThemedText>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: theme.text }]}>
              Trending Now
            </ThemedText>
            <Pressable hitSlop={8}>
              <ThemedText style={[styles.viewAllLink, { color: Brand.primary }]}>View all</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingCarousel}
          >
            {filteredTrending.map((profile) => {
              const meta = TRENDING_CARD_META[profile.name] ?? {
                subtitle: `${profile.location} • ${profile.party.slice(0, 1)}`,
                sentiment: "Sentiment: trending",
                bars: profile.party === "Republican" ? ("red" as const) : ("blue" as const),
              };
              const barColor = meta.bars === "red" ? Brand.danger : Brand.primary;
              const partyDot =
                profile.party === "Republican"
                  ? Brand.danger
                  : profile.party === "Democratic"
                    ? Brand.primary
                    : semantic.mutedText;
              const subtitleParts = meta.subtitle.split("•").map((s) => s.trim());
              const districtLine = subtitleParts[0] ?? "";
              const partyLetter = subtitleParts[1] ?? "";
              return (
                <Pressable
                  key={profile.name}
                  onPress={() => {
                    setInput(profile.name);
                    runSearch(profile.name);
                  }}
                  style={({ pressed }) => [
                    styles.trendingCard,
                    {
                      backgroundColor: palette.cardBackground,
                      borderColor: palette.cardBorder,
                      opacity: pressed ? 0.92 : 1,
                    },
                    semantic.cardShadow,
                  ]}
                >
                  <View style={styles.trendingCardHeader}>
                    <Image
                      source={{ uri: profile.photoUrl }}
                      style={styles.trendingAvatar}
                      contentFit="cover"
                    />
                    <View style={styles.trendingHeaderText}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ color: theme.text }}>
                        {profile.name}
                      </ThemedText>
                      <View style={styles.districtRow}>
                        <ThemedText
                          style={[styles.districtText, { color: semantic.mutedText }]}
                          numberOfLines={1}
                        >
                          {districtLine}
                        </ThemedText>
                        {partyLetter ? (
                          <>
                            <ThemedText style={[styles.districtText, { color: semantic.mutedText }]}>
                              {" • "}
                            </ThemedText>
                            <View style={[styles.partyDot, { backgroundColor: partyDot }]} />
                            <ThemedText
                              style={[styles.districtText, { color: semantic.mutedText }]}
                            >
                              {partyLetter}
                            </ThemedText>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={[styles.trendingChartBg, { backgroundColor: palette.sectionBackground }]}>
                    <MiniApprovalBars color={barColor} variant={meta.bars} />
                  </View>
                  <ThemedText style={[styles.sentimentLine, { color: Brand.primary }]} numberOfLines={2}>
                    {meta.sentiment}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: theme.text }]}>
            Recent Legislative Actions
          </ThemedText>
          <View
            style={[
              styles.legislativeCard,
              { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
              semantic.cardShadow,
            ]}
          >
            {LEGISLATIVE_ACTIONS.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.legislativeItem,
                  index > 0 ? { borderTopColor: semantic.hairline, borderTopWidth: StyleSheet.hairlineWidth } : null,
                ]}
              >
                <View style={styles.legislativeItemTop}>
                  <View
                    style={[
                      styles.legTag,
                      item.variant === "blue"
                        ? { backgroundColor: Brand.primarySoft }
                        : { backgroundColor: "#E65100" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.legTagText,
                        item.variant === "blue" ? { color: Brand.primary } : { color: Brand.white },
                      ]}
                    >
                      {item.tag}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.legTime, { color: semantic.mutedText }]}>{item.time}</ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={[styles.legTitle, { color: theme.text }]}>
                  {item.title}
                </ThemedText>
                {item.description ? (
                  <ThemedText style={[styles.legDesc, { color: semantic.mutedText }]}>
                    {item.description}
                  </ThemedText>
                ) : null}
                {item.footer ? (
                  <View style={styles.legFooterRow}>
                    {item.showPartyDots ? (
                      <View style={styles.partyDots}>
                        <View style={[styles.smallPartyDot, { backgroundColor: Brand.primary }]} />
                        <View style={[styles.smallPartyDot, { backgroundColor: Brand.danger, marginLeft: -6 }]} />
                      </View>
                    ) : null}
                    <ThemedText style={[styles.legFooterText, { color: semantic.mutedText }]}>
                      {item.footer}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ))}
            <Pressable style={styles.calendarLinkWrap}>
              <ThemedText style={[styles.calendarLink, { color: Brand.primary }]}>View full calendar</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: theme.text }]}>
            Financial Analytics
          </ThemedText>
          <View
            style={[
              styles.financialCard,
              { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
              semantic.cardShadow,
            ]}
          >
            <ThemedText style={[styles.finSubheading, { color: semantic.mutedText }]}>
              TOP DONOR SOURCES (Q3)
            </ThemedText>
            <View style={styles.finRow}>
              <ThemedText style={{ color: theme.text }}>Individual Contributions</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
                $2.4M
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.sectionBackground }]}>
              <View style={[styles.progressFill, { width: "78%", backgroundColor: Brand.primary }]} />
            </View>
            <View style={styles.finRow}>
              <ThemedText style={{ color: theme.text }}>Corporate PACs</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
                $1.1M
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.sectionBackground }]}>
              <View style={[styles.progressFill, { width: "42%", backgroundColor: "#0D9488" }]} />
            </View>

            <ThemedText style={[styles.finSubheading, { color: semantic.mutedText, marginTop: Spacing.md }]}>
              TRADING ACTIVITY ALERT
            </ThemedText>
            <View style={[styles.alertBox, { backgroundColor: palette.sectionBackground }]}>
              <Ionicons name="warning" size={22} color="#E65100" />
              <View style={styles.alertTextCol}>
                <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
                  Significant Tech Divestment
                </ThemedText>
                <ThemedText style={[styles.alertDesc, { color: semantic.mutedText }]}>
                  3 House members of the Finance Committee sold shares in major semiconductor firms last week.
                </ThemedText>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.unlockButton,
                { backgroundColor: Brand.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <ThemedText style={styles.unlockButtonText}>Unlock Full Portfolio Access</ThemedText>
            </Pressable>
          </View>

          {isLoading ? (
            <View
              style={[
                ps.resultCard,
                ps.loadingWrap,
                {
                  backgroundColor: palette.cardBackground,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.tint} />
              <ThemedText style={{ color: theme.icon }}>Fetching profile…</ThemedText>
            </View>
          ) : null}

          {hasSearched && !isLoading && !selectedProfile ? (
            <View>
              <StateNoticeCard
                title="No match found"
                message={`No profile found for "${submittedQuery}". Try one of these.`}
                borderColor={palette.cardBorder}
                backgroundColor={palette.cardBackground}
                messageColor={theme.icon}
              />
              <View style={ps.quickTryWrap}>
                {MOCK_POLITICIANS.map((profile) => (
                  <Pressable
                    key={`quick-${profile.name}`}
                    style={({ pressed }) => [
                      ps.quickTryChip,
                      {
                        borderColor: palette.cardBorder,
                        backgroundColor: palette.sectionBackground,
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                    onPress={() => {
                      setInput(profile.name);
                      runSearch(profile.name);
                    }}
                  >
                    <ThemedText style={ps.quickTryText}>{profile.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {selectedProfile && !isLoading ? (
            <View style={ps.profileWrap}>
              <View
                style={[
                  ps.resultCard,
                  ps.profileCard,
                  {
                    backgroundColor: palette.cardBackground,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <View style={ps.profileHeader}>
                  <Image
                    source={{ uri: selectedProfile.photoUrl }}
                    style={ps.profileImage}
                    contentFit="cover"
                  />
                  <View style={ps.profileHeaderText}>
                    <ThemedText type="subtitle">{selectedProfile.name}</ThemedText>
                    <ThemedText style={[ps.roleLine, { color: theme.icon }]}>
                      {selectedProfile.role} - {selectedProfile.party}
                    </ThemedText>
                    <ThemedText style={[ps.locationLine, { color: theme.icon }]}>
                      {selectedProfile.location}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={ps.bioText}>{selectedProfile.bio}</ThemedText>
              </View>

              <View style={ps.metricsRow}>
                <View
                  style={[
                    ps.resultCard,
                    ps.metricChip,
                    {
                      backgroundColor: palette.badgeBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>Approval</ThemedText>
                  <ThemedText type="defaultSemiBold">{selectedProfile.approval}%</ThemedText>
                </View>
                <View
                  style={[
                    ps.resultCard,
                    ps.metricChip,
                    {
                      backgroundColor: palette.badgeBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>In Office</ThemedText>
                  <ThemedText type="defaultSemiBold">{selectedProfile.yearsInOffice} yrs</ThemedText>
                </View>
                <View
                  style={[
                    ps.resultCard,
                    ps.metricChip,
                    {
                      backgroundColor: palette.badgeBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>Election</ThemedText>
                  <ThemedText type="defaultSemiBold">{selectedProfile.nextElection}</ThemedText>
                </View>
              </View>

              <View
                style={[
                  ps.resultCard,
                  ps.sectionCard,
                  {
                    backgroundColor: palette.cardBackground,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">Key Positions</ThemedText>
                {selectedProfile.keyPositions.map((position) => (
                  <View key={position} style={ps.bulletRow}>
                    <View style={[ps.bulletDot, { backgroundColor: theme.tint }]} />
                    <ThemedText style={ps.bulletText}>{position}</ThemedText>
                  </View>
                ))}
              </View>

              <View
                style={[
                  ps.resultCard,
                  ps.sectionCard,
                  {
                    backgroundColor: palette.cardBackground,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">Recent Headlines</ThemedText>
                {selectedProfile.recentNews.map((item) => (
                  <View key={`${item.headline}-${item.date}`} style={ps.newsRow}>
                    <ThemedText style={ps.newsHeadline}>{item.headline}</ThemedText>
                    <ThemedText style={[ps.newsMeta, { color: theme.icon }]}>
                      {item.source} - {item.date}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View
                style={[
                  ps.resultCard,
                  ps.sectionCard,
                  {
                    backgroundColor: palette.cardBackground,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={ps.chartTitle}>
                  Approval Trend
                </ThemedText>
                <PoliticianLineChart />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.8,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.body,
    paddingVertical: 10,
  },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: "hidden",
    marginTop: -4,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.border,
  },
  suggestionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  recentWrap: { gap: 6 },
  recentLabel: { fontSize: 12, fontWeight: "600" },
  recentChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  recentChipText: { fontSize: 12 },
  helperText: { fontSize: 12, marginTop: -4 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16 },
  viewAllLink: { fontSize: 13, fontFamily: Fonts.bodySemiBold },
  trendingCarousel: {
    gap: 12,
    paddingVertical: 4,
  },
  trendingCard: {
    width: 260,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  trendingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  trendingHeaderText: { flex: 1 },
  districtRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 2,
  },
  districtText: { fontSize: 12 },
  partyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  trendingChartBg: {
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  miniBarsWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 32,
  },
  miniBar: {
    width: 14,
    borderRadius: 3,
    minHeight: 4,
  },
  sentimentLine: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 16,
  },
  legislativeCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  legislativeItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  legislativeItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  legTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  legTime: { fontSize: 12 },
  legTitle: { fontSize: 15, lineHeight: 20 },
  legDesc: { fontSize: 13, lineHeight: 18 },
  legFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  partyDots: { flexDirection: "row", alignItems: "center" },
  smallPartyDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Brand.white,
  },
  legFooterText: { fontSize: 12, flex: 1 },
  calendarLinkWrap: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
  },
  calendarLink: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  financialCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 8,
  },
  finSubheading: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  alertBox: {
    flexDirection: "row",
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "flex-start",
  },
  alertTextCol: { flex: 1, gap: 4 },
  alertDesc: { fontSize: 13, lineHeight: 18 },
  unlockButton: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  unlockButtonText: {
    color: Brand.white,
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
  },
});
