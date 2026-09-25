import { z } from "zod";
import { paginationQuerySchema, roleSchema } from "@bn/shared";

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: roleSchema.optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const userQuerySchema = paginationQuerySchema.extend({
  role: roleSchema.optional(),
});
export type UserQuery = z.infer<typeof userQuerySchema>;
