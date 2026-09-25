import type { Severity } from "@prisma/client";

export const SEVERITIES: Severity[] = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

// The funnel is a fixed, ordered subset of the status lifecycle.
export const FUNNEL_STAGES = [
  "DRAFT",
  "SUBMITTED",
  "TRIAGED",
  "ACCEPTED",
  "PAID",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

// A report that has *reached* a stage also counts toward every earlier stage
// it necessarily passed through. This ordering drives that cumulative count.
export const STATUS_REACHED: Record<string, FunnelStage[]> = {
  DRAFT: ["DRAFT"],
  SUBMITTED: ["DRAFT", "SUBMITTED"],
  TRIAGED: ["DRAFT", "SUBMITTED", "TRIAGED"],
  ACCEPTED: ["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED"],
  PAID: ["DRAFT", "SUBMITTED", "TRIAGED", "ACCEPTED", "PAID"],
  // Terminal off-ramps still passed through the earlier stages.
  DUPLICATE: ["DRAFT", "SUBMITTED"],
  REJECTED: ["DRAFT", "SUBMITTED"],
};
