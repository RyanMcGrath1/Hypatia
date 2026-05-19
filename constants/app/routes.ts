export const AppRoutes = {
  tabsRoot: '/(tabs)',
  tabsExplore: '/(tabs)/explore',
  tabsEconomy: '/(tabs)/economy',
  tabsPolitician: '/(tabs)/politician',
  /** Nested under Economy tab so the bottom tab bar stays visible. */
  economyDetail: '/(tabs)/economy/[sectorId]',
  politicianDetail: '/(tabs)/politician/[name]',
  article: '/(tabs)/index/article',
  profile: '/(tabs)/profile',
} as const;
