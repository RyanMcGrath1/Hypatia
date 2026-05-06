import { useMemo } from 'react';

import { getThemeInteractive, type ThemeInteractive } from '@/constants/theme/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeInteractive(): ThemeInteractive {
  const scheme = useColorScheme() ?? 'light';
  return useMemo(() => getThemeInteractive(scheme), [scheme]);
}
