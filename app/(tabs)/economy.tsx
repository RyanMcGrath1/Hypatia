import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding;
    if (available > 600) {
      return (available - gap) / 2;
    }
    if (available > 420) {
      return (available - gap) / 2;
    }
    return available;
  }, [width]);

  const cardBackground = isDark ? '#111827' : '#ffffff';
  const cardBorder = isDark ? '#374151' : '#e5e7eb';
  const cardSubtleBackground = isDark ? '#0f172a' : '#f8fafc';

  const toggleExpanded = (sectorId: string) => {
    setExpandedSectorId((current) => (current === sectorId ? null : sectorId));
  };

  const openSectorDetails = (sectorId: string) => {
    router.push({
      pathname: '/(tabs)/economy/[sectorId]',
      params: { sectorId },
    });
  };

  const renderSectorCard = (sector: EconomicSector) => {
    const isExpanded = expandedSectorId === sector.id;
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
        <Pressable style={styles.cardTop} onPress={() => toggleExpanded(sector.id)}>
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
        </Pressable>

        {isExpanded && (
          <View style={[styles.expandedSection, { backgroundColor: cardSubtleBackground }]}>
            <ThemedText type="defaultSemiBold">Quick Read</ThemedText>
            <ThemedText style={styles.expandedCopy}>{sector.interpretation}</ThemedText>
            {sector.metrics.map((metric) => (
              <View key={`${sector.id}-${metric.label}`} style={styles.metricRow}>
                <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>{metric.label}</ThemedText>
                <ThemedText type="defaultSemiBold">{metric.value}</ThemedText>
                <ThemedText style={[styles.metricNote, { color: theme.icon }]}>{metric.note}</ThemedText>
              </View>
            ))}
            <Pressable style={styles.detailButton} onPress={() => openSectorDetails(sector.id)}>
              <ThemedText style={styles.detailButtonText}>Open full sector details</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          US Economic Dashboard
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.icon }]}>
          High-level read across major sectors. Tap a tile for a quick drilldown, then open full sector
          details for deeper context.
        </ThemedText>

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
  expandedSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#94a3b8',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  expandedCopy: {
    lineHeight: 20,
  },
  metricRow: {
    gap: 1,
    paddingTop: 6,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricNote: {
    fontSize: 12,
  },
  detailButton: {
    marginTop: 8,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  detailButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
});
