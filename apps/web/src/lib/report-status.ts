import type { ReportStatus } from "@/types/api";

export const allowedTransitions: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["TRIAGED", "REJECTED", "DUPLICATE"],
  TRIAGED: ["ACCEPTED", "REJECTED", "DUPLICATE"],
  ACCEPTED: ["PAID"],
  PAID: [], REJECTED: [], DUPLICATE: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus) {
  return allowedTransitions[from].includes(to);
}
