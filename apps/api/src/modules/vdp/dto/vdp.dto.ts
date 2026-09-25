import { z } from "zod";

export const vdpEventKindSchema = z.enum([
  "REPORTED",
  "ACK",
  "TRIAGE_UPDATE",
  "FIX_PLANNED",
  "FIX_SHIPPED",
  "DISCLOSURE_REQUESTED",
  "DISCLOSED",
  "EXTENSION_GRANTED",
  "NO_RESPONSE",
]);

export const createEventSchema = z.object({
  kind: vdpEventKindSchema,
  body: z.string().max(10_000).default(""),
  occurredAt: z.string().optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const extendSchema = z.object({
  days: z.coerce.number().int().min(1).max(365),
  reason: z.string().max(2000).default(""),
});
export type ExtendInput = z.infer<typeof extendSchema>;

export const discloseSchema = z.object({
  publicUrl: z.string().url().optional(),
});
export type DiscloseInput = z.infer<typeof discloseSchema>;

export const createContactSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.string().max(120).optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial().extend({
  lastContactedAt: z.string().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
