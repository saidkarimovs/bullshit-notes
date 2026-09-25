import { z } from "zod";
import {
  assetKindSchema,
  assetStatusSchema,
  paginationQuerySchema,
} from "./common.schema";

export const createAssetSchema = z.object({
  kind: assetKindSchema,
  value: z.string().min(1).max(1000),
  status: assetStatusSchema.optional(),
  tech: z.array(z.string()).default([]),
  httpStatus: z.number().int().optional().nullable(),
  title: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  port: z.number().int().optional().nullable(),
  notesMd: z.string().default(""),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial();
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const bulkAssetSchema = z.object({
  values: z.array(z.string().min(1)).min(1).max(5000),
  kind: assetKindSchema,
});
export type BulkAssetInput = z.infer<typeof bulkAssetSchema>;

export const assetQuerySchema = paginationQuerySchema.extend({
  kind: assetKindSchema.optional(),
  status: assetStatusSchema.optional(),
});
export type AssetQuery = z.infer<typeof assetQuerySchema>;

export type BulkAssetResult = {
  created: number;
  updated: number;
  skipped: number;
};
