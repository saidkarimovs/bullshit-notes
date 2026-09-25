import { Module } from "@nestjs/common";
import {
  FoldersController,
  NotesController,
} from "./notes.controller";
import { NotesService } from "./notes.service";
import { FoldersService } from "./folders.service";

@Module({
  controllers: [NotesController, FoldersController],
  providers: [NotesService, FoldersService],
  exports: [NotesService, FoldersService],
})
export class NotesModule {}
