import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import PoliticianLineChart from '@/components/charts/PoliticianLineChart';
import { StateNoticeCard } from '@/components/surfaces/StateNoticeCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { ThemedView } from '@/components/theme/ThemedView';
import { Brand, Colors } from '@/constants/theme/Colors';
import { getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

type NewsItem = {
  headline: string;
  source: string;
  date: string;
};

type PoliticianProfile = {
  name: string;
  photoUrl: string;
  party: string;
  role: string;
  location: string;
  bio: string;
  approval: number;
  yearsInOffice: number;
  nextElection: string;
  keyPositions: string[];
  recentNews: NewsItem[];
};

const MOCK_POLITICIANS: PoliticianProfile[] = [
  {
    name: 'Alex Harper',
    photoUrl: 'https://ui-avatars.com/api/?name=Alex+Harper&background=333138&color=FFFFFA',
    party: 'Independent',
    role: 'U.S. Senator',
    location: 'Colorado',
    bio: 'Former teacher focused on education investment, wildfire preparedness, and housing affordability.',
    approval: 58,
    yearsInOffice: 9,
    nextElection: 'Nov 2028',
    keyPositions: [
      'Expand federal grants for teacher retention in rural districts.',
      'Fund drought and wildfire resilience infrastructure projects.',
      'Support bipartisan zoning incentives for more affordable housing.',
    ],
    recentNews: [
      {
        headline: 'Harper unveils bipartisan water security bill',
        source: 'National Desk',
        date: 'Apr 10, 2026',
      },
      {
        headline: 'Town hall highlights student loan repayment proposal',
        source: 'State Chronicle',
        date: 'Apr 04, 2026',
      },
    ],
  },
  {
    name: 'Monica Reyes',
    photoUrl: 'https://ui-avatars.com/api/?name=Monica+Reyes&background=515052&color=FFFFFA',
    party: 'Democratic',
    role: 'Governor',
    location: 'New Mexico',
    bio: 'Public health attorney emphasizing healthcare access, clean energy jobs, and small business growth.',
    approval: 62,
    yearsInOffice: 5,
    nextElection: 'Nov 2026',
    keyPositions: [
      'Increase coverage access through expanded community clinics.',
      'Create workforce pathways tied to clean manufacturing.',
      'Reduce licensing friction for first-time small business owners.',
    ],
    recentNews: [
      {
        headline: 'Reyes signs statewide behavioral health package',
        source: 'Civic Daily',
        date: 'Apr 15, 2026',
      },
      {
        headline: 'Administration announces clean-tech apprenticeship grants',
        source: 'Public Wire',
        date: 'Apr 01, 2026',
      },
    ],
  },
  {
    name: 'Daniel Brooks',
    photoUrl: 'https://ui-avatars.com/api/?name=Daniel+Brooks&background=FF312E&color=FFFFFA',
    party: 'Republican',
    role: 'House Representative',
    location: 'Florida 7th District',
    bio: 'Former Marine advocating for veterans services, port logistics modernization, and flood mitigation.',
    approval: 49,
    yearsInOffice: 3,
    nextElection: 'Nov 2026',
    keyPositions: [
      'Expand local veterans health navigation programs.',
      'Improve supply-chain throughput at regional ports.',
      'Prioritize resilient drainage projects in coastal communities.',
    ],
    recentNews: [
      {
        headline: 'Brooks secures committee hearing on veterans claims backlog',
        source: 'Capitol Report',
        date: 'Apr 11, 2026',
      },
      {
        headline: 'District tour focuses on stormwater infrastructure needs',
        source: 'Metro Journal',
        date: 'Mar 29, 2026',
      },
    ],
  },
];

function findPoliticianProfile(query: string): PoliticianProfile | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  const distance = (left: string, right: string) => {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const table = Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: cols }, (_, colIndex) => (rowIndex === 0 ? colIndex : colIndex === 0 ? rowIndex : 0)),
    );
    for (let row = 1; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        const cost = left[row - 1] === right[col - 1] ? 0 : 1;
        table[row][col] = Math.min(
          table[row - 1][col] + 1,
          table[row][col - 1] + 1,
          table[row - 1][col - 1] + cost,
        );
      }
    }
    return table[rows - 1][cols - 1];
  };

  const ranked = MOCK_POLITICIANS.map((profile) => {
    const name = profile.name.toLowerCase();
    const role = profile.role.toLowerCase();
    const location = profile.location.toLowerCase();
    const alias = `${role} ${location}`;
    let score = -1;

    if (name === normalizedQuery) {
      score = 100;
    } else if (name.startsWith(normalizedQuery)) {
      score = 80;
    } else if (name.includes(normalizedQuery)) {
      score = 60;
    } else if (alias.includes(normalizedQuery)) {
      score = 50;
    } else if (distance(name, normalizedQuery) <= 2) {
      score = 40;
    }

    return { profile, score };
  }).filter((entry) => entry.score >= 0);

  if (ranked.length === 0) {
    return null;
  }

  ranked.sort((left, right) => right.score - left.score);
  return ranked[0].profile;
}

