import { z } from "zod";

export const exportReportSchema = z.object({
  template: z.enum(["default", "client", "minimal"]).default("default"),
});
export type ExportReportInput = z.infer<typeof exportReportSchema>;

export const dataExportQuerySchema = z.object({
  format: z.enum(["json", "markdown"]).default("markdown"),
});
export type DataExportQuery = z.infer<typeof dataExportQuerySchema>;
