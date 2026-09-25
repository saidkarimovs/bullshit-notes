import { FUNNEL_STAGES, STATUS_REACHED, type FunnelStage } from "./stats.constants";

export interface FunnelRow {
  status: FunnelStage;
  count: number;
  dropOffPct: number;
}

// Given raw per-status counts (as stored on Report.status), roll them up into
// the cumulative funnel and compute stage-to-stage drop-off.
//   dropOffPct = (prev - current) / prev * 100, and 0 for the first stage.
export function computeFunnel(
  statusCounts: Record<string, number>,
): FunnelRow[] {
  const cumulative: Record<FunnelStage, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    TRIAGED: 0,
    ACCEPTED: 0,
    PAID: 0,
  };

  for (const [status, count] of Object.entries(statusCounts)) {
    const reached = STATUS_REACHED[status] ?? [];
    for (const stage of reached) {
      cumulative[stage] += count;
    }
  }

  const rows: FunnelRow[] = [];
  let prev: number | null = null;
  for (const stage of FUNNEL_STAGES) {
    const count = cumulative[stage];
    let dropOffPct = 0;
    if (prev !== null && prev > 0) {
      dropOffPct = ((prev - count) / prev) * 100;
    }
    rows.push({
      status: stage,
      count,
      dropOffPct: Math.round(dropOffPct * 100) / 100,
    });
    prev = count;
  }
  return rows;
}
