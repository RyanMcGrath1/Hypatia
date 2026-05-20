import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import {
  buildLaborSectorLineChartModel,
  formatSectorPctChange,
} from "@/lib/economy/laborSectorLineChartModel";

export type LaborSectorRadarSpoke = {
  id: string;
  label: string;
  color: string;
  pctChange: number;
  vertexX: number;
  vertexY: number;
  labelLeft: number;
  labelTop: number;
  labelWidth: number;
  labelTextAlign: "left" | "center" | "right";
  /** Outer-ring point for optional leader line to label. */
  labelAnchorX: number;
  labelAnchorY: number;
};

export type LaborSectorRadarGridRing = {
  /** Fraction of plot radius (0–1). */
  fraction: number;
  points: string;
};

export type LaborSectorRadarScaleLabel = {
  x: number;
  y: number;
};

export type LaborSectorRadarChartModel = {
  size: number;
  cx: number;
  cy: number;
  plotRadius: number;
  /** Inner edge of the value band (padding below most-negative). */
  innerPlotRadius: number;
  /** Radius for 0% on the scale. */
  zeroRingRadius: number;
  scaleMaxPct: number;
  scaleMinPct: number;
  zeroRing: LaborSectorRadarGridRing;
  /** Inner padding ring (most-negative values sit on this, not the center). */
  innerFloorRing: LaborSectorRadarGridRing;
  polygonPoints: string;
  spokes: LaborSectorRadarSpoke[];
  gridRings: LaborSectorRadarGridRing[];
  axisLines: { x1: number; y1: number; x2: number; y2: number }[];
  scaleLabels: {
    max: LaborSectorRadarScaleLabel;
    zero: LaborSectorRadarScaleLabel;
    min: LaborSectorRadarScaleLabel;
  };
  chartSubtitle: string;
};

const CHART_PLOT_MAX = 260;
const MIN_SCALE_PCT = 0.25;
const LABEL_BOX_H = 24;
const LABEL_BASE_OFFSET = 26;
const LABEL_RADIUS_STEP = 10;
const LABEL_CANVAS_MARGIN = 10;
const LABEL_BOX_GAP = 4;
/** Clearance from the radar polygon edge to any label box. */
const PLOT_LABEL_GAP = 12;
/** Inset so the most-negative point sits above the chart center, not on it. */
const INNER_RADIUS_RATIO = 0.14;
const GRID_T_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

function spokeAngle(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count;
}

function ringPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  count: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = spokeAngle(i, count);
    pts.push(`${cx + radius * Math.sin(a)},${cy - radius * Math.cos(a)}`);
  }
  return pts.join(" ");
}

type LabelTextAlign = "left" | "center" | "right";

type LabelBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function labelAlignForAngle(angle: number): LabelTextAlign {
  const deg = (angle * 180) / Math.PI;
  if (deg > 30 && deg < 150) {
    return "left";
  }
  if (deg < -30 && deg > -150) {
    return "right";
  }
  return "center";
}

function labelWidthForText(label: string): number {
  return Math.min(96, Math.max(64, Math.ceil(label.length * 7)));
}

function labelBoxFromAnchor(
  anchorX: number,
  anchorY: number,
  align: LabelTextAlign,
  boxWidth: number,
): LabelBox {
  const left =
    align === "left"
      ? anchorX
      : align === "right"
        ? anchorX - boxWidth
        : anchorX - boxWidth / 2;
  const top = anchorY - LABEL_BOX_H / 2;
  return {
    left,
    top,
    right: left + boxWidth,
    bottom: top + LABEL_BOX_H,
  };
}

function boxesOverlap(a: LabelBox, b: LabelBox, gap = LABEL_BOX_GAP): boolean {
  return (
    a.left - gap < b.right + gap &&
    a.right + gap > b.left - gap &&
    a.top - gap < b.bottom + gap &&
    a.bottom + gap > b.top - gap
  );
}

function boxOverlapsPlot(
  box: LabelBox,
  cx: number,
  cy: number,
  plotRadius: number,
): boolean {
  const keepOut = plotRadius + PLOT_LABEL_GAP;
  const r2 = keepOut * keepOut;
  const pts = [
    { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 },
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.left, y: box.bottom },
    { x: box.right, y: box.bottom },
  ];
  return pts.some((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return dx * dx + dy * dy < r2;
  });
}

