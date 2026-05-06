export const AppRoutes = {
  tabsRoot: '/(tabs)',
  tabsExplore: '/(tabs)/explore',
  tabsEconomy: '/(tabs)/economy',
  tabsPolitician: '/(tabs)/politician',
  economyDetail: '/economy/[sectorId]',
  politicianDetail: '/politician/[name]',
  article: '/article',
  profile: '/profile',
} as const;
