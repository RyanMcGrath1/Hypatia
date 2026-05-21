/**
 * When true, UI should show skeleton placeholders instead of error copy or spinners.
 * Used when the backend is unreachable or a fetch failed before any data was cached.
 */
export function isEconomyDataPending(args: {
  isLoading: boolean;
  error: string | null | undefined;
  hasData: boolean;
}): boolean {
  if (args.hasData) {
    return false;
  }
  return args.isLoading || Boolean(args.error);
}
