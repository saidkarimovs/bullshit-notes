import { Module } from "@nestjs/common";
import { CveController } from "./cve.controller";
import { CveService } from "./cve.service";
import { CveSyncService } from "./cve-sync.service";
import { CveWorker } from "./cve.worker";

@Module({
  controllers: [CveController],
  providers: [CveService, CveSyncService, CveWorker],
  exports: [CveService, CveSyncService],
})
export class CveModule {}
