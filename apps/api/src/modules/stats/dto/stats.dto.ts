import { z } from "zod";

export const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type RangeQuery = z.infer<typeof rangeQuerySchema>;

export const bucketQuerySchema = rangeQuerySchema.extend({
  bucket: z.enum(["day", "week", "month"]).default("day"),
});
export type BucketQuery = z.infer<typeof bucketQuerySchema>;

export const earningsQuerySchema = rangeQuerySchema.extend({
  bucket: z.enum(["day", "week", "month"]).default("month"),
});
export type EarningsQuery = z.infer<typeof earningsQuerySchema>;

export const heatmapQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(365),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
