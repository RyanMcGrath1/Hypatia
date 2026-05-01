import { Platform, type ViewStyle } from 'react-native';

import { Brand, Colors } from '@/constants/theme/Colors';

export type AppColorScheme = 'light' | 'dark';

/** Pillar wayfinding — derived only from the brand hex set. */
export function getPillarColors(colorScheme: AppColorScheme) {
  return {
    economy: Brand.slate,
    politician: Brand.steel,
    news: Brand.coral,
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
    cardBackground: isDark ? Brand.slate : Brand.paper,
    /** Slide-out sidebar (web / blur fallback) — translucent fill. */
    sidePanelBackground: isDark ? 'rgba(51, 49, 56, 0.88)' : 'rgba(255, 255, 250, 0.88)',
    /** Tint layered on top of `BlurView` inside the sidebar (native). */
    sidePanelBlurOverlay: isDark ? 'rgba(51, 49, 56, 0.52)' : 'rgba(255, 255, 250, 0.52)',
    cardSubtleBackground: isDark ? Brand.ink : Brand.paper,
    cardBorder: isDark ? Brand.steel : Brand.slate,
    mutedText: isDark ? 'rgba(255,255,250,0.62)' : Brand.steel,
    accent: theme.tint,
    danger: Brand.coral,
    hairline: isDark ? Brand.steel : Brand.slate,
    overlayScrim: isDark ? 'rgba(0, 1, 3, 0.62)' : 'rgba(0, 1, 3, 0.35)',
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
