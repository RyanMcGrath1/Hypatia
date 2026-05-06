export const LABOR_PAYROLL_MONTHS = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

/** Relative bar heights (last = December highlight). */
export const LABOR_PAYROLL_RELATIVE = [0.42, 0.5, 0.46, 0.54, 0.58, 0.62, 1];

export type LaborEmploymentSectorRow = {
  sector: string;
  delta: string;
  deltaPositive: boolean | null;
  growth: string;
  growthPositive: boolean | null;
  barFill: number;
  barNegative?: boolean;
};

export const LABOR_EMPLOYMENT_BY_SECTOR: LaborEmploymentSectorRow[] = [
  { sector: "Government", delta: "+52k", deltaPositive: true, growth: "+1.2%", growthPositive: true, barFill: 0.92 },
  {
    sector: "Leisure & Hospitality",
    delta: "+40k",
    deltaPositive: true,
    growth: "+0.9%",
    growthPositive: true,
    barFill: 0.75,
  },
  { sector: "Health Care", delta: "+38k", deltaPositive: true, growth: "+0.8%", growthPositive: true, barFill: 0.7 },
  { sector: "Manufacturing", delta: "0k", deltaPositive: null, growth: "0.0%", growthPositive: null, barFill: 0.08 },
  {
    sector: "Transportation",
    delta: "-23k",
    deltaPositive: false,
    growth: "-0.5%",
    growthPositive: false,
    barFill: 0.35,
    barNegative: true,
  },
];
