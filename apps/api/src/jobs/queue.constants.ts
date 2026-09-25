import type { JobsOptions } from "bullmq";

// Canonical queue names. Every producer/consumer imports these constants
// rather than hard-coding strings.
export const QUEUE_NAMES = {
  CVE_SYNC: "cve-sync",
  PDF_RENDER: "pdf-render",
  SLA_CHECK: "sla-check",
  WEBHOOK_DISPATCH: "webhook-dispatch",
  NOTE_EMBED: "note-embed",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES);

// DI tokens for injecting a specific Queue instance.
export const QUEUE_TOKEN = {
  CVE_SYNC: "QUEUE_CVE_SYNC",
  PDF_RENDER: "QUEUE_PDF_RENDER",
  SLA_CHECK: "QUEUE_SLA_CHECK",
  WEBHOOK_DISPATCH: "QUEUE_WEBHOOK_DISPATCH",
  NOTE_EMBED: "QUEUE_NOTE_EMBED",
} as const;

// Default job options shared by every queue.
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};
