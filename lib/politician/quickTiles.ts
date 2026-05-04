import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ComponentProps } from "react";

export type PoliticianQuickTile = {
  icon: ComponentProps<typeof FontAwesome>["name"];
  title: string;
  subtitle: string;
};

/** Placeholder shortcuts for the bottom 2×2 grid (no navigation wired yet). */
export const POLITICIAN_QUICK_TILES: PoliticianQuickTile[] = [
  {
    icon: "bar-chart",
    title: "Trends",
    subtitle: "Approval & spotlight",
  },
  {
    icon: "map-marker",
    title: "Districts",
    subtitle: "Jurisdiction map",
  },
  {
    icon: "calendar",
    title: "Calendar",
    subtitle: "Hearings & events",
  },
  {
    icon: "globe",
    title: "Coverage",
    subtitle: "Press & statements",
  },
];
