import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import PoliticianLineChart from "@/components/charts/PoliticianLineChart";
import { PoliticianShowcaseCarousel } from "@/components/politician/PoliticianShowcaseCarousel";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Brand, Colors } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { usePoliticianSearch } from "@/hooks/usePoliticianSearch";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { MOCK_POLITICIANS } from "@/lib/politician/mockProfileSearch";
import { POLITICIAN_QUICK_TILES } from "@/lib/politician/quickTiles";
import { politicianScreenStyles as styles } from "@/lib/politician/screenStyles";

/**
 * Politician tab — mock profiles + search. Data and ticker live under `@/lib/politician`
 * and `@/components/politician`; search state in `usePoliticianSearch`.
 */
export default function PoliticianScreen() {
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
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  const palette = useMemo(() => {
    const semantic = getSemanticColors(colorScheme);
    return {
      cardBackground: semantic.cardBackground,
      cardBorder: semantic.cardBorder,
      sectionBackground: semantic.cardSubtleBackground,
      badgeBackground:
        colorScheme === "dark" ? Brand.slate : semantic.cardSubtleBackground,
    };
  }, [colorScheme]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="title" style={styles.title}>
              Politician Profiles
            </ThemedText>

            <View
              style={[
                styles.searchCard,
                { backgroundColor: palette.cardBackground },
              ]}
            >
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: palette.sectionBackground },
                ]}
              >
                <FontAwesome name="search" size={16} color={iconColor} />
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={onBlurSearchField}
                  placeholder="Search politicians"
                  placeholderTextColor={Brand.steel}
                  style={[styles.searchInput, { color: textColor }]}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={submitSearch}
                  accessibilityHint="Press Return on the keyboard to run the search, or choose a suggestion below"
                />
                {input.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search input"
                    hitSlop={8}
                    style={styles.clearButton}
                    onPress={() => setInput("")}
                  >
                    <FontAwesome
                      name="times-circle"
                      size={16}
                      color={iconColor}
                    />
                  </Pressable>
                )}
              </View>

              {isInputFocused && suggestions.length > 0 && (
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
                          backgroundColor: pressed
                            ? palette.badgeBackground
                            : "transparent",
                        },
                      ]}
                      onPress={() => handleSelectSuggestion(profile.name)}
                    >
                      <ThemedText type="defaultSemiBold">
                        {profile.name}
                      </ThemedText>
                      <ThemedText
                        style={[styles.suggestionMeta, { color: theme.icon }]}
                      >
                        {profile.role}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              {recentSearches.length > 0 && (
                <View style={styles.recentWrap}>
                  <ThemedText
                    style={[styles.recentLabel, { color: theme.icon }]}
                  >
                    Recent
                  </ThemedText>
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
                        <ThemedText style={styles.recentChipText}>
                          {term}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <ThemedText style={[styles.helperText, { color: theme.icon }]}>
              {statusCopy}
            </ThemedText>

            <PoliticianShowcaseCarousel
              profiles={MOCK_POLITICIANS}
              borderColor={palette.cardBorder}
              tileBackground={palette.cardBackground}
            />

            {!hasSearched && (
              <StateNoticeCard
                title="Start with a politician name"
                message="Type a name and press Return, or choose below — Alex Harper, Monica Reyes, or Daniel Brooks."
                borderColor={palette.cardBorder}
                backgroundColor={palette.cardBackground}
                messageColor={theme.icon}
              />
            )}

            {isLoading && (
              <View
                style={[
                  styles.resultCard,
                  styles.loadingWrap,
                  {
                    backgroundColor: palette.cardBackground,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={theme.tint} />
                <ThemedText style={{ color: theme.icon }}>
                  Fetching mock profile data...
                </ThemedText>
              </View>
            )}

            {hasSearched && !isLoading && !selectedProfile && (
              <View>
                <StateNoticeCard
                  title="No match found"
                  message={`No profile found for "${submittedQuery}". Check spelling or try one of these.`}
                  borderColor={palette.cardBorder}
                  backgroundColor={palette.cardBackground}
                  messageColor={theme.icon}
                />
                <View style={styles.quickTryWrap}>
                  {MOCK_POLITICIANS.map((profile) => (
                    <Pressable
                      key={`quick-${profile.name}`}
                      style={({ pressed }) => [
                        styles.quickTryChip,
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
                      <ThemedText style={styles.quickTryText}>
                        {profile.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {selectedProfile && !isLoading && (
              <View style={styles.profileWrap}>
                <View
                  style={[
                    styles.resultCard,
                    styles.profileCard,
                    {
                      backgroundColor: palette.cardBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.profileHeader}>
                    <Image
                      source={{ uri: selectedProfile.photoUrl }}
                      style={styles.profileImage}
                      contentFit="cover"
                    />
                    <View style={styles.profileHeaderText}>
                      <ThemedText type="subtitle">
                        {selectedProfile.name}
                      </ThemedText>
                      <ThemedText
                        style={[styles.roleLine, { color: theme.icon }]}
                      >
                        {selectedProfile.role} - {selectedProfile.party}
                      </ThemedText>
                      <ThemedText
                        style={[styles.locationLine, { color: theme.icon }]}
                      >
                        {selectedProfile.location}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.bioText}>
                    {selectedProfile.bio}
                  </ThemedText>
                </View>

                <View style={styles.metricsRow}>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      {
                        backgroundColor: palette.badgeBackground,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.metricLabel, { color: theme.icon }]}
                    >
                      Approval
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {selectedProfile.approval}%
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      {
                        backgroundColor: palette.badgeBackground,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.metricLabel, { color: theme.icon }]}
                    >
                      In Office
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {selectedProfile.yearsInOffice} yrs
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      {
                        backgroundColor: palette.badgeBackground,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.metricLabel, { color: theme.icon }]}
                    >
                      Election
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {selectedProfile.nextElection}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    {
                      backgroundColor: palette.cardBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">Key Positions</ThemedText>
                  {selectedProfile.keyPositions.map((position) => (
                    <View key={position} style={styles.bulletRow}>
                      <View
                        style={[
                          styles.bulletDot,
                          { backgroundColor: theme.tint },
                        ]}
                      />
                      <ThemedText style={styles.bulletText}>
                        {position}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    {
                      backgroundColor: palette.cardBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">
                    Recent Headlines
                  </ThemedText>
                  {selectedProfile.recentNews.map((item) => (
                    <View
                      key={`${item.headline}-${item.date}`}
                      style={styles.newsRow}
                    >
                      <ThemedText style={styles.newsHeadline}>
                        {item.headline}
                      </ThemedText>
                      <ThemedText
                        style={[styles.newsMeta, { color: theme.icon }]}
                      >
                        {item.source} - {item.date}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    {
                      backgroundColor: palette.cardBackground,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
                    Approval Trend
                  </ThemedText>
                  <PoliticianLineChart />
                </View>
              </View>
            )}

            <View
              style={[
                styles.tileSection,
                { borderTopColor: palette.cardBorder },
              ]}
            >
              <ThemedText
                type="defaultSemiBold"
                style={styles.tileSectionTitle}
              >
                Quick links
              </ThemedText>
              <View style={styles.tileGrid}>
                {[0, 2].map((rowStart) => (
                  <View key={rowStart} style={styles.tileRow}>
                    {POLITICIAN_QUICK_TILES.slice(rowStart, rowStart + 2).map(
                      (tile) => (
                        <Pressable
                          key={tile.title}
                          accessibilityRole="button"
                          accessibilityLabel={`${tile.title}: ${tile.subtitle}`}
                          style={({ pressed }) => [
                            styles.tileCell,
                            {
                              backgroundColor: palette.cardBackground,
                              borderColor: palette.cardBorder,
                              opacity: pressed ? 0.88 : 1,
                            },
                          ]}
                        >
                          <FontAwesome
                            name={tile.icon}
                            size={20}
                            color={theme.tint}
                          />
                          <ThemedText
                            type="defaultSemiBold"
                            style={styles.tileTitle}
                          >
                            {tile.title}
                          </ThemedText>
                          <ThemedText
                            style={[styles.tileSubtitle, { color: theme.icon }]}
                            numberOfLines={2}
                          >
                            {tile.subtitle}
                          </ThemedText>
                        </Pressable>
                      ),
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
