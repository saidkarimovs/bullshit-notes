import { z } from "zod";
import { paginationQuerySchema } from "@bn/shared";

export const auditQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
