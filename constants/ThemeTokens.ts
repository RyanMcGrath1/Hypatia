import { Colors } from '@/constants/Colors';

export type AppColorScheme = 'light' | 'dark';

export function getSemanticColors(colorScheme: AppColorScheme) {
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return {
    screenBackground: theme.background,
    cardBackground: isDark ? '#111827' : '#ffffff',
    cardSubtleBackground: isDark ? '#0f172a' : '#f8fafc',
    cardBorder: isDark ? '#374151' : '#e5e7eb',
    mutedText: theme.icon,
    accent: theme.tint,
    danger: '#dc2626',
    hairline: isDark ? '#1f2937' : '#e2e8f0',
    overlayScrim: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)',
  };
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 14,
} as const;
