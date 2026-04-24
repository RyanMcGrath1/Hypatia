import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import EconomicPulseChart from '@/components/EconomicPulseChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { AppRoutes } from '@/constants/routes';
import { Radius, Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import { ECONOMY_KPIS, US_ECONOMIC_SECTORS, type EconomicSector, type SectorTrend } from '@/constants/usEconomicData';
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
  const semantic = getSemanticColors(colorScheme);
  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding;
    return (available - gap) / 2;
  }, [width]);

  const openSectorDetails = (sectorId: string) => {
    router.push({
      pathname: AppRoutes.economyDetail,
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
            backgroundColor: semantic.cardBackground,
            borderColor: semantic.cardBorder,
          },
        ]}>
        <Pressable style={styles.cardTop} onPress={() => openSectorDetails(sector.id)}>
          <ThemedText type="defaultSemiBold">{sector.title}</ThemedText>
          <ThemedText style={[styles.updatedText, { color: semantic.mutedText }]}>
            Updated {sector.updatedAt}
          </ThemedText>
          <ThemedText style={[styles.headlineValue, { color: theme.text }]}>
            {sector.headlineValue}
          </ThemedText>
          <ThemedText style={[styles.headlineLabel, { color: semantic.mutedText }]}>
            {sector.headlineLabel}
          </ThemedText>
          <ThemedText style={[styles.trendText, { color: trendTone.color }]}>
            {trendTone.marker} {sector.trendLabel}
          </ThemedText>
          <ThemedText numberOfLines={2} style={[styles.summaryText, { color: semantic.mutedText }]}>
            {sector.summary}
          </ThemedText>
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
        <ScreenHeader
          title="US Economic Dashboard"
          subtitle="High-level read across major sectors. Tap a tile to open a dedicated deep-dive view."
          subtitleColor={semantic.mutedText}
        />
        <EconomicPulseChart />
        <View style={styles.kpiRow}>
          {ECONOMY_KPIS.map((kpi) => (
            <SectionCard
              key={kpi.id}
              backgroundColor={semantic.cardSubtleBackground}
              borderColor={semantic.cardBorder}
              style={styles.kpiCard}>
              <ThemedText style={[styles.kpiLabel, { color: semantic.mutedText }]}>{kpi.label}</ThemedText>
              <ThemedText type="defaultSemiBold">{kpi.value}</ThemedText>
              <ThemedText style={[styles.kpiContext, { color: semantic.mutedText }]}>{kpi.context}</ThemedText>
            </SectionCard>
          ))}
        </View>

        {/* Loading + error states */}
        {isLoading && (
          <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.cardBorder} style={styles.stateCard}>
            <ThemedText>Loading economic indicators...</ThemedText>
          </SectionCard>
        )}

        {error !== null && (
          <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.danger} style={styles.stateCard}>
            <ThemedText style={{ color: semantic.danger }}>{error}</ThemedText>
          </SectionCard>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 12,
  },
  kpiContext: {
    fontSize: 12,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardTop: {
    padding: Spacing.md,
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
    lineHeight: 17,
  },
  openDetailsHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  stateCard: {
    marginTop: 8,
  },
});
