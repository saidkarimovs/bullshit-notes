import { z } from "zod";

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------
export type ApiSuccess<T> = { data: T; meta?: PaginationMeta };

export type ApiErrorDetail = { field: string; issue: string };
export type ApiError = {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
};

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

// ---------------------------------------------------------------------------
// Prisma enums re-exported as Zod enums so the frontend never imports
// @prisma/client.
// ---------------------------------------------------------------------------
export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "READONLY"]);
export type Role = z.infer<typeof roleSchema>;

export const reportTypeSchema = z.enum([
  "CVE",
  "BBP",
  "VDP",
  "PENTEST",
  "INTERNAL",
]);
export type ReportType = z.infer<typeof reportTypeSchema>;

export const reportStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "TRIAGED",
  "ACCEPTED",
  "DUPLICATE",
  "REJECTED",
  "PAID",
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const severitySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export type Severity = z.infer<typeof severitySchema>;

export const projectTypeSchema = z.enum([
  "BOUNTY_PROGRAM",
  "PENTEST_CLIENT",
  "PERSONAL_RESEARCH",
]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const assetKindSchema = z.enum([
  "DOMAIN",
  "SUBDOMAIN",
  "IP",
  "URL",
  "ENDPOINT",
  "MOBILE_APP",
  "REPO",
  "CLOUD",
]);
export type AssetKind = z.infer<typeof assetKindSchema>;

export const assetStatusSchema = z.enum([
  "IN_SCOPE",
  "OUT_OF_SCOPE",
  "UNVERIFIED",
]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;
