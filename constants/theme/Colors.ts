/**
 * Hypatia palette — deep navy, slate blue, off-white, charcoal, teal.
 * Aliases (`paper`, `coral`, …) keep older call sites working.
 */
export const Brand = {
  deepNavy: '#0B1F3A',
  slateBlue: '#3A5A98',
  offWhite: '#F5F7FA',
  charcoal: '#1F2933',
  teal: '#2A9D8F',

  paper: '#F5F7FA',
  steel: '#3A5A98',
  ink: '#1F2933',
  slate: '#3A5A98',
  coral: '#2A9D8F',
} as const;

/** RGB tuples for chart kit / overlays that need `rgba(...)`. */
export const BrandRgb = {
  offWhite: [245, 247, 250] as const,
  teal: [42, 157, 143] as const,
  charcoal: [31, 41, 51] as const,
  slateBlue: [58, 90, 152] as const,
  deepNavy: [11, 31, 58] as const,
} as const;

const tintLight = Brand.teal;
const tintDark = Brand.teal;

export const Colors = {
  light: {
    text: Brand.charcoal,
    background: Brand.offWhite,
    tint: tintLight,
    icon: Brand.slateBlue,
    tabIconDefault: Brand.slateBlue,
    tabIconSelected: tintLight,
  },
  dark: {
    text: Brand.offWhite,
    background: Brand.deepNavy,
    tint: tintDark,
    icon: 'rgba(245,247,250,0.55)',
    tabIconDefault: 'rgba(245,247,250,0.45)',
    tabIconSelected: tintDark,
  },
};
