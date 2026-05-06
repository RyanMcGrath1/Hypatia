import { Platform, type ViewStyle } from 'react-native';

import { Brand, BrandRgb, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — growth green, neutral ink, primary blue */
export function getPillarColors(colorScheme: AppColorScheme) {
  const isDark = colorScheme === 'dark';
  return {
    economy: Brand.success,
    politician: isDark ? Brand.darkOnSurface : Brand.ink,
    news: isDark ? Brand.darkPrimary : Brand.primary,
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
    cardBackground: isDark ? Brand.darkSurfaceContainer : Brand.white,
    /** Level-2 surface (YAML `surface-container-high`) — drawer above canvas. */
    sidePanelBackground: isDark ? Brand.darkSurfaceContainerHigh : Brand.white,
    /**
     * Tints the frosted glass so the drawer matches canvas (light) / dark canvas (dark)
     * instead of reading as generic system gray.
     */
    sidePanelBlurOverlay: isDark
      ? `rgba(${BrandRgb.darkCanvas[0]}, ${BrandRgb.darkCanvas[1]}, ${BrandRgb.darkCanvas[2]}, 0.5)`
      : `rgba(${BrandRgb.canvas[0]}, ${BrandRgb.canvas[1]}, ${BrandRgb.canvas[2]}, 0.78)`,
    /** Active drawer row — primary soft (light) / primary wash (dark). */
    sidePanelItemActiveBackground: isDark
      ? 'rgba(184, 195, 255, 0.14)'
      : Brand.primarySoft,
    cardSubtleBackground: isDark ? Brand.darkSurfaceContainerLow : Brand.primarySoft,
    cardBorder: isDark ? Brand.darkOutlineVariant : 'transparent',
    cardOutlineWidth: isDark ? 1 : 0,
    mutedText: isDark ? Brand.darkOnSurfaceVariant : Brand.muted,
    accent: theme.tint,
    danger: isDark ? Brand.darkError : Brand.danger,
    hairline: isDark ? 'rgba(142, 144, 160, 0.22)' : Brand.divider,
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
