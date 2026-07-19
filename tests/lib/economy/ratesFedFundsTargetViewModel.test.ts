import { describe, expect, it } from "vitest";

import type { RatesFedFundsTargetResponse } from "@/hooks/api/economyRatesFedFundsTargetApi";
import {
  formatFedFundsTargetRange,
  ratesFedFundsTargetFromApi,
} from "@/lib/economy/ratesFedFundsTargetViewModel";

describe("formatFedFundsTargetRange", () => {
  it("formats lower and upper bounds with two decimals", () => {
    expect(formatFedFundsTargetRange(3.5, 3.75)).toBe("3.50% - 3.75%");
    expect(formatFedFundsTargetRange(5.25, 5.5)).toBe("5.25% - 5.50%");
  });
});

describe("ratesFedFundsTargetFromApi", () => {
  it("maps target bounds into headline copy", () => {
    const api: RatesFedFundsTargetResponse = {
      start_date: "2026-01-01",
      end_date: "2026-05-18",
      target_lower: 3.5,
      target_upper: 3.75,
      observation_date: "2026-05-01",
      series: [],
    };

    const vm = ratesFedFundsTargetFromApi(api);
    expect(vm.headlineValueLabel).toBe("3.50% - 3.75%");
    expect(vm.observationDateLabel).toBe("May 1, 2026");
  });

  it("returns placeholders when api is null", () => {
    const vm = ratesFedFundsTargetFromApi(null);
    expect(vm.headlineValueLabel).toBe("—");
    expect(vm.observationDateLabel).toBeNull();
  });

  it("returns placeholders when headline bounds are missing", () => {
    const api: RatesFedFundsTargetResponse = {
      start_date: "2026-01-01",
      end_date: "2026-05-18",
      target_lower: null,
      target_upper: 3.75,
      observation_date: null,
      series: [],
    };

    const vm = ratesFedFundsTargetFromApi(api);
    expect(vm.headlineValueLabel).toBe("—");
    expect(vm.observationDateLabel).toBeNull();
  });
});
