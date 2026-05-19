/**
 * Hypatia Precision — Material-style tokens (YAML reference).
 * `Brand` legacy keys preserve older imports (e.g. `springGreen` → primary).
 * Dark surfaces & roles match Hypatia Precision YAML (background, containers, primary #b8c3ff, etc.).
 */

export const Palette = {
  canvas: "#fbf8ff",
  white: "#ffffff",
  ink: "#1a1b23",
  muted: "#444655",
  border: "#c4c5d7",
  divider: "#e2e1ed",
  outline: "#747686",
  primary: "#264dd9",
  primarySoft: "#dde1ff",
  surfaceTint: "#294fdb",
  secondary: "#006780",
  secondarySoft: "#b7eaff",
  tertiary: "#974300",
  tertiarySoft: "#ffdbc9",
  /** Positive trends / success — calm green (not in YAML; pairs with data viz). */
  success: "#1d6f52",
  successSoft: "#d9eee6",
  warning: "#974300",
  warningSoft: "#ffdbc9",
  danger: "#ba1a1a",
  dangerSoft: "#ffdad6",
  info: "#006780",
  infoSoft: "#b7eaff",

  /** Dark — YAML `background` / `surface` (level 0 canvas). */
  darkCanvas: "#11131b",
  /**
   * Tab screen roots — same family as `darkCanvas` with a whisper of primary so
   * light `#F4F2FA` vs `canvas` has a dark analogue across News/Economy/Politician/Explore.
   */
  darkTabCanvas: "#121420",
  /** YAML `surface-container-low` — subtle fills below card tier. */
  darkSurfaceContainerLow: "#1a1b23",
  /** YAML `surface-container` — level 1 cards. */
  darkSurfaceContainer: "#1e1f27",
  /** YAML `surface-container-high` — level 2 (drawer, popovers). */
  darkSurfaceContainerHigh: "#282932",
  /** YAML `surface-container-highest` / `surface-variant`. */
  darkSurfaceContainerHighest: "#33343d",
  darkSurfaceBright: "#373942",
  darkSurfaceLowest: "#0c0e16",
  darkOnSurface: "#e2e1ed",
  darkOnSurfaceVariant: "#c4c5d7",
  darkOutline: "#8e90a0",
  darkOutlineVariant: "#444655",
  /** YAML `primary` / `surface-tint` on dark. */
  darkPrimary: "#b8c3ff",
  darkOnPrimary: "#002388",
  /** YAML `inverse-primary` — solid fills (CTAs) on dark. */
  darkInversePrimary: "#294fdb",
  darkSecondary: "#60d4fb",
  darkOnSecondary: "#003543",
  darkTertiary: "#ffb68e",
  darkOnTertiary: "#532200",
  darkError: "#ffb4ab",
  darkOnError: "#690005",
} as const;

/** Legacy names mapped to Precision tokens */
export const Brand = {
  ...Palette,
  onyx: Palette.darkCanvas,
  deepNavy: Palette.darkCanvas,
  charcoal: Palette.darkSurfaceContainer,
  slate: Palette.darkSurfaceContainer,
  darkSlateGrey: Palette.darkSurfaceContainer,
  slateBlue: Palette.muted,
  slateGrey: Palette.muted,
  steel: Palette.outline,
  offWhite: Palette.canvas,
  paper: Palette.white,
  lavender: Palette.canvas,
  /** Primary accent (tabs, CTAs, links) — historically “spring green”. */
  springGreen: Palette.primary,
  teal: Palette.primary,
  /** Positive / economy accents — historically coral */
  coral: Palette.success,
  /** Level-1 dark card (alias). */
  darkElevated: Palette.darkSurfaceContainer,
  darkSurfaceHigh: Palette.darkSurfaceContainerHigh,
} as const;

/** RGB tuples for charts and overlays. */
export const BrandRgb = {
  canvas: [251, 248, 255] as const,
  white: [255, 255, 255] as const,
  ink: [26, 27, 35] as const,
  muted: [68, 70, 85] as const,
  primary: [38, 77, 217] as const,
  success: [29, 111, 82] as const,
  danger: [186, 26, 26] as const,
  darkCanvas: [17, 19, 27] as const,
  darkSurfaceContainer: [30, 31, 39] as const,
  darkSurfaceContainerHigh: [40, 41, 50] as const,
  darkPrimary: [184, 195, 255] as const,
  /** Legacy aliases */
  darkElevated: [30, 31, 39] as const,
  onyx: [17, 19, 27] as const,
  lavender: [251, 248, 255] as const,
  offWhite: [251, 248, 255] as const,
  charcoal: [30, 31, 39] as const,
  teal: [38, 77, 217] as const,
  springGreen: [38, 77, 217] as const,
  slateGrey: [68, 70, 85] as const,
  slateBlue: [68, 70, 85] as const,
  deepNavy: [17, 19, 27] as const,
} as const;

const tintLight = Palette.primary;
const tintDark = Brand.darkPrimary;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.canvas,
    tint: tintLight,
    icon: Brand.muted,
    tabIconDefault: Brand.muted,
    tabIconSelected: tintLight,
  },
  dark: {
    text: Brand.darkOnSurface,
    background: Brand.darkCanvas,
    tint: tintDark,
    icon: "rgba(196, 197, 215, 0.55)",
    tabIconDefault: "rgba(196, 197, 215, 0.45)",
    tabIconSelected: tintDark,
  },
};

/** Theme-aware accents (YAML dark roles vs light palette). */
export type ThemeInteractive = {
  primary: string;
  primarySoft: string;
  /** Solid primary control fill (inverse primary on dark). */
  primaryFill: string;
  /** Text/icon on `primaryFill`. */
  onPrimaryFill: string;
  secondary: string;
  secondarySoft: string;
  tertiary: string;
  tertiarySoft: string;
  info: string;
  infoSoft: string;
  danger: string;
  dangerSoft: string;
  warningSoft: string;
};

export function getThemeInteractive(
  colorScheme: "light" | "dark",
): ThemeInteractive {
  if (colorScheme === "dark") {
    return {
      primary: Brand.darkPrimary,
      primarySoft: "rgba(184, 195, 255, 0.14)",
      primaryFill: Brand.darkInversePrimary,
      onPrimaryFill: Brand.white,
      secondary: Brand.darkSecondary,
      secondarySoft: "rgba(96, 212, 251, 0.14)",
      tertiary: Brand.darkTertiary,
      tertiarySoft: "rgba(255, 182, 142, 0.14)",
      info: Brand.darkSecondary,
      infoSoft: "rgba(96, 212, 251, 0.14)",
      danger: Brand.darkError,
      dangerSoft: "rgba(255, 180, 171, 0.14)",
      warningSoft: "rgba(255, 182, 142, 0.14)",
    };
  }
  return {
    primary: Brand.primary,
    primarySoft: Brand.primarySoft,
    primaryFill: Brand.primary,
    onPrimaryFill: Brand.white,
    secondary: Brand.secondary,
    secondarySoft: Brand.secondarySoft,
    tertiary: Brand.tertiary,
    tertiarySoft: Brand.tertiarySoft,
    info: Brand.info,
    infoSoft: Brand.infoSoft,
    danger: Brand.danger,
    dangerSoft: Brand.dangerSoft,
    warningSoft: Brand.warningSoft,
  };
}
