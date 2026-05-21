import { describe, expect, it } from "vitest";

import {
  buildLaborSectorHeatmapModel,
  heatmapFocusLine,
} from "@/lib/economy/laborSectorHeatmapModel";
import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";

function sectorSeries(
  id: string,
  name: string,
  values: [string, string][],
): EconomySectorResponse["series"][number] {
  return {
    id,
    name,
    points: values.map(([date, value]) => ({ date, value: Number(value) })),
  };
}

describe("buildLaborSectorHeatmapModel", () => {
  it("builds tiles from period growth over the API window sorted high to low", () => {
    const response: EconomySectorResponse = {
      startDate: "2026-01-01",
      endDate: "2026-05-01",
      sectors: {},
      series: [
        sectorSeries("MANEMP", "Manufacturing", [
          ["2026-01-01", "12000"],
          ["2026-02-01", "12050"],
          ["2026-03-01", "12100"],
        ]),
        sectorSeries("USEHS", "Education & Health Services", [
          ["2026-01-01", "20000"],
          ["2026-02-01", "20200"],
          ["2026-03-01", "20500"],
        ]),
      ],
    };
    const model = buildLaborSectorHeatmapModel(response);
    expect(model).not.toBeNull();
    expect(model!.tiles.length).toBe(2);
    expect(model!.tiles[0]!.abbrev).toBe("HLTH");
    expect(model!.tiles[0]!.pctChange).toBeGreaterThan(model!.tiles[1]!.pctChange!);
  });
});

describe("heatmapFocusLine", () => {
  it("describes strong hiring over period", () => {
    expect(heatmapFocusLine(2)).toContain("period");
  });
});
