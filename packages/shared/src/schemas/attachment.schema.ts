import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/json",
  "text/csv",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const presignSchema = z.object({
  filename: z.string().min(1).max(400),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});
export type PresignInput = z.infer<typeof presignSchema>;

export const confirmUploadSchema = z
  .object({
    storageKey: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i, "sha256 must be 64 hex chars"),
    reportId: z.string().optional().nullable(),
    noteId: z.string().optional().nullable(),
  });
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export type PresignResult = {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
};
