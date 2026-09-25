import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ExportService } from "./export.service";
import {
  dataExportQuerySchema,
  exportReportSchema,
  type DataExportQuery,
  type ExportReportInput,
} from "./dto/export.dto";

@Controller("export")
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  @Post("report/:id")
  @HttpCode(202)
  exportReport(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(exportReportSchema)) body: ExportReportInput,
  ) {
    return this.exporter.enqueue("report", id, userId, body.template);
  }

  @Post("note/:id")
  @HttpCode(202)
  exportNote(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.exporter.enqueue("note", id, userId);
  }

  @Post("project/:id")
  @HttpCode(202)
  exportProject(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.exporter.enqueue("project", id, userId);
  }

  @Get("jobs/:jobId")
  jobStatus(@Param("jobId") jobId: string) {
    return this.exporter.jobStatus(jobId);
  }

  // Full account export as a zip stream.
  @Get("data")
  async data(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(dataExportQuerySchema)) q: DataExportQuery,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const buffer = await this.exporter.dataExport(userId, q.format);
    void reply
      .header("Content-Type", "application/zip")
      .header(
        "Content-Disposition",
        `attachment; filename="bullshit-notes-export.zip"`,
      )
      .send(buffer);
  }
}
