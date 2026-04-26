export type SectorTrend = 'up' | 'down' | 'flat';

export type SectorMetric = {
  label: string;
  value: string;
  note: string;
};

export type EconomicPulseSeries = {
  label: string;
  values: number[];
  color: string;
};

export type EconomyKpi = {
  id: string;
  label: string;
  value: string;
  context: string;
};

export type EconomicSector = {
  id: string;
  title: string;
  headlineLabel: string;
  headlineValue: string;
  trend: SectorTrend;
  trendLabel: string;
  summary: string;
  interpretation: string;
  metrics: SectorMetric[];
  updatedAt: string;
};

export const US_ECONOMIC_SECTORS: EconomicSector[] = [
  {
    id: 'inflation',
    title: 'Inflation',
    headlineLabel: 'CPI (YoY)',
    headlineValue: '3.2%',
    trend: 'down',
    trendLabel: 'Cooling from prior quarter',
    summary: 'Price growth remains above target but is easing relative to last year.',
    interpretation:
      'Disinflation is progressing, though shelter and services costs are still sticky.',
    metrics: [
      { label: 'Core CPI', value: '3.5%', note: 'Ex-food and energy' },
      { label: 'PCE Inflation', value: '2.8%', note: 'Fed preferred gauge' },
      { label: 'Energy CPI', value: '-0.9%', note: 'Lower than last month' },
    ],
    updatedAt: 'Apr 2026',
  },
  {
    id: 'labor',
    title: 'Labor Market',
    headlineLabel: 'Unemployment Rate',
    headlineValue: '4.0%',
    trend: 'flat',
    trendLabel: 'Stable labor conditions',
    summary: 'Hiring continues at a moderate pace with resilient participation.',
    interpretation:
      'Labor demand is softening from peak levels but remains historically healthy.',
    metrics: [
      { label: 'Nonfarm Payrolls', value: '+175K', note: 'Latest monthly change' },
      { label: 'Labor Participation', value: '62.7%', note: 'Prime-age improving' },
      { label: 'Avg Hourly Earnings', value: '+4.1%', note: 'Year-over-year' },
    ],
    updatedAt: 'Apr 2026',
  },
  {
    id: 'gdp',
    title: 'GDP Growth',
    headlineLabel: 'Real GDP (QoQ annualized)',
    headlineValue: '2.1%',
    trend: 'up',
    trendLabel: 'Re-accelerating modestly',
    summary: 'Output growth remains positive, supported by services and business spending.',
    interpretation:
      'The economy is expanding at a sustainable pace rather than overheating.',
    metrics: [
      { label: 'Consumer Contribution', value: '1.3pp', note: 'To quarterly growth' },
      { label: 'Business Investment', value: '+3.0%', note: 'Equipment and software' },
      { label: 'Net Exports', value: '-0.2pp', note: 'Drag on growth' },
    ],
    updatedAt: 'Q1 2026',
  },
  {
    id: 'rates',
    title: 'Interest Rates',
    headlineLabel: 'Fed Funds Target',
    headlineValue: '5.25% - 5.50%',
    trend: 'flat',
    trendLabel: 'Holding restrictive stance',
    summary: 'Policy rates remain elevated while officials monitor inflation progress.',
    interpretation:
      'Financial conditions are tight, and future moves depend on incoming data.',
    metrics: [
      { label: '10Y Treasury', value: '4.3%', note: 'Benchmark long rate' },
      { label: '30Y Mortgage', value: '6.8%', note: 'Constrained affordability' },
      { label: '2Y Treasury', value: '4.7%', note: 'Policy-sensitive yield' },
    ],
    updatedAt: 'Apr 2026',
  },
  {
    id: 'housing',
    title: 'Housing',
    headlineLabel: 'Existing Home Sales',
    headlineValue: '4.2M',
    trend: 'down',
    trendLabel: 'Soft transaction volume',
    summary: 'Higher mortgage rates continue to suppress turnover in existing homes.',
    interpretation:
      'Inventory is gradually improving, but affordability remains the main constraint.',
    metrics: [
      { label: 'Median Home Price', value: '$390K', note: 'Up 3.9% YoY' },
      { label: 'Housing Starts', value: '1.45M', note: 'Annualized pace' },
      { label: 'Months Supply', value: '3.3', note: 'Still below balanced market' },
    ],
    updatedAt: 'Mar 2026',
  },
  {
    id: 'consumer',
    title: 'Consumer Spending',
    headlineLabel: 'Real Consumption (MoM)',
    headlineValue: '+0.3%',
    trend: 'up',
    trendLabel: 'Moderate household demand',
    summary: 'Spending growth is positive, led by services and travel categories.',
    interpretation:
      'Households are still spending, though credit-sensitive categories are slowing.',
    metrics: [
      { label: 'Retail Sales', value: '+0.5%', note: 'Monthly headline change' },
      { label: 'Personal Savings Rate', value: '4.2%', note: 'Below long-run average' },
      { label: 'Consumer Sentiment', value: '74.8', note: 'Improved from prior month' },
    ],
    updatedAt: 'Apr 2026',
  },
];

export const ECONOMIC_PULSE_MONTH_LABELS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

/**
 * Indexed trend lines (Nov = 100) for at-a-glance visual comparison.
 * This avoids mixing incompatible units (percent, level, and annualized rates)
 * while still preserving directional context for each macro signal.
 */
export const ECONOMIC_PULSE_SERIES: EconomicPulseSeries[] = [
  {
    label: 'Inflation',
    values: [100, 101, 100, 99, 98, 97],
    color: '#ef4444',
  },
  {
    label: 'Labor',
    values: [100, 100, 101, 101, 102, 102],
    color: '#22c55e',
  },
  {
    label: 'GDP',
    values: [100, 99, 100, 101, 102, 103],
    color: '#3b82f6',
  },
  {
    label: 'Policy Rate',
    values: [100, 100, 100, 100, 100, 100],
    color: '#a855f7',
  },
];

export const ECONOMY_KPIS: EconomyKpi[] = [
  { id: 'inflation', label: 'Inflation', value: '3.2%', context: 'CPI YoY' },
  { id: 'jobs', label: 'Jobs', value: '+175K', context: 'Nonfarm payrolls' },
  { id: 'rates', label: 'Rates', value: '5.25%-5.50%', context: 'Fed funds target' },
];

export const ECONOMY_DATA_SOURCE = 'Local macro sample dataset (mock)';
export const ECONOMY_LAST_REFRESH = 'Apr 2026';

export function getEconomicSectorById(id: string): EconomicSector | null {
  return US_ECONOMIC_SECTORS.find((sector) => sector.id === id) ?? null;
}
