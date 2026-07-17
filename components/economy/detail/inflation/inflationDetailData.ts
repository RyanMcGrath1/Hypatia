export type InflationCpiObservation = {
  date: string;
  value: number;
};

export type InflationCpiResponse = {
  as_of: string;
  label: string;
  observations: InflationCpiObservation[];
  series_id: string;
  unit: string;
};

export type InflationMetricRow = {
  metric: string;
  latest: string;
  previous: string;
  delta: string;
};

export const INFLATION_METRIC_TABLE: InflationMetricRow[] = [
  { metric: "CPI (Headline)", latest: "311.08", previous: "308.42", delta: "+2.66" },
  { metric: "Core CPI (Excl. Food/Energy)", latest: "314.54", previous: "313.22", delta: "+1.32" },
  { metric: "Producer Price Index (PPI)", latest: "142.10", previous: "141.40", delta: "+0.70" },
  { metric: "Export Price Index", latest: "128.90", previous: "127.80", delta: "+1.10" },
];

export type InflationComponentCard = {
  id: string;
  icon: "home" | "restaurant" | "flash" | "briefcase";
  title: string;
  weightPct: string;
  yoy: string;
  yoyPositive: boolean | null;
  contribution: string;
};

export const INFLATION_CPI_COMPONENTS: InflationComponentCard[] = [
  {
    id: "shelter",
    icon: "home",
    title: "Shelter",
    weightPct: "36.2",
    yoy: "6.0%",
    yoyPositive: false,
    contribution: "+2.1pp",
  },
  {
    id: "food",
    icon: "restaurant",
    title: "Food",
    weightPct: "13.6",
    yoy: "2.2%",
    yoyPositive: true,
    contribution: "+0.3pp",
  },
  {
    id: "energy",
    icon: "flash",
    title: "Energy",
    weightPct: "6.9",
    yoy: "-1.7%",
    yoyPositive: true,
    contribution: "-0.1pp",
  },
  {
    id: "core-services",
    icon: "briefcase",
    title: "Core Services",
    weightPct: "27.1",
    yoy: "4.9%",
    yoyPositive: false,
    contribution: "+1.2pp",
  },
];

/** Scale max for PCE bars (approx %). */
export const INFLATION_PCE_SCALE_MAX = 3.5;

export const INFLATION_PCE_HEADLINE = 2.4;
export const INFLATION_PCE_CORE = 2.8;
export const INFLATION_PCE_TARGET = 2.0;
