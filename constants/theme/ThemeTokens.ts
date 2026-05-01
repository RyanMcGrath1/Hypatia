import { Platform, type ViewStyle } from 'react-native';

import { Brand, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — derived from the brand palette. */
export function getPillarColors(colorScheme: AppColorScheme) {
  return {
    economy: Brand.slateBlue,
    politician: Brand.charcoal,
    news: Brand.teal,
  };
}

export function getSemanticColors(colorScheme: AppColorScheme) {
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const cardShadow: ViewStyle = isDark
    ? {}
    : {
        shadowColor: Brand.charcoal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: Platform.OS === 'android' ? 0.06 : 0.08,
        shadowRadius: 14,
        elevation: 2,
      };

  return {
    screenBackground: theme.background,
    cardBackground: isDark ? Brand.slateBlue : Brand.offWhite,
    sidePanelBackground: isDark ? 'rgba(11, 31, 58, 0.88)' : 'rgba(245, 247, 250, 0.88)',
    sidePanelBlurOverlay: isDark ? 'rgba(11, 31, 58, 0.52)' : 'rgba(245, 247, 250, 0.52)',
    cardSubtleBackground: isDark ? Brand.charcoal : Brand.offWhite,
    cardBorder: isDark ? Brand.slateBlue : Brand.slateBlue,
    mutedText: isDark ? 'rgba(245,247,250,0.62)' : Brand.slateBlue,
    accent: theme.tint,
    danger: Brand.teal,
    hairline: isDark ? Brand.slateBlue : Brand.slateBlue,
    overlayScrim: isDark ? 'rgba(11, 31, 58, 0.62)' : 'rgba(31, 41, 51, 0.35)',
    cardShadow,
  };
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 16,
} as const;
