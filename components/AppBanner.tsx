import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function AppBanner() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderBottomColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
        },
      ]}>
      <Image
        source={require('@/assets/images/react-logo.png')}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="App banner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 28,
    height: 28,
  },
});
