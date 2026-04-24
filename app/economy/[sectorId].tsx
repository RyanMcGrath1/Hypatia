import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SectionCard } from '@/components/SectionCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import { getEconomicSectorById } from '@/constants/usEconomicData';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function EconomicSectorDetailScreen() {
  const { sectorId } = useLocalSearchParams<{ sectorId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const sharedHeaderOptions = {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: {
      backgroundColor: semantic.screenBackground,
    },
    headerTintColor: theme.tint,
    headerTitleStyle: {
      color: theme.text,
      fontWeight: '600' as const,
    },
    headerShadowVisible: false,
  };

  const normalizedId = Array.isArray(sectorId) ? sectorId[0] : sectorId;
  const sector = normalizedId ? getEconomicSectorById(normalizedId) : null;

  if (!sector) {
    return (
      <ThemedView style={styles.screen}>
        <Stack.Screen
          options={{
            title: 'Sector details',
            ...sharedHeaderOptions,
          }}
        />
        <EmptyState
          title="Sector not found"
          body="Return to the dashboard and select a valid economic tile."
          borderColor={semantic.danger}
          backgroundColor={semantic.cardBackground}
          bodyColor={semantic.mutedText}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen
        options={{
          title: sector.title,
          ...sharedHeaderOptions,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.title}>
          {sector.title}
        </ThemedText>
        <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>Last updated {sector.updatedAt}</ThemedText>

        <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.cardBorder} style={styles.heroCard}>
          <ThemedText type="defaultSemiBold">{sector.headlineLabel}</ThemedText>
          <ThemedText style={styles.heroValue}>{sector.headlineValue}</ThemedText>
          <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>{sector.summary}</ThemedText>
        </SectionCard>

        <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.cardBorder}>
          <ThemedText type="defaultSemiBold">Interpretation</ThemedText>
          <ThemedText style={styles.copy}>{sector.interpretation}</ThemedText>
        </SectionCard>

        <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.cardBorder}>
          <ThemedText type="defaultSemiBold">Key Metrics</ThemedText>
          {sector.metrics.map((metric) => (
            <View key={`${sector.id}-${metric.label}`} style={[styles.metricRow, { borderTopColor: semantic.hairline }]}>
              <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>{metric.label}</ThemedText>
              <ThemedText type="defaultSemiBold">{metric.value}</ThemedText>
              <ThemedText style={[styles.metricNote, { color: semantic.mutedText }]}>{metric.note}</ThemedText>
            </View>
          ))}
        </SectionCard>
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
    paddingBottom: 96,
    gap: Spacing.md,
  },
  title: {
    marginBottom: 2,
  },
  heroCard: {
    gap: 6,
  },
  heroValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  copy: {
    lineHeight: 20,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 1,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricNote: {
    fontSize: 12,
  },
});
