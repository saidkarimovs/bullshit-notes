import { z } from "zod";

export const vaultKindSchema = z.enum([
  "PASSWORD",
  "API_KEY",
  "TOKEN",
  "SSH_KEY",
  "CERTIFICATE",
  "OTHER",
]);

export const vaultQuerySchema = z.object({
  projectId: z.string().optional(),
});
export type VaultQuery = z.infer<typeof vaultQuerySchema>;

export const createVaultSchema = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1).max(200),
  username: z.string().max(200).optional(),
  secret: z.string().min(1),
  kind: vaultKindSchema,
  url: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});
export type CreateVaultInput = z.infer<typeof createVaultSchema>;

export const updateVaultSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  username: z.string().max(200).optional(),
  secret: z.string().min(1).optional(),
  kind: vaultKindSchema.optional(),
  url: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});
export type UpdateVaultInput = z.infer<typeof updateVaultSchema>;

export const revealSchema = z.object({
  password: z.string().min(1),
});
export type RevealInput = z.infer<typeof revealSchema>;