function labelFitsPlacement(
  box: LabelBox,
  cx: number,
  cy: number,
  plotRadius: number,
  canvasSize: number,
  placed: LabelBox[],
): boolean {
  const clamped = clampLabelBox(box, canvasSize);
  if (boxOverlapsPlot(clamped, cx, cy, plotRadius)) {
    return false;
  }
  return !placed.some((p) => boxesOverlap(clamped, p));
}

function clampLabelBox(box: LabelBox, canvasSize: number): LabelBox {
  let { left, top, right, bottom } = box;
  const m = LABEL_CANVAS_MARGIN;
  const max = canvasSize - m;
  if (left < m) {
    const shift = m - left;
    left += shift;
    right += shift;
  }
  if (right > max) {
    const shift = right - max;
    left -= shift;
    right -= shift;
  }
  if (top < m) {
    const shift = m - top;
    top += shift;
    bottom += shift;
  }
  if (bottom > max) {
    const shift = bottom - max;
    top -= shift;
    bottom -= shift;
  }
  return { left, top, right, bottom };
}

function layoutSpokeLabel(
  angle: number,
  label: string,
  cx: number,
  cy: number,
  plotRadius: number,
  canvasSize: number,
  placed: LabelBox[],
): {
  labelLeft: number;
  labelTop: number;
  labelWidth: number;
  labelTextAlign: LabelTextAlign;
  labelAnchorX: number;
  labelAnchorY: number;
} {
  const align = labelAlignForAngle(angle);
  const boxWidth = labelWidthForText(label);
  const centerBump = align === "center" ? 8 : 0;
  const anchorR = plotRadius + PLOT_LABEL_GAP;
  const labelAnchorX = cx + anchorR * Math.sin(angle);
  const labelAnchorY = cy - anchorR * Math.cos(angle);

  let labelRadius = plotRadius + LABEL_BASE_OFFSET + centerBump;
  const maxRadius = canvasSize * 0.48;

  for (let attempt = 0; attempt < 24 && labelRadius <= maxRadius; attempt += 1) {
    const anchorX = cx + labelRadius * Math.sin(angle);
    const anchorY = cy - labelRadius * Math.cos(angle);
    const raw = labelBoxFromAnchor(anchorX, anchorY, align, boxWidth);
    if (labelFitsPlacement(raw, cx, cy, plotRadius, canvasSize, placed)) {
      const box = clampLabelBox(raw, canvasSize);
      placed.push(box);
      return {
        labelLeft: box.left,
        labelTop: box.top,
        labelWidth: boxWidth,
        labelTextAlign: align,
        labelAnchorX,
        labelAnchorY,
      };
    }
    labelRadius += LABEL_RADIUS_STEP;
  }

  let fallback = clampLabelBox(
    labelBoxFromAnchor(
      cx + labelRadius * Math.sin(angle),
      cy - labelRadius * Math.cos(angle),
      align,
      boxWidth,
    ),
    canvasSize,
  );
  while (
    (boxOverlapsPlot(fallback, cx, cy, plotRadius) ||
      placed.some((p) => boxesOverlap(fallback, p))) &&
    labelRadius <= maxRadius
  ) {
    labelRadius += LABEL_RADIUS_STEP;
    fallback = clampLabelBox(
      labelBoxFromAnchor(
        cx + labelRadius * Math.sin(angle),
        cy - labelRadius * Math.cos(angle),
        align,
        boxWidth,
      ),
      canvasSize,
    );
  }
  placed.push(fallback);
  return {
    labelLeft: fallback.left,
    labelTop: fallback.top,
    labelWidth: boxWidth,
    labelTextAlign: align,
    labelAnchorX,
    labelAnchorY,
  };
}

function radiusBand(plotRadius: number): {
  innerR: number;
  outerR: number;
  span: number;
} {
  const innerR = plotRadius * INNER_RADIUS_RATIO;
  const outerR = plotRadius;
  return { innerR, outerR, span: outerR - innerR };
}

/** Map % change into the inner–outer band: `-scaleMax` at inner ring, `0` at mid, `+scaleMax` at outer. */
function radiusForPctChange(
  pct: number,
  scaleMaxPct: number,
  plotRadius: number,
): number {
  const { innerR, span } = radiusBand(plotRadius);
  const scaleMin = -scaleMaxPct;
  const spanPct = scaleMaxPct - scaleMin;
  const t = (pct - scaleMin) / spanPct;
  return innerR + t * span;
}

function radiusForBandT(t: number, plotRadius: number): number {
  const { innerR, span } = radiusBand(plotRadius);
  return innerR + t * span;
}

