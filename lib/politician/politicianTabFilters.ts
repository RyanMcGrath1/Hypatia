import type { PoliticianProfile } from "@/lib/politician/types";

export type PoliticianTabFilterId =
  | "all"
  | "house"
  | "senate"
  | "democrat"
  | "republican";

export const POLITICIAN_TAB_FILTER_OPTIONS: {
  id: PoliticianTabFilterId;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "house", label: "House" },
  { id: "senate", label: "Senate" },
  { id: "democrat", label: "Democrat" },
  { id: "republican", label: "Republican" },
];

export function politicianProfileMatchesTabFilter(
  profile: PoliticianProfile,
  filter: PoliticianTabFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "house") return profile.role.toLowerCase().includes("house");
  if (filter === "senate") return profile.role.toLowerCase().includes("senator");
  if (filter === "democrat") return profile.party === "Democratic";
  if (filter === "republican") return profile.party === "Republican";
  return true;
}
