import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "report.created",
  "report.status_changed",
  "report.paid",
  "cve.watch_match",
  "vdp.sla_warning",
  "vdp.overdue",
  "asset.new",
] as const;

export const webhookKindSchema = z.enum([
  "DISCORD",
  "SLACK",
  "TELEGRAM",
  "GENERIC",
]);

export const createWebhookSchema = z.object({
  url: z.string().url(),
  kind: webhookKindSchema,
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  secret: z.string().min(1).optional(),
});
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  kind: webhookKindSchema.optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  active: z.boolean().optional(),
  secret: z.string().min(1).optional(),
});
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
