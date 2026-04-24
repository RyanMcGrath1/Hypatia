import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { getEconomicSectorById } from '@/constants/usEconomicData';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function EconomicSectorDetailScreen() {
  const { sectorId } = useLocalSearchParams<{ sectorId?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const sharedHeaderOptions = {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: {
      backgroundColor: theme.background,
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
        <View style={styles.stateCard}>
          <ThemedText type="subtitle">Sector not found</ThemedText>
          <ThemedText style={[styles.copy, { color: theme.icon }]}>
            Return to the dashboard and select a valid economic tile.
          </ThemedText>
        </View>
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
        <ThemedText style={[styles.copy, { color: theme.icon }]}>Last updated {sector.updatedAt}</ThemedText>

        <View style={styles.heroCard}>
          <ThemedText type="defaultSemiBold">{sector.headlineLabel}</ThemedText>
          <ThemedText style={styles.heroValue}>{sector.headlineValue}</ThemedText>
          <ThemedText style={[styles.copy, { color: theme.icon }]}>{sector.summary}</ThemedText>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText type="defaultSemiBold">Interpretation</ThemedText>
          <ThemedText style={styles.copy}>{sector.interpretation}</ThemedText>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText type="defaultSemiBold">Key Metrics</ThemedText>
          {sector.metrics.map((metric) => (
            <View key={`${sector.id}-${metric.label}`} style={styles.metricRow}>
              <ThemedText style={[styles.metricLabel, { color: theme.icon }]}>{metric.label}</ThemedText>
              <ThemedText type="defaultSemiBold">{metric.value}</ThemedText>
              <ThemedText style={[styles.metricNote, { color: theme.icon }]}>{metric.note}</ThemedText>
            </View>
          ))}
        </View>
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
    paddingBottom: 96,
    gap: 12,
  },
  title: {
    marginBottom: 2,
  },
  stateCard: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: '#ef4444',
    padding: 12,
    gap: 8,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  heroValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  copy: {
    lineHeight: 20,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#94a3b8',
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
