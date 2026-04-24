import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { Href, usePathname, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type MenuItem = {
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  href: Href;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Home', icon: 'home', href: '/' },
  { label: 'Explore', icon: 'paper-plane', href: '/explore' },
  { label: 'Economy', icon: 'dollar', href: '/(tabs)/economy' },
  { label: 'Politician', icon: 'university', href: '/politician' },
];

export function AppBanner() {
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const panelAnim = useRef(new Animated.Value(0)).current;
  const panelColors = useMemo(
    () => ({
      panelBg: colorScheme === 'dark' ? '#111827' : '#ffffff',
      panelBorder: colorScheme === 'dark' ? '#374151' : '#d1d5db',
      scrim: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)',
    }),
    [colorScheme],
  );

  const openPanel = () => {
    setIsPanelMounted(true);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsPanelMounted(false);
      }
    });
  };

  const navigateFromMenu = (href: Href) => {
    closePanel();
    if (pathname !== href) {
      router.push(href);
    }
  };

  const isActiveRoute = (href: Href) => {
    const hrefString = String(href);
    if (hrefString === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(hrefString);
  };

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderBottomColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
          },
        ]}>
        <Pressable style={styles.menuButton} onPress={openPanel}>
          <FontAwesome name="bars" size={18} color={theme.text} />
        </Pressable>

        <Image
          source={require('@/assets/images/hypatia-logo.png')}
          style={styles.image}
          contentFit="contain"
          accessibilityLabel="App banner"
        />
      </View>

      {isPanelMounted && (
        <View style={styles.overlayWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.scrim,
              { backgroundColor: panelColors.scrim, opacity: panelAnim },
            ]}>
            <Pressable style={styles.scrimPressable} onPress={closePanel} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidePanel,
              {
                backgroundColor: panelColors.panelBg,
                borderColor: panelColors.panelBorder,
                paddingTop: insets.top + 12,
              },
              {
                transform: [
                  {
                    translateX: panelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-280, 0],
                    }),
                  },
                ],
              },
            ]}>
            <ThemedView style={styles.sidePanelContent}>
            <View style={styles.sidePanelHeader}>
              <ThemedText type="subtitle">Menu</ThemedText>
            </View>
            <View style={styles.panelItemList}>
              {MENU_ITEMS.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Pressable
                    key={item.label}
                    style={[
                      styles.panelItemButton,
                      {
                        borderColor: isActive ? theme.tint : 'transparent',
                        backgroundColor: isActive ? (colorScheme === 'dark' ? '#1f2937' : '#eff6ff') : 'transparent',
                      },
                    ]}
                    onPress={() => navigateFromMenu(item.href)}>
                    <FontAwesome
                      name={item.icon}
                      size={16}
                      color={isActive ? theme.tint : theme.text}
                    />
                    <ThemedText
                      style={[
                        styles.panelItem,
                        { color: isActive ? theme.tint : theme.text },
                      ]}>
                      {item.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            </ThemedView>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 2,
    position: 'relative',
    zIndex: 20,
  },
  menuButton: {
    position: 'absolute',
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 38,
    height: 38,
  },
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scrimPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sidePanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '74%',
    maxWidth: 320,
    borderRightWidth: 1,
    paddingHorizontal: 16,
  },
  sidePanelContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sidePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 14,
  },
  panelItemList: {
    gap: 8,
  },
  panelItemButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelItem: {
    fontSize: 16,
  },
});
