import { Platform, type ViewStyle } from 'react-native';

import { Brand, BrandRgb, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — derived from the brand palette. */
export function getPillarColors(_colorScheme: AppColorScheme) {
  return {
    economy: Brand.slateGrey,
    politician: Brand.ink,
    news: Brand.springGreen,
  };
}

export function getSemanticColors(colorScheme: AppColorScheme) {
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const cardShadow: ViewStyle = isDark
    ? {}
    : {
        shadowColor: Brand.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: Platform.OS === 'android' ? 0.06 : 0.08,
        shadowRadius: 14,
        elevation: 2,
      };

  return {
    screenBackground: theme.background,
    cardBackground: isDark ? Brand.darkSlateGrey : Brand.lavender,
    sidePanelBackground: isDark
      ? `rgba(${BrandRgb.onyx[0]}, ${BrandRgb.onyx[1]}, ${BrandRgb.onyx[2]}, 0.88)`
      : `rgba(${BrandRgb.lavender[0]}, ${BrandRgb.lavender[1]}, ${BrandRgb.lavender[2]}, 0.88)`,
    sidePanelBlurOverlay: isDark
      ? `rgba(${BrandRgb.onyx[0]}, ${BrandRgb.onyx[1]}, ${BrandRgb.onyx[2]}, 0.52)`
      : `rgba(${BrandRgb.lavender[0]}, ${BrandRgb.lavender[1]}, ${BrandRgb.lavender[2]}, 0.52)`,
    cardSubtleBackground: isDark ? Brand.slateGrey : Brand.lavender,
    cardBorder: Brand.slateGrey,
    mutedText: isDark
      ? `rgba(${BrandRgb.lavender[0]}, ${BrandRgb.lavender[1]}, ${BrandRgb.lavender[2]}, 0.62)`
      : Brand.slateGrey,
    accent: theme.tint,
    danger: Brand.springGreen,
    hairline: Brand.slateGrey,
    overlayScrim: isDark
      ? `rgba(${BrandRgb.onyx[0]}, ${BrandRgb.onyx[1]}, ${BrandRgb.onyx[2]}, 0.62)`
      : `rgba(${BrandRgb.onyx[0]}, ${BrandRgb.onyx[1]}, ${BrandRgb.onyx[2]}, 0.35)`,
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
