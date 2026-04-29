import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.tint,
          headerTitleStyle: { color: theme.text, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      />
      <ThemedText style={[styles.lead, { color: theme.icon }]}>
        Account details and settings can go here when you wire up auth.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
});
