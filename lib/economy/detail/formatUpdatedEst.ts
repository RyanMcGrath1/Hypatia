/** Current time in Eastern for “UPDATED … EST” dashboard stamps. */
export function formatUpdatedEst(): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    });
  } catch {
    return "—";
  }
}
