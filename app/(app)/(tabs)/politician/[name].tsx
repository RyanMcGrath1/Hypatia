import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PoliticianDetailScreenBody } from "@/components/politician/PoliticianDetailScreenBody";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { TAB_BAR_SCROLL_CLEARANCE } from "@/constants/navigation/floatingTabBar";
import { Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { findPoliticianProfile } from "@/lib/politician/mockProfileSearch";

export default function PoliticianDetailScreen() {
  const { name: nameParam } = useLocalSearchParams<{ name?: string }>();
  const raw = Array.isArray(nameParam) ? nameParam[0] : nameParam;
  const decoded = raw ? decodeURIComponent(raw) : "";
  const profile = decoded ? findPoliticianProfile(decoded) : null;

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  if (!profile) {
    return (
      <ThemedView style={[styles.screen, { backgroundColor: semantic.screenBackground }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedText style={[styles.missing, { color: theme.text }]}>
          No profile found{decoded ? ` for "${decoded}".` : "."}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: semantic.screenBackground }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + TAB_BAR_SCROLL_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PoliticianDetailScreenBody profile={profile} />
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
    paddingTop: Spacing.sm,
  },
  missing: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    fontSize: 16,
  },
});
