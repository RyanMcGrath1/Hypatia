export const AppRoutes = {
  /** Unauthenticated auth-group entry points (`canAccessApp === false`). */
  authLogin: '/login',
  authRegister: '/register',
  /** TOTP verification after password Login returns totp_required (memory challenge). */
  authLoginTotp: '/login-totp',
  /**
   * Public dual-confirm email-change verification (outside auth/app guards).
   * Deep link: hypatia://verify-email-change?token=...
   */
  verifyEmailChange: '/verify-email-change',
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
