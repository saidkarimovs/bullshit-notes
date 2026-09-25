// Helpers for the from/to windows every stats/analytics endpoint accepts.
// Default window is the last 90 days.

export interface DateRange {
  from: Date;
  to: Date;
}

export const DEFAULT_WINDOW_DAYS = 90;

export function resolveRange(from?: string, to?: string): DateRange {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Invalid from/to date");
  }
  return { from: fromDate, to: toDate };
}

export type Bucket = "day" | "week" | "month";

// Postgres date_trunc unit for a given bucket.
export function truncUnit(bucket: Bucket): string {
  return bucket; // date_trunc accepts 'day' | 'week' | 'month'
}

// generate_series step for a given bucket.
export function seriesStep(bucket: Bucket): string {
  return bucket === "day" ? "1 day" : bucket === "week" ? "1 week" : "1 month";
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
