import { Module } from "@nestjs/common";
import {
  ChecklistsController,
  ChecklistTemplatesController,
} from "./checklists.controller";
import { ChecklistsService } from "./checklists.service";

@Module({
  controllers: [ChecklistsController, ChecklistTemplatesController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
