import { z } from "zod";
import {
  paginationQuerySchema,
  projectStatusSchema,
  projectTypeSchema,
} from "./common.schema";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: projectTypeSchema,
  status: projectStatusSchema.optional(),
  platform: z.string().max(120).optional(),
  programUrl: z.string().url().optional(),
  scopeNotesMd: z.string().default(""),
  payoutMin: z.number().int().nonnegative().optional(),
  payoutMax: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  nda: z.boolean().default(false),
  startedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  closedAt: z.coerce.date().optional().nullable(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectQuerySchema = paginationQuerySchema.extend({
  type: projectTypeSchema.optional(),
  status: projectStatusSchema.optional(),
  platform: z.string().optional(),
});
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
