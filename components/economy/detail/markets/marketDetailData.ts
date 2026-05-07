/** Mock market dashboard — aligns with Market Reaction reference layout. */

export const MARKET_CORRELATION_LABELS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "16:30",
] as const;

/** Normalized 0–1 for charting (S&P 500). */
export const MARKET_SPX_NORM = [0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.56, 0.6, 0.64] as const;

/** Normalized 0–1 (US 10Y yield) — inverse to SPX in the mock. */
export const MARKET_US10Y_NORM = [0.74, 0.7, 0.66, 0.6, 0.56, 0.52, 0.48, 0.44, 0.4] as const;

export const MARKET_SPX_VALUE = "5,137.08";
export const MARKET_SPX_CHANGE = "+1.24%";
export const MARKET_SPX_PREV = "5,074.12";

export const MARKET_UST_VALUE = "4.215%";
export const MARKET_UST_CHANGE = "-0.084";
export const MARKET_UST_RANGE = "4.19 – 4.25";

export const MARKET_YIELD_LABELS = ["2Y", "5Y", "10Y", "30Y"] as const;

/** Normalized curve heights (inverted curve). */
export const MARKET_YIELD_CURRENT = [0.88, 0.62, 0.52, 0.48] as const;
export const MARKET_YIELD_PRIOR = [0.78, 0.6, 0.55, 0.52] as const;

export type MarketCalendarRow = {
  event: string;
  time: string;
  exp: string;
  prev: string;
  highlight?: boolean;
};

export const MARKET_CALENDAR_ROWS: MarketCalendarRow[] = [
  { event: "Retail Sales MoM", time: "08:30", exp: "0.4%", prev: "0.6%" },
  { event: "Core PPI MoM", time: "08:30", exp: "0.2%", prev: "0.5%" },
  {
    event: "FOMC Int. Rate Decision",
    time: "14:00",
    exp: "5.50%",
    prev: "5.50%",
    highlight: true,
  },
  { event: "Philly Fed Mfg Index", time: "08:30", exp: "-8.0", prev: "-10.6" },
];

export const MARKET_VIX_VALUE = "13.84";
/** Normalized sparkline points 0–1. */
export const MARKET_VIX_SPARK = [0.45, 0.42, 0.48, 0.44, 0.5, 0.46, 0.52, 0.48, 0.55, 0.5, 0.58, 0.52] as const;

export const MARKET_DXY_VALUE = "104.12";
export const MARKET_DXY_CHANGE = "-0.31%";

export const MARKET_SENTIMENT_BULL = 65;
export const MARKET_SENTIMENT_BEAR = 35;
