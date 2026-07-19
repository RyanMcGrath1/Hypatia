export type InflationComponentIcon = "home" | "restaurant" | "flash" | "briefcase" | "cube";
/** Static icon mapping for CPI component keys from the backend. */
export const CPI_COMPONENT_ICONS: Record<string, InflationComponentIcon> = {
  shelter: "home",
  food: "restaurant",
  energy: "flash",
  core_goods: "cube",
  core_services: "briefcase",
};

/** @deprecated Use `useEconomyInflationCpiComponents` — kept so stale bundles do not crash. */
export const INFLATION_CPI_COMPONENTS: readonly [] = [];

/** Minimum bar scale for PCE vs target (actual scale grows with data). */
export const INFLATION_PCE_SCALE_MIN = 3.5;
