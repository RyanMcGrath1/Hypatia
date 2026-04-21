import FontAwesome from '@expo/vector-icons/FontAwesome';
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

import PoliticianLineChart from '@/components/PoliticianLineChart';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

type NewsItem = {
  headline: string;
  source: string;
  date: string;
};

type PoliticianProfile = {
  name: string;
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

  const exact = MOCK_POLITICIANS.find(
    (profile) => profile.name.toLowerCase() === normalizedQuery,
  );
  if (exact) {
    return exact;
  }

  return (
    MOCK_POLITICIANS.find((profile) =>
      profile.name.toLowerCase().includes(normalizedQuery),
    ) ?? null
  );
}

export default function PoliticianScreen() {
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PoliticianProfile | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const palette = useMemo(
    () => ({
      cardBackground: colorScheme === 'dark' ? '#111827' : '#ffffff',
      cardBorder: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      sectionBackground: colorScheme === 'dark' ? '#0f172a' : '#f8fafc',
      buttonBackground: colorScheme === 'dark' ? '#2563eb' : '#1d4ed8',
      badgeBackground: colorScheme === 'dark' ? '#1f2937' : '#f1f5f9',
    }),
    [colorScheme],
  );

  const submitSearch = useCallback(() => {
    Keyboard.dismiss();
    const query = input.trim();
    if (!query) {
      return;
    }

    setSubmittedQuery(query);
    setHasSearched(true);
    setIsLoading(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedProfile(findPoliticianProfile(query));
      setIsLoading(false);
    }, 550);
  }, [input]);

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
                  placeholder="Type a politician name"
                  placeholderTextColor="#9ca3af"
                  style={[styles.searchInput, { color: textColor }]}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={submitSearch}
                />
              </View>

              <Pressable
                style={[styles.searchButton, { backgroundColor: palette.buttonBackground }]}
                onPress={submitSearch}>
                <ThemedText style={styles.searchButtonText}>Search</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={[styles.helperText, { color: theme.icon }]}>{statusCopy}</ThemedText>

            {!hasSearched && (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: palette.sectionBackground, borderColor: palette.cardBorder },
                ]}>
                <ThemedText type="defaultSemiBold">Start with a politician name</ThemedText>
                <ThemedText style={[styles.emptyStateBody, { color: theme.icon }]}>
                  Try: Alex Harper, Monica Reyes, or Daniel Brooks.
                </ThemedText>
              </View>
            )}

            {isLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={theme.tint} />
                <ThemedText style={{ color: theme.icon }}>Fetching mock profile data...</ThemedText>
              </View>
            )}

            {hasSearched && !isLoading && !selectedProfile && (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: palette.sectionBackground, borderColor: palette.cardBorder },
                ]}>
                <ThemedText type="defaultSemiBold">No match found</ThemedText>
                <ThemedText style={[styles.emptyStateBody, { color: theme.icon }]}>
                  Check spelling or try a partial name from the sample data.
                </ThemedText>
              </View>
            )}

            {selectedProfile && !isLoading && (
              <View style={styles.profileWrap}>
                <View
                  style={[
                    styles.profileCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
                  ]}>
                  <ThemedText type="subtitle">{selectedProfile.name}</ThemedText>
                  <ThemedText style={[styles.roleLine, { color: theme.icon }]}>
                    {selectedProfile.role} - {selectedProfile.party}
                  </ThemedText>
                  <ThemedText style={[styles.locationLine, { color: theme.icon }]}>
                    {selectedProfile.location}
                  </ThemedText>
                  <ThemedText style={styles.bioText}>{selectedProfile.bio}</ThemedText>
                </View>

                <View style={styles.metricsRow}>
                  <View
                    style={[
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>Approval</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.approval}%</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>In Office</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.yearsInOffice} yrs</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.metricChip,
                      { backgroundColor: palette.badgeBackground, borderColor: palette.cardBorder },
                    ]}>
                    <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>Election</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedProfile.nextElection}</ThemedText>
                  </View>
                </View>

                <View
                  style={[
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

                <View
                  style={[
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

                <View
                  style={[
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
    paddingBottom: 28,
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
  searchButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    marginBottom: 14,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  emptyStateBody: {
    lineHeight: 19,
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 5,
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
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
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
    borderTopColor: '#9ca3af',
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
