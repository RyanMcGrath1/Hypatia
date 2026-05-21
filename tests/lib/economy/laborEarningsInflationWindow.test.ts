import { describe, expect, it } from "vitest";

import {
  laborEarningsInflationFetchWindow,
  wagesInflationPeriodLabel,
} from "@/lib/economy/laborEarningsInflationWindow";

describe("laborEarningsInflationFetchWindow", () => {
  it("passes the payroll filter window to the API", () => {
    const w = laborEarningsInflationFetchWindow({
      observationStart: "2026-01-01",
      observationEnd: "2026-05-18",
    });
    expect(w).toEqual({
      observationStart: "2026-01-01",
      observationEnd: "2026-05-18",
    });
  });
});

describe("wagesInflationPeriodLabel", () => {
  it("formats the committed filter range", () => {
    expect(
      wagesInflationPeriodLabel({
        observationStart: "2026-01-01",
        observationEnd: "2026-05-18",
      }),
    ).toMatch(/Jan.*2026.*May.*2026/);
  });
});
