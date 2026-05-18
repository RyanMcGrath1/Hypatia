/**
 * Short (1–2 word) labels for labor sector rows — readable at a glance in the
 * EMPLOYMENT BY SECTOR table. Keys are FRED series ids from `/api/economy/labor/sector`.
 */
const BY_SERIES_ID: Record<string, string> = {
  PAYEMS: "Total Jobs",
  USPBS: "Business",
  USEHS: "Healthcare",
  USLAH: "Hospitality",
  USTRADE: "Retail",
  MANEMP: "Manufacturing",
  USFIRE: "Finance",
  USCONS: "Construction",
  USINFO: "Information",
  USGOVT: "Government",
  GVT: "Government",
  USTPU: "Transportation",
  USWTRADE: "Wholesale",
  USMINE: "Mining",
  USUTIL: "Utilities",
  USSERV: "Other Services",
};

/** Fallback when the API name differs slightly from FRED titles. */
const BY_FULL_NAME: Record<string, string> = {
  "total nonfarm payrolls": "Total Jobs",
  "professional & business services": "Business",
  "professional and business services": "Business",
  "education & health services": "Healthcare",
  "education and health services": "Healthcare",
  "leisure & hospitality": "Hospitality",
  "leisure and hospitality": "Hospitality",
  "retail trade": "Retail",
  manufacturing: "Manufacturing",
  "financial activities": "Finance",
  construction: "Construction",
  "information sector": "Information",
  information: "Information",
  government: "Government",
  transportation: "Transportation",
  "transportation and warehousing": "Transportation",
  "wholesale trade": "Wholesale",
  mining: "Mining",
  utilities: "Utilities",
  "other services": "Other Services",
};

const DROP_WORDS = new Set([
  "and",
  "&",
  "the",
  "of",
  "for",
  "sector",
  "services",
  "service",
  "activities",
  "activity",
  "trade",
  "payrolls",
  "payroll",
  "total",
  "nonfarm",
]);

function shortenFromWords(fullName: string): string {
  const tokens = fullName
    .replace(/&/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0 && !DROP_WORDS.has(w.toLowerCase()));

  if (tokens.length === 0) {
    const fallback = fullName.trim().split(/\s+/).slice(0, 2);
    return fallback.join(" ") || fullName;
  }
  if (tokens.length === 1) {
    return tokens[0]!;
  }
  return `${tokens[0]} ${tokens[1]}`;
}

/** User-facing sector label (max ~2 words) for table and chart legends. */
export function laborSectorDisplayName(series: {
  id: string;
  name: string;
}): string {
  const byId = BY_SERIES_ID[series.id.trim().toUpperCase()];
  if (byId) {
    return byId;
  }
  const byName = BY_FULL_NAME[series.name.trim().toLowerCase()];
  if (byName) {
    return byName;
  }
  return shortenFromWords(series.name);
}
