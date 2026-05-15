import Ionicons from "@expo/vector-icons/Ionicons";
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

import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { PoliticianMiniApprovalBars } from "@/components/politician/tab/PoliticianMiniApprovalBars";
import { PoliticianSearchField } from "@/components/politician/tab/PoliticianSearchField";
import { PoliticianSearchSuggestionsPanel } from "@/components/politician/tab/PoliticianSearchSuggestionsPanel";
import { politicianTabScreenStyles as styles } from "@/components/politician/tab/politicianTabScreenStyles";
import { PoliticianProfileDetail } from "@/components/politician/PoliticianProfileDetail";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Brand, Colors } from "@/constants/theme/Colors";
import { TAB_SCREEN_CONTENT_INSETS } from "@/constants/navigation/tabScreenContentInsets";
import {
  Spacing,
  getSemanticColors,
  getTabScreenCanvasTint,
} from "@/constants/theme/ThemeTokens";
import { usePoliticianSearch } from "@/hooks/usePoliticianSearch";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { MOCK_POLITICIANS } from "@/lib/politician/mockProfileSearch";
import {
  POLITICIAN_TAB_FILTER_OPTIONS,
  type PoliticianTabFilterId,
  politicianProfileMatchesTabFilter,
} from "@/lib/politician/politicianTabFilters";
import { politicianScreenStyles as ps } from "@/lib/politician/screenStyles";

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

export default function PoliticianScreen() {
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput>(null);
  const [filter, setFilter] = useState<PoliticianTabFilterId>("all");

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
    suggestionsLoading,
    suggestionsError,
    handleSelectSuggestion,
    statusCopy,
  } = usePoliticianSearch();

  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  const canvasTint = getTabScreenCanvasTint(colorScheme);

  const palette = useMemo(
    () => ({
      cardBackground: semantic.cardBackground,
      cardBorder: semantic.cardBorder,
      sectionBackground: semantic.cardSubtleBackground,
      badgeBackground: semantic.cardSubtleBackground,
    }),
    [semantic],
  );

  const filteredTrending = useMemo(
    () => MOCK_POLITICIANS.filter((p) => politicianProfileMatchesTabFilter(p, filter)),
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
            TAB_SCREEN_CONTENT_INSETS,
            { paddingBottom: insets.bottom + 112 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <AppBrandBar icon="people" />

          <PoliticianSearchField
            searchRef={searchRef}
            value={input}
            onChangeText={setInput}
            onFocus={() => setIsInputFocused(true)}
            onBlur={onBlurSearchField}
            onSubmitEditing={submitSearch}
            placeholder="Search by name, district, or committee"
            placeholderTextColor={semantic.mutedText}
            textColor={textColor}
            iconColor={iconColor}
            searchShellStyle={[
              styles.searchShell,
              {
                backgroundColor: palette.cardBackground,
                borderColor: palette.cardBorder,
              },
            ]}
            onClear={() => setInput("")}
          />

          <PoliticianSearchSuggestionsPanel
            visible={isInputFocused && input.trim().length > 0}
            inputTrimmedLength={input.trim().length}
            palette={palette}
            semantic={semantic}
            interactive={interactive}
            theme={theme}
            suggestionsLoading={suggestionsLoading}
            suggestionsError={suggestionsError}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {POLITICIAN_TAB_FILTER_OPTIONS.map((opt) => {
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
                      backgroundColor: selected ? interactive.primaryFill : palette.sectionBackground,
                      borderColor: selected ? interactive.primaryFill : palette.cardBorder,
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
              <ThemedText style={[styles.viewAllLink, { color: interactive.primary }]}>View all</ThemedText>
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
              const barColor = meta.bars === "red" ? interactive.danger : interactive.primary;
              const partyDot =
                profile.party === "Republican"
                  ? interactive.danger
                  : profile.party === "Democratic"
                    ? interactive.primary
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
                    <PoliticianMiniApprovalBars color={barColor} variant={meta.bars} />
                  </View>
                  <ThemedText style={[styles.sentimentLine, { color: interactive.primary }]} numberOfLines={2}>
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
                        ? { backgroundColor: interactive.primarySoft }
                        : {
                            backgroundColor:
                              colorScheme === "dark"
                                ? interactive.tertiarySoft
                                : "#E65100",
                          },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.legTagText,
                        item.variant === "blue"
                          ? { color: interactive.primary }
                          : {
                              color:
                                colorScheme === "dark"
                                  ? interactive.tertiary
                                  : Brand.white,
                            },
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
                        <View style={[styles.smallPartyDot, { backgroundColor: interactive.primary }]} />
                        <View style={[styles.smallPartyDot, { backgroundColor: interactive.danger, marginLeft: -6 }]} />
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
              <ThemedText style={[styles.calendarLink, { color: interactive.primary }]}>View full calendar</ThemedText>
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
              <View style={[styles.progressFill, { width: "78%", backgroundColor: interactive.primary }]} />
            </View>
            <View style={styles.finRow}>
              <ThemedText style={{ color: theme.text }}>Corporate PACs</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
                $1.1M
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.sectionBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: "42%", backgroundColor: interactive.secondary },
                ]}
              />
            </View>

            <ThemedText style={[styles.finSubheading, { color: semantic.mutedText, marginTop: Spacing.md }]}>
              TRADING ACTIVITY ALERT
            </ThemedText>
            <View style={[styles.alertBox, { backgroundColor: palette.sectionBackground }]}>
              <Ionicons
                name="warning"
                size={22}
                color={colorScheme === "dark" ? interactive.tertiary : "#E65100"}
              />
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
                { backgroundColor: interactive.primaryFill, opacity: pressed ? 0.9 : 1 },
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
            <PoliticianProfileDetail profile={selectedProfile} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
