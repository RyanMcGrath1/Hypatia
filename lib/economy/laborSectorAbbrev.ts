/** Short tile labels for the labor sector heatmap (max ~4 chars). */
const BY_SERIES_ID: Record<string, string> = {
  USPBS: "BUS",
  USEHS: "HLTH",
  USLAH: "LEIS",
  USTRADE: "RET",
  MANEMP: "MFG",
  USFIRE: "FIN",
  USCONS: "CON",
  USINFO: "INFO",
  USGOVT: "GOV",
  USTPU: "TRN",
  USWTRADE: "WHS",
  USMINE: "MINE",
  USUTIL: "UTIL",
  USSERV: "SVC",
};

function abbrevFromName(name: string): string {
  const words = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0);
  if (words.length === 0) {
    return name.slice(0, 4).toUpperCase();
  }
  if (words.length === 1) {
    return words[0]!.slice(0, 4).toUpperCase();
  }
  return `${words[0]!.slice(0, 2)}${words[1]!.slice(0, 2)}`.toUpperCase();
}

export function laborSectorAbbrev(series: { id: string; name: string }): string {
  const byId = BY_SERIES_ID[series.id.trim().toUpperCase()];
  if (byId) {
    return byId;
  }
  return abbrevFromName(series.name);
}
