import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import EconomicPulseChart from '@/components/EconomicPulseChart';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { US_ECONOMIC_SECTORS, type EconomicSector, type SectorTrend } from '@/constants/usEconomicData';
import { useColorScheme } from '@/hooks/useColorScheme';

function getTrendTone(trend: SectorTrend, isDark: boolean) {
  if (trend === 'up') {
    return { color: isDark ? '#86efac' : '#166534', marker: '↑' };
  }
  if (trend === 'down') {
    return { color: isDark ? '#fca5a5' : '#991b1b', marker: '↓' };
  }
  return { color: isDark ? '#93c5fd' : '#1d4ed8', marker: '→' };
}

export default function EconomyDashboardScreen() {
  // Router + view state
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding;
    return (available - gap) / 2;
  }, [width]);

  const cardBackground = isDark ? '#111827' : '#ffffff';
  const cardBorder = isDark ? '#374151' : '#e5e7eb';

  const openSectorDetails = (sectorId: string) => {
    router.push({
      pathname: '/economy/[sectorId]',
      params: { sectorId },
    });
  };

  // Per-sector tile renderer (tap card to route)
  const renderSectorCard = (sector: EconomicSector) => {
    const trendTone = getTrendTone(sector.trend, isDark);

    return (
      <View
        key={sector.id}
        style={[
          styles.card,
          {
            width: cardWidth,
            backgroundColor: cardBackground,
            borderColor: cardBorder,
          },
        ]}>
        <Pressable style={styles.cardTop} onPress={() => openSectorDetails(sector.id)}>
          <ThemedText type="defaultSemiBold">{sector.title}</ThemedText>
          <ThemedText style={[styles.updatedText, { color: theme.icon }]}>
            Updated {sector.updatedAt}
          </ThemedText>
          <ThemedText style={[styles.headlineValue, { color: theme.text }]}>
            {sector.headlineValue}
          </ThemedText>
          <ThemedText style={[styles.headlineLabel, { color: theme.icon }]}>
            {sector.headlineLabel}
          </ThemedText>
          <ThemedText style={[styles.trendText, { color: trendTone.color }]}>
            {trendTone.marker} {sector.trendLabel}
          </ThemedText>
          <ThemedText style={[styles.summaryText, { color: theme.icon }]}>{sector.summary}</ThemedText>
          <ThemedText style={[styles.openDetailsHint, { color: theme.tint }]}>
            Tap to open full details
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page header + visual anchor */}
        <ThemedText type="title" style={styles.title}>
          US Economic Dashboard
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.icon }]}>
          High-level read across major sectors. Tap a tile to open a dedicated deep-dive view.
        </ThemedText>
        <EconomicPulseChart />

        {/* Loading + error states */}
        {isLoading && (
          <View style={[styles.stateCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
            <ThemedText>Loading economic indicators...</ThemedText>
          </View>
        )}

        {error !== null && (
          <View style={[styles.stateCard, { backgroundColor: cardBackground, borderColor: '#dc2626' }]}>
            <ThemedText style={{ color: '#dc2626' }}>{error}</ThemedText>
          </View>
        )}

        {/* Sector overview grid */}
        {!isLoading && error === null && (
          <View style={styles.gridWrap}>{US_ECONOMIC_SECTORS.map((sector) => renderSectorCard(sector))}</View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 21,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardTop: {
    padding: 12,
    gap: 4,
  },
  updatedText: {
    fontSize: 12,
  },
  headlineValue: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  headlineLabel: {
    fontSize: 13,
  },
  trendText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  openDetailsHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
});
