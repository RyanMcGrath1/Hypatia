import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/theme/ThemedText';
import { Colors } from '@/constants/theme/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Temporary auth landing until Login/Register screens exist.
 * Not a login form — unauthenticated builds need a valid `(auth)` route.
 */
export default function AuthLandingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="title" style={styles.brand}>
        Hypatia
      </ThemedText>
      <ThemedText style={styles.copy}>Authentication setup in progress.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    marginBottom: 12,
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    opacity: 0.85,
  },
});