export default function PoliticianScreen() {
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PoliticianProfile | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const palette = useMemo(() => {
    const semantic = getSemanticColors(colorScheme);
    return {
      cardBackground: semantic.cardBackground,
      cardBorder: semantic.cardBorder,
      sectionBackground: semantic.cardSubtleBackground,
      buttonBackground: semantic.accent,
      badgeBackground: colorScheme === 'dark' ? Brand.slate : semantic.cardSubtleBackground,
    };
  }, [colorScheme]);

  const runSearch = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      return;
    }
    setSubmittedQuery(query);
    setHasSearched(true);
    setIsLoading(true);
    setRecentSearches((current) => [query, ...current.filter((item) => item !== query)].slice(0, 5));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedProfile(findPoliticianProfile(query));
      setIsLoading(false);
    }, 420);
  }, []);

  const submitSearch = useCallback(() => {
    Keyboard.dismiss();
    setIsInputFocused(false);
    runSearch(input);
  }, [input, runSearch]);

  const suggestions = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return MOCK_POLITICIANS
      .filter((profile) =>
        `${profile.name} ${profile.role} ${profile.location}`.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [input]);

  const handleSelectSuggestion = useCallback((name: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    setInput(name);
    Keyboard.dismiss();
    setIsInputFocused(false);
    runSearch(name);
  }, [runSearch]);

  const statusCopy = useMemo(() => {
    if (!hasSearched) {
      return 'Search by full or partial name, for example: Monica Reyes';
    }
    if (isLoading) {
      return 'Building profile...';
    }
    if (!selectedProfile) {
      return `No profile found for "${submittedQuery}".`;
    }
    return `Showing profile for ${selectedProfile.name}`;
  }, [hasSearched, isLoading, selectedProfile, submittedQuery]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <ThemedText type="title" style={styles.title}>
              Politician Profiles
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.icon }]}>
              Search a name to view a compact overview of office details, priorities, and headlines.
            </ThemedText>

            {/* Search controls and type-ahead suggestions */}
            <View
              style={[
                styles.searchCard,
                { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
              ]}>
              <View
                style={[
                  styles.searchContainer,
                  { borderColor: palette.cardBorder, backgroundColor: palette.sectionBackground },
                ]}>
                <FontAwesome name="search" size={16} color={iconColor} />
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => {
                      setIsInputFocused(false);
                    }, 120);
                  }}
                  placeholder="Type a politician name"
                  placeholderTextColor={Brand.steel}
                  style={[styles.searchInput, { color: textColor }]}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={submitSearch}
                />
                {input.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search input"
                    hitSlop={8}
                    style={styles.clearButton}
                    onPress={() => setInput('')}>
                    <FontAwesome name="times-circle" size={16} color={iconColor} />
                  </Pressable>
                )}
              </View>

              {isInputFocused && suggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestionsList,
                    { borderColor: palette.cardBorder, backgroundColor: palette.sectionBackground },
                  ]}>
                  {suggestions.map((profile) => (
                    <Pressable
                      key={profile.name}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        { backgroundColor: pressed ? palette.badgeBackground : 'transparent' },
                      ]}
                      onPress={() => handleSelectSuggestion(profile.name)}>
                      <ThemedText type="defaultSemiBold">{profile.name}</ThemedText>
                      <ThemedText style={[styles.suggestionMeta, { color: theme.icon }]}>
                        {profile.role}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              {recentSearches.length > 0 && (
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
                        }}>
                        <ThemedText style={styles.recentChipText}>{term}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.searchButton, { backgroundColor: palette.buttonBackground }]}
                onPress={submitSearch}>
                <ThemedText style={styles.searchButtonText}>Search</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={[styles.helperText, { color: theme.icon }]}>{statusCopy}</ThemedText>

            {/* Empty and loading states */}
            {!hasSearched && (
              <StateNoticeCard
                title="Start with a politician name"
                message="Try: Alex Harper, Monica Reyes, or Daniel Brooks."
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
                  { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                ]}>
                <ActivityIndicator size="small" color={theme.tint} />
                <ThemedText style={{ color: theme.icon }}>Fetching mock profile data...</ThemedText>
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
                      }}>
                      <ThemedText style={styles.quickTryText}>{profile.name}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Main politician profile results */}
            {selectedProfile && !isLoading && (
              <View style={styles.profileWrap}>
                <View
                  style={[
                    styles.resultCard,
                    styles.profileCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                  ]}>
                  <View style={styles.profileHeader}>
                    <Image
                      source={{ uri: selectedProfile.photoUrl }}
                      style={styles.profileImage}
                      contentFit="cover"
                    />
                    <View style={styles.profileHeaderText}>
                      <ThemedText type="subtitle">{selectedProfile.name}</ThemedText>
                      <ThemedText style={[styles.roleLine, { color: theme.icon }]}>
                        {selectedProfile.role} - {selectedProfile.party}
                      </ThemedText>
                      <ThemedText style={[styles.locationLine, { color: theme.icon }]}>
                        {selectedProfile.location}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.bioText}>{selectedProfile.bio}</ThemedText>
                </View>

                {/* At-a-glance metrics */}
                <View style={styles.metricsRow}>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>Approval</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.approval}%</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>In Office</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.yearsInOffice} yrs</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.resultCard,
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>Election</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.nextElection}</ThemedText>
                  </View>
                </View>

                {/* Policy highlights */}
                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                  ]}>
                  <ThemedText type="defaultSemiBold">Key Positions</ThemedText>
                  {selectedProfile.keyPositions.map((position) => (
                    <View key={position} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.tint }]} />
                      <ThemedText style={styles.bulletText}>{position}</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Recent news headlines */}
                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                  ]}>
                  <ThemedText type="defaultSemiBold">Recent Headlines</ThemedText>
                  {selectedProfile.recentNews.map((item) => (
                    <View key={`${item.headline}-${item.date}`} style={styles.newsRow}>
                      <ThemedText style={styles.newsHeadline}>{item.headline}</ThemedText>
                      <ThemedText style={[styles.newsMeta, { color: theme.icon }]}>
                        {item.source} - {item.date}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Approval trend chart */}
                <View
                  style={[
                    styles.resultCard,
                    styles.sectionCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                  ]}>
                  <ThemedText type="defaultSemiBold" style={styles.chartTitle}>
                    Approval Trend
                  </ThemedText>
                  <PoliticianLineChart />
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  searchCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: Brand.paper,
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.steel,
  },
  suggestionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  helperText: {
    marginBottom: 10,
  },
  recentWrap: {
    gap: 6,
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: 12,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  quickTryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quickTryChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quickTryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingWrap: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  profileWrap: {
    gap: 12,
  },
  profileCard: {
    gap: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileHeaderText: {
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.slate,
  },
  roleLine: {
    fontSize: 14,
  },
  locationLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  bioText: {
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  sectionCard: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  newsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.steel,
    paddingTop: 10,
    gap: 3,
  },
  newsHeadline: {
    lineHeight: 20,
  },
  newsMeta: {
    fontSize: 12,
  },
  chartTitle: {
    marginBottom: 4,
  },
});
