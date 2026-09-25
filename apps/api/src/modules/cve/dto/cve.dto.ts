import { z } from "zod";
import { severitySchema } from "@bn/shared";

export const cveQuerySchema = z.object({
  q: z.string().optional(),
  severity: severitySchema.optional(),
  isKev: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});
export type CveQuery = z.infer<typeof cveQuerySchema>;

export const cveWatchKindSchema = z.enum([
  "VENDOR",
  "PRODUCT",
  "KEYWORD",
  "CWE",
]);

export const createWatchSchema = z.object({
  keyword: z.string().min(1).max(200),
  kind: cveWatchKindSchema,
});
export type CreateWatchInput = z.infer<typeof createWatchSchema>;

export const createBookmarkSchema = z.object({
  cveId: z.string().min(1).max(50),
  notes: z.string().max(5000).optional(),
});
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
