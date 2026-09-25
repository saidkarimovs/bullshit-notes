import { z } from "zod";

export const PAYLOAD_CATEGORIES = [
  "XSS",
  "SQLI",
  "SSTI",
  "SSRF",
  "XXE",
  "RCE",
  "LFI",
  "IDOR",
  "CSRF",
  "JWT",
  "DESERIALIZATION",
  "RECON",
  "BYPASS",
  "OTHER",
] as const;

export const payloadCategorySchema = z.enum(PAYLOAD_CATEGORIES);

export const payloadQuerySchema = z.object({
  category: payloadCategorySchema.optional(),
  q: z.string().optional(),
});
export type PayloadQuery = z.infer<typeof payloadQuerySchema>;

export const createPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  category: payloadCategorySchema,
  body: z.string().min(1),
  language: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  source: z.string().max(500).optional(),
});
export type CreatePayloadInput = z.infer<typeof createPayloadSchema>;

export const updatePayloadSchema = createPayloadSchema.partial();
export type UpdatePayloadInput = z.infer<typeof updatePayloadSchema>;

export const renderPayloadSchema = z.object({
  vars: z.record(z.string()).default({}),
});
export type RenderPayloadInput = z.infer<typeof renderPayloadSchema>;