function pointOnSpoke(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): LaborSectorRadarScaleLabel {
  return {
    x: cx + radius * Math.sin(angle),
    y: cy - radius * Math.cos(angle),
  };
}

/**
 * Radar chart: one spoke per sector; signed % change vs period start (0% on the mid ring).
 */
export function buildLaborSectorRadarChartModel(
  response: EconomySectorResponse,
  width: number,
): LaborSectorRadarChartModel | null {
  const lineModel = buildLaborSectorLineChartModel(response, width);
  if (!lineModel || lineModel.lines.length < 3) {
    return null;
  }

  const spokesData = lineModel.lines;
  const count = spokesData.length;
  const labelMargin = Math.max(54, 36 + count * 4);
  const canvasSize = Math.max(Math.min(width, 360), 260);
  const plotDiameter = Math.min(
    canvasSize - labelMargin * 2,
    CHART_PLOT_MAX,
    canvasSize * 0.62,
  );
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const plotRadius = plotDiameter / 2 - 10;

  let scaleMaxPct = MIN_SCALE_PCT;
  for (const s of spokesData) {
    scaleMaxPct = Math.max(scaleMaxPct, Math.abs(s.latestPctChange));
  }
  const scaleMinPct = -scaleMaxPct;
  const { innerR, outerR } = radiusBand(plotRadius);
  const zeroRingRadius = radiusForPctChange(0, scaleMaxPct, plotRadius);
  const labelSpokeAngle = spokeAngle(0, count);

  const placedLabelBoxes: LabelBox[] = [];
  const labelById = new Map<string, ReturnType<typeof layoutSpokeLabel>>();
  const layoutOrder = [...spokesData]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.label.length - a.s.label.length);

  for (const { s, i } of layoutOrder) {
    labelById.set(
      s.id,
      layoutSpokeLabel(
        spokeAngle(i, count),
        s.label,
        cx,
        cy,
        plotRadius,
        canvasSize,
        placedLabelBoxes,
      ),
    );
  }

  const spokes: LaborSectorRadarSpoke[] = spokesData.map((s, i) => {
    const angle = spokeAngle(i, count);
    const r = radiusForPctChange(s.latestPctChange, scaleMaxPct, plotRadius);
    const vertexX = cx + r * Math.sin(angle);
    const vertexY = cy - r * Math.cos(angle);
    const labelLayout = labelById.get(s.id)!;
    return {
      id: s.id,
      label: s.label,
      color: s.color,
      pctChange: s.latestPctChange,
      vertexX,
      vertexY,
      labelLeft: labelLayout.labelLeft,
      labelTop: labelLayout.labelTop,
      labelWidth: labelLayout.labelWidth,
      labelTextAlign: labelLayout.labelTextAlign,
      labelAnchorX: labelLayout.labelAnchorX,
      labelAnchorY: labelLayout.labelAnchorY,
    };
  });

  const polygonPoints = spokes
    .map((s) => `${s.vertexX},${s.vertexY}`)
    .join(" ");

  const gridRings: LaborSectorRadarGridRing[] = GRID_T_FRACTIONS.map((t) => ({
    fraction: t,
    points: ringPolygonPoints(cx, cy, radiusForBandT(t, plotRadius), count),
  }));
  const zeroRing = {
    fraction: 0.5,
    points: ringPolygonPoints(cx, cy, zeroRingRadius, count),
  };
  const innerFloorRing = {
    fraction: 0,
    points: ringPolygonPoints(cx, cy, innerR, count),
  };

  const axisLines = spokes.map((_, i) => {
    const a = spokeAngle(i, count);
    return {
      x1: cx + innerR * Math.sin(a),
      y1: cy - innerR * Math.cos(a),
      x2: cx + outerR * Math.sin(a),
      y2: cy - outerR * Math.cos(a),
    };
  });

  const scaleLabels = {
    max: pointOnSpoke(cx, cy, outerR, labelSpokeAngle),
    zero: pointOnSpoke(cx, cy, zeroRingRadius, labelSpokeAngle),
    min: pointOnSpoke(cx, cy, innerR, labelSpokeAngle),
  };

  return {
    size: canvasSize,
    cx,
    cy,
    plotRadius,
    innerPlotRadius: innerR,
    zeroRingRadius,
    scaleMaxPct,
    scaleMinPct,
    zeroRing,
    innerFloorRing,
    polygonPoints,
    spokes,
    gridRings,
    axisLines,
    scaleLabels,
    chartSubtitle: lineModel.chartSubtitle,
  };
}

export { formatSectorPctChange };
