import { Module } from "@nestjs/common";
import {
  AssetsController,
  ProjectAssetsController,
} from "./assets.controller";
import { AssetsService } from "./assets.service";

@Module({
  controllers: [ProjectAssetsController, AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
