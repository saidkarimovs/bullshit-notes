import { Module } from "@nestjs/common";
import { VdpController } from "./vdp.controller";
import { VdpService } from "./vdp.service";
import { VdpSlaWorker } from "./vdp.worker";

@Module({
  controllers: [VdpController],
  providers: [VdpService, VdpSlaWorker],
  exports: [VdpService],
})
export class VdpModule {}
