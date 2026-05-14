import type {
  EconomyOverviewApiResponse,
  EconomyOverviewSections,
} from "@/lib/economy/economyOverviewTypes";
import { parseEconomyOverviewResponse } from "@/lib/economy/economyOverviewTypes";

/**
 * Merges parallel `GET /api/economy/{sector}/dashboard` payloads into one
 * {@link EconomyOverviewApiResponse} for the Economy tab (each response may include only its
 * section under `sections`).
 */
export function mergeEconomySectorDashboardResponses(
  settled: PromiseSettledResult<unknown>[],
): EconomyOverviewApiResponse | null {
  const sections: Record<string, EconomyOverviewSections[keyof EconomyOverviewSections]> = {};
  let asOf = "";

  for (const s of settled) {
    if (s.status !== "fulfilled") {
      continue;
    }
    const parsed = parseEconomyOverviewResponse(s.value);
    if (!parsed) {
      continue;
    }
    Object.assign(sections, parsed.sections);
    const next = parsed.as_of?.trim();
    if (next && (!asOf || next.localeCompare(asOf) > 0)) {
      asOf = next;
    }
  }

  if (Object.keys(sections).length === 0) {
    return null;
  }

  return {
    as_of: asOf || new Date().toISOString(),
    sections: sections as EconomyOverviewSections,
  };
}
