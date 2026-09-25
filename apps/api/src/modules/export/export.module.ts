import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { ExportWorker } from "./export.worker";
import { PdfRendererService } from "./pdf-renderer.service";

@Module({
  controllers: [ExportController],
  providers: [ExportService, ExportWorker, PdfRendererService],
  exports: [ExportService],
})
export class ExportModule {}
