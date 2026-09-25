import { z } from "zod";
import {
  paginationQuerySchema,
  reportStatusSchema,
  reportTypeSchema,
  severitySchema,
} from "./common.schema";

export const createReportSchema = z.object({
  title: z.string().min(1).max(300),
  type: reportTypeSchema,
  severity: severitySchema.optional(),
  cvssVector: z.string().optional(),
  cweId: z.string().optional(),
  cveId: z.string().optional(),
  bodyMd: z.string().default(""),
  projectId: z.string().optional().nullable(),
  bountyAmount: z.number().optional().nullable(),
  bountyCurrency: z.string().optional().nullable(),
  platformRef: z.string().optional().nullable(),
  disclosureDeadline: z.coerce.date().optional().nullable(),
  tags: z.array(z.string()).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportSchema = createReportSchema.partial();
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

export const reportStatusChangeSchema = z.object({
  toStatus: reportStatusSchema,
  note: z.string().optional(),
  duplicateOfId: z.string().optional(),
});
export type ReportStatusChangeInput = z.infer<typeof reportStatusChangeSchema>;

export const reportQuerySchema = paginationQuerySchema.extend({
  type: reportTypeSchema.optional(),
  status: reportStatusSchema.optional(),
  severity: severitySchema.optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
