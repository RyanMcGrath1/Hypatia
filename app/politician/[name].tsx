import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PoliticianDetailScreenBody } from "@/components/politician/PoliticianDetailScreenBody";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { AppRoutes } from "@/constants/app/routes";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { findPoliticianProfile } from "@/lib/politician/mockProfileSearch";

export default function PoliticianDetailScreen() {
  const router = useRouter();
  const { name: nameParam } = useLocalSearchParams<{ name?: string }>();
  const raw = Array.isArray(nameParam) ? nameParam[0] : nameParam;
  const decoded = raw ? decodeURIComponent(raw) : "";
  const profile = decoded ? findPoliticianProfile(decoded) : null;

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  const sharedHeaderOptions = {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: "minimal" as const,
    headerStyle: {
      backgroundColor: semantic.screenBackground,
    },
    headerTintColor: theme.tint,
    headerShadowVisible: false,
  };

  if (!profile) {
    return (
      <ThemedView style={[styles.screen, { backgroundColor: semantic.screenBackground }]}>
        <Stack.Screen
          options={{
            title: "",
            headerTitle: () => (
              <ThemedText
                style={{
                  fontFamily: Fonts.bodyBold,
                  color: Brand.primary,
                  letterSpacing: 0.8,
                  fontSize: 15,
                }}
              >
                HYPATIA
              </ThemedText>
            ),
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => router.push(AppRoutes.profile)}
                style={styles.headerIconHit}
              >
                <Ionicons name="person-circle-outline" size={28} color={theme.text} />
              </Pressable>
            ),
            ...sharedHeaderOptions,
          }}
        />
        <ThemedText style={[styles.missing, { color: theme.text }]}>
          No profile found{decoded ? ` for "${decoded}".` : "."}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: semantic.screenBackground }]}>
      <Stack.Screen
        options={{
          title: "",
          headerTitle: () => (
            <ThemedText
              style={{
                fontFamily: Fonts.bodyBold,
                color: Brand.primary,
                letterSpacing: 0.8,
                fontSize: 15,
              }}
            >
              HYPATIA
            </ThemedText>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push(AppRoutes.profile)}
              style={styles.headerIconHit}
            >
              <Ionicons name="person-circle-outline" size={28} color={theme.text} />
            </Pressable>
          ),
          ...sharedHeaderOptions,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + Spacing.lg,
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
    paddingTop: Spacing.md,
  },
  missing: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    fontSize: 16,
  },
  headerIconHit: {
    marginRight: 4,
    padding: 4,
  },
});
