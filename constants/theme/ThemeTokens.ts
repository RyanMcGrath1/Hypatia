import { Platform, type ViewStyle } from 'react-native';

import { Brand, BrandRgb, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — growth green, neutral ink, primary blue */
export function getPillarColors(_colorScheme: AppColorScheme) {
  return {
    economy: Brand.success,
    politician: Brand.ink,
    news: Brand.primary,
  };
}

/** Ambient card shadow (light): 0 4px 12px rgba(0,0,0,0.05) per DESIGN.md */
export function getSemanticColors(colorScheme: AppColorScheme) {
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const cardShadow: ViewStyle = isDark
    ? {}
    : {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: Platform.OS === 'android' ? 0.06 : 0.05,
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
    cardBorder: isDark ? Brand.border : 'transparent',
    cardOutlineWidth: isDark ? 1 : 0,
    mutedText: isDark ? 'rgba(241,239,251,0.58)' : Brand.muted,
    accent: theme.tint,
    danger: Brand.danger,
    hairline: isDark ? 'rgba(196,197,215,0.12)' : Brand.divider,
    overlayScrim: isDark
      ? `rgba(${BrandRgb.darkCanvas[0]}, ${BrandRgb.darkCanvas[1]}, ${BrandRgb.darkCanvas[2]}, 0.62)`
      : `rgba(${BrandRgb.ink[0]}, ${BrandRgb.ink[1]}, ${BrandRgb.ink[2]}, 0.35)`,
    cardShadow,
  };
}

/** 8px base scale + container tokens from DESIGN.md */
export const Spacing = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  containerPadding: 24,
  gutter: 20,
} as const;

/**
 * Radii from DESIGN.md (16px root): sm 4, md 8, lg 12, xl 16, xxl 24.
 * Large containers / cards use `xl` (1rem); buttons / inputs use `md` (0.5rem).
 */
export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;
