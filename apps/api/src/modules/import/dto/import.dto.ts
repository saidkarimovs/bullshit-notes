import { z } from "zod";
import { assetKindSchema } from "@bn/shared";

// nuclei -jsonl record (only the fields we consume).
export const nucleiResultSchema = z
  .object({
    "template-id": z.string().optional(),
    templateID: z.string().optional(),
    host: z.string().optional(),
    "matched-at": z.string().optional(),
    info: z
      .object({
        name: z.string().optional(),
        severity: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export const importNucleiSchema = z.object({
  projectId: z.string().min(1),
  results: z.array(nucleiResultSchema).min(1),
});
export type ImportNucleiInput = z.infer<typeof importNucleiSchema>;

export const importReconSchema = z.object({
  projectId: z.string().min(1),
  kind: assetKindSchema,
  lines: z.array(z.string()).min(1),
});
export type ImportReconInput = z.infer<typeof importReconSchema>;
