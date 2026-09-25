export type SlaState = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "DISCLOSED";

export const DEFAULT_DISCLOSURE_DAYS = 90;
export const DUE_SOON_THRESHOLD_DAYS = 14;

export interface SlaInput {
  submittedAt: Date | null;
  disclosureDeadline?: Date | null;
  disclosedAt?: Date | null;
  now?: Date;
}

export interface SlaResult {
  daysElapsed: number;
  daysRemaining: number;
  deadline: Date | null;
  slaState: SlaState;
}

const DAY_MS = 86_400_000;

/**
 * Compute the coordinated-disclosure clock for a VDP report.
 *  - Policy default is 90 days from submittedAt; disclosureDeadline overrides.
 *  - DUE_SOON when 14 days or fewer remain (and not yet overdue/disclosed).
 *  - OVERDUE when the deadline has passed.
 *  - DISCLOSED whenever disclosedAt is set, regardless of the clock.
 */
export function computeSla(input: SlaInput): SlaResult {
  const now = input.now ?? new Date();

  if (input.disclosedAt) {
    const elapsed = input.submittedAt
      ? Math.floor((now.getTime() - input.submittedAt.getTime()) / DAY_MS)
      : 0;
    return {
      daysElapsed: elapsed,
      daysRemaining: 0,
      deadline: input.disclosureDeadline ?? null,
      slaState: "DISCLOSED",
    };
  }

  if (!input.submittedAt) {
    return {
      daysElapsed: 0,
      daysRemaining: DEFAULT_DISCLOSURE_DAYS,
      deadline: null,
      slaState: "ON_TRACK",
    };
  }

  const deadline =
    input.disclosureDeadline ??
    new Date(input.submittedAt.getTime() + DEFAULT_DISCLOSURE_DAYS * DAY_MS);

  const daysElapsed = Math.floor(
    (now.getTime() - input.submittedAt.getTime()) / DAY_MS,
  );
  // Whole days remaining, rounded down; a deadline in the past is negative.
  const daysRemaining = Math.floor((deadline.getTime() - now.getTime()) / DAY_MS);

  let slaState: SlaState;
  if (daysRemaining < 0) {
    slaState = "OVERDUE";
  } else if (daysRemaining <= DUE_SOON_THRESHOLD_DAYS) {
    slaState = "DUE_SOON";
  } else {
    slaState = "ON_TRACK";
  }

  return { daysElapsed, daysRemaining, deadline, slaState };
}
