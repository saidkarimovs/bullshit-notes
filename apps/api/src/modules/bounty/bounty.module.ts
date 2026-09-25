import { Module } from "@nestjs/common";
import { BountyController } from "./bounty.controller";
import { BountyService } from "./bounty.service";

@Module({
  controllers: [BountyController],
  providers: [BountyService],
  exports: [BountyService],
})
export class BountyModule {}
