import type { ReportStatus } from "@prisma/client";

// Allowed transitions. Terminal states map to an empty array.
export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["TRIAGED", "REJECTED", "DUPLICATE"],
  TRIAGED: ["ACCEPTED", "REJECTED", "DUPLICATE"],
  ACCEPTED: ["PAID"],
  PAID: [],
  REJECTED: [],
  DUPLICATE: [],
};

export function canTransition(
  from: ReportStatus,
  to: ReportStatus,
): boolean {
  return REPORT_TRANSITIONS[from].includes(to);
}

// Which timestamp column a transition into `to` should stamp.
export function timestampField(
  to: ReportStatus,
): "submittedAt" | "resolvedAt" | "paidAt" | null {
  switch (to) {
    case "SUBMITTED":
      return "submittedAt";
    case "ACCEPTED":
    case "REJECTED":
    case "DUPLICATE":
      return "resolvedAt";
    case "PAID":
      return "paidAt";
    default:
      return null;
  }
}
