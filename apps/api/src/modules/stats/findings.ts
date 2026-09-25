import { SEVERITIES } from "./stats.constants";
import type { Bucket } from "../../lib/date-range";

export interface FindingsBucket {
  date: string;
  INFO: number;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

export interface SparseFinding {
  date: string; // bucket start, YYYY-MM-DD
  severity: string;
  count: number;
}

// Enumerate every bucket start between from and to (inclusive of the bucket
// that contains `to`). Production uses SQL generate_series; this mirrors the
// exact same contract for the unit tests and as a pure fallback.
export function enumerateBuckets(from: Date, to: Date, bucket: Bucket): string[] {
  const out: string[] = [];
  let cur = truncate(from, bucket);
  const end = truncate(to, bucket);
  let guard = 0;
  while (cur.getTime() <= end.getTime() && guard < 10_000) {
    out.push(cur.toISOString().slice(0, 10));
    cur = advance(cur, bucket);
    guard += 1;
  }
  return out;
}

// Fold sparse (date, severity, count) rows into a dense, zero-filled series
// with one object per bucket and all five severities present.
export function zeroFillFindings(
  buckets: string[],
  rows: SparseFinding[],
): FindingsBucket[] {
  const index = new Map<string, FindingsBucket>();
  for (const date of buckets) {
    index.set(date, {
      date,
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    });
  }
  for (const row of rows) {
    const target = index.get(row.date);
    if (!target) continue;
    if ((SEVERITIES as string[]).includes(row.severity)) {
      target[row.severity as keyof Omit<FindingsBucket, "date">] += row.count;
    }
  }
  return buckets.map((d) => index.get(d)!);
}

function truncate(d: Date, bucket: Bucket): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  if (bucket === "month") {
    return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), 1));
  }
  if (bucket === "week") {
    // ISO week: Monday start.
    const day = (x.getUTCDay() + 6) % 7;
    return new Date(x.getTime() - day * 86_400_000);
  }
  return x;
}

function advance(d: Date, bucket: Bucket): Date {
  if (bucket === "month") {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  const step = bucket === "week" ? 7 : 1;
  return new Date(d.getTime() + step * 86_400_000);
}
