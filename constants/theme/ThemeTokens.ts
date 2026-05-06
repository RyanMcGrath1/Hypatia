import { Platform, type ViewStyle } from 'react-native';

import { Brand, BrandRgb, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — matches dashboard accents (growth green, neutral ink, primary blue). */
export function getPillarColors(_colorScheme: AppColorScheme) {
  return {
    economy: Brand.success,
    politician: Brand.ink,
    news: Brand.primary,
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
        shadowOpacity: Platform.OS === 'android' ? 0.06 : 0.07,
        shadowRadius: 12,
        elevation: 2,
      };

  return {
    screenBackground: theme.background,
    cardBackground: isDark ? Brand.darkElevated : Brand.white,
    sidePanelBackground: isDark
      ? `rgba(${BrandRgb.darkElevated[0]}, ${BrandRgb.darkElevated[1]}, ${BrandRgb.darkElevated[2]}, 0.92)`
      : `rgba(${BrandRgb.white[0]}, ${BrandRgb.white[1]}, ${BrandRgb.white[2]}, 0.92)`,
    sidePanelBlurOverlay: isDark
      ? `rgba(${BrandRgb.darkCanvas[0]}, ${BrandRgb.darkCanvas[1]}, ${BrandRgb.darkCanvas[2]}, 0.55)`
      : `rgba(${BrandRgb.white[0]}, ${BrandRgb.white[1]}, ${BrandRgb.white[2]}, 0.55)`,
    cardSubtleBackground: isDark ? Brand.darkElevated : Brand.primarySoft,
    cardBorder: isDark ? 'rgba(255,255,255,0.1)' : Brand.border,
    mutedText: isDark ? 'rgba(232,234,237,0.58)' : Brand.muted,
    accent: theme.tint,
    danger: Brand.danger,
    hairline: isDark ? 'rgba(255,255,255,0.08)' : Brand.divider,
    overlayScrim: isDark
      ? `rgba(${BrandRgb.darkCanvas[0]}, ${BrandRgb.darkCanvas[1]}, ${BrandRgb.darkCanvas[2]}, 0.62)`
      : `rgba(${BrandRgb.ink[0]}, ${BrandRgb.ink[1]}, ${BrandRgb.ink[2]}, 0.35)`,
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
