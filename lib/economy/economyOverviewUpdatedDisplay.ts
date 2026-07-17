import { formatOverviewAsOfDisplay } from "@/lib/economy/economyOverviewTypes";

/** Fallback date when overview `as_of` is not yet available. */
export function fallbackOverviewAsOfDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** “UPDATED …” stamp text from overview `as_of`, matching the Economy tab header. */
export function resolveEconomyOverviewUpdatedDisplay(
  asOfIso: string | undefined | null,
): string {
  if (typeof asOfIso === "string" && asOfIso.trim() !== "") {
    return formatOverviewAsOfDisplay(asOfIso);
  }
  return fallbackOverviewAsOfDate();
}
