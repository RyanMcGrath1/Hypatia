import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AppRoutes } from '@/constants/routes';
import { Radius, Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

type HomeQuickAction = {
  id: string;
  title: string;
  body: string;
  cta: string;
  route: string;
};

const QUICK_ACTIONS: HomeQuickAction[] = [
  {
    id: 'economy',
    title: 'Track economy trends',
    body: 'Review inflation, labor, rates, housing, and spending in one dashboard.',
    cta: 'Open Economy',
    route: AppRoutes.tabsEconomy,
  },
  {
    id: 'politician',
    title: 'Search elected officials',
    body: 'Find profile snapshots with priorities, headlines, and trend context.',
    cta: 'Open Politician',
    route: AppRoutes.tabsPolitician,
  },
  {
    id: 'explore',
    title: 'Explore civic divisions',
    body: 'Look up the offices and jurisdictions tied to a real-world address.',
    cta: 'Open Explore',
    route: AppRoutes.tabsExplore,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Hypatia"
          subtitle="A civic intelligence workspace for quick signal checks and deeper policy context."
          subtitleColor={semantic.mutedText}
        />
        <SectionCard backgroundColor={semantic.cardSubtleBackground} borderColor={semantic.cardBorder}>
          <ThemedText type="defaultSemiBold">Start here</ThemedText>
          <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
            Pick a path below to jump directly into economic snapshots, politician profiles, or civic district lookup.
          </ThemedText>
        </SectionCard>
        <View style={styles.actionsWrap}>
          {QUICK_ACTIONS.map((action) => (
            <SectionCard
              key={action.id}
              backgroundColor={semantic.cardBackground}
              borderColor={semantic.cardBorder}
              style={styles.actionCard}>
              <ThemedText type="subtitle">{action.title}</ThemedText>
              <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>{action.body}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.cta}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { backgroundColor: semantic.accent, opacity: pressed ? 0.88 : 1 },
                ]}
                onPress={() => router.push(action.route)}>
                <ThemedText style={styles.ctaLabel}>{action.cta}</ThemedText>
              </Pressable>
            </SectionCard>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 112,
    gap: Spacing.md,
  },
  actionsWrap: {
    gap: Spacing.md,
  },
  actionCard: {
    gap: Spacing.sm,
  },
  copy: {
    lineHeight: 20,
  },
  ctaButton: {
    minHeight: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  ctaLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

