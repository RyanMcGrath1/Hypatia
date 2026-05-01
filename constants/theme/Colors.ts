/**
 * Brand palette — use across the app via `Colors` / `getSemanticColors`.
 * Paper & ink bases, steel/slate neutrals, coral accent.
 */
export const Brand = {
  paper: '#FFFFFA',
  steel: '#515052',
  ink: '#000103',
  slate: '#333138',
  coral: '#FF312E',
} as const;

/** Primary accent / links / selected tabs / CTAs */
const tintLight = Brand.coral;
const tintDark = Brand.coral;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.paper,
    tint: tintLight,
    icon: Brand.steel,
    tabIconDefault: Brand.steel,
    tabIconSelected: tintLight,
  },
  dark: {
    text: Brand.paper,
    background: Brand.ink,
    tint: tintDark,
    /** On ink, muted chrome uses paper at reduced opacity (see ThemeTokens for rgba). */
    icon: 'rgba(255,255,250,0.55)',
    tabIconDefault: 'rgba(255,255,250,0.45)',
    tabIconSelected: tintDark,
  },
};
