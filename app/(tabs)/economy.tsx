import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import EconomicPulseChart from '@/components/EconomicPulseChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { StateNoticeCard } from '@/components/StateNoticeCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Brand, Colors } from '@/constants/Colors';
import { AppRoutes } from '@/constants/routes';
import { Radius, Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import {
  ECONOMY_DATA_SOURCE,
  ECONOMY_KPIS,
  ECONOMY_LAST_REFRESH,
  US_ECONOMIC_SECTORS,
  type EconomicSector,
  type SectorTrend,
} from '@/constants/usEconomicData';
import { useColorScheme } from '@/hooks/useColorScheme';

type TimeWindow = '1M' | '3M' | '6M' | '1Y';
type SectorSort = 'trend' | 'recency' | 'name';

const TIME_WINDOWS: TimeWindow[] = ['1M', '3M', '6M', '1Y'];
const SORT_OPTIONS: { id: SectorSort; label: string }[] = [
  { id: 'trend', label: 'Trend' },
  { id: 'recency', label: 'Recent' },
  { id: 'name', label: 'A-Z' },
];

function getTrendTone(trend: SectorTrend, isDark: boolean) {
  if (trend === 'up') {
    return {
      color: isDark ? 'rgba(255,255,250,0.9)' : Brand.ink,
      marker: '↑',
    };
  }
  if (trend === 'down') {
    return { color: Brand.coral, marker: '↓' };
  }
  return { color: Brand.steel, marker: '→' };
}

function getTrendRank(trend: SectorTrend) {
  if (trend === 'up') {
    return 0;
  }
  if (trend === 'flat') {
    return 1;
  }
  return 2;
}

function getRecencyRank(updatedAt: string) {
  const normalized = updatedAt.trim().toLowerCase();
  if (normalized.includes('apr')) {
    return 0;
  }
  if (normalized.includes('mar')) {
    return 1;
  }
  if (normalized.includes('q1')) {
    return 2;
  }
  return 3;
}

export default function EconomyDashboardScreen() {
  // Router + view state
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('6M');
  const [sortBy, setSortBy] = useState<SectorSort>('trend');

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

  const sortedSectors = useMemo(() => {
    const copy = [...US_ECONOMIC_SECTORS];
    if (sortBy === 'name') {
      return copy.sort((left, right) => left.title.localeCompare(right.title));
    }
    if (sortBy === 'recency') {
      return copy.sort((left, right) => getRecencyRank(left.updatedAt) - getRecencyRank(right.updatedAt));
    }
    return copy.sort((left, right) => getTrendRank(left.trend) - getTrendRank(right.trend));
  }, [sortBy]);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${sector.title} details`}
          hitSlop={8}
          style={({ pressed }) => [styles.cardTop, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => openSectorDetails(sector.id)}>
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
        <SectionCard backgroundColor={semantic.cardSubtleBackground} borderColor={semantic.cardBorder} style={styles.metaCard}>
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Window: {timeWindow} | Source: {ECONOMY_DATA_SOURCE}
          </ThemedText>
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Last refresh: {ECONOMY_LAST_REFRESH}
          </ThemedText>
        </SectionCard>
        <View style={styles.controlsWrap}>
          <View style={styles.controlsRow}>
            {TIME_WINDOWS.map((option) => {
              const isSelected = option === timeWindow;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Set time window ${option}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.controlChip,
                    {
                      borderColor: isSelected ? theme.tint : semantic.cardBorder,
                      backgroundColor: isSelected ? semantic.cardSubtleBackground : semantic.cardBackground,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                  onPress={() => setTimeWindow(option)}>
                  <ThemedText style={{ color: isSelected ? theme.tint : semantic.mutedText, fontSize: 12 }}>
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.controlsRow}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.id === sortBy;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort sectors by ${option.label}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.controlChip,
                    {
                      borderColor: isSelected ? theme.tint : semantic.cardBorder,
                      backgroundColor: isSelected ? semantic.cardSubtleBackground : semantic.cardBackground,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                  onPress={() => setSortBy(option.id)}>
                  <ThemedText style={{ color: isSelected ? theme.tint : semantic.mutedText, fontSize: 12 }}>
                    Sort: {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
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
          <StateNoticeCard
            title="Loading"
            message="Loading economic indicators..."
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.mutedText}
          />
        )}

        {error !== null && (
          <StateNoticeCard
            title="Something went wrong"
            message={error}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
          />
        )}

        {/* Sector overview grid */}
        {!isLoading && error === null && (
          <View style={styles.gridWrap}>{sortedSectors.map((sector) => renderSectorCard(sector))}</View>
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
  metaCard: {
    marginBottom: Spacing.sm,
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  controlsWrap: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  controlChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
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
});
