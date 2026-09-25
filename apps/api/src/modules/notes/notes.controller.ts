import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  createFolderSchema,
  createNoteSchema,
  noteQuerySchema,
  updateFolderSchema,
  updateNoteSchema,
  type CreateFolderInput,
  type CreateNoteInput,
  type NoteQuery,
  type UpdateFolderInput,
  type UpdateNoteInput,
} from "@bn/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { NotesService } from "./notes.service";
import { FoldersService } from "./folders.service";

// Folders controller (kept under the notes module).
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  list(@CurrentUser("id") userId: string) {
    return this.folders.list(userId);
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createFolderSchema)) body: CreateFolderInput,
  ) {
    return this.folders.create(userId, body);
  }

  @Patch(":id")
  update(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) body: UpdateFolderInput,
  ) {
    return this.folders.update(userId, id, body);
  }

  @Delete(":id")
  async remove(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.folders.remove(userId, id);
    return { ok: true };
  }
}

@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(noteQuerySchema)) query: NoteQuery) {
    return this.notes.list(query);
  }

  @Get("graph")
  graph() {
    return this.notes.graph();
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteInput,
  ) {
    return this.notes.create(userId, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.notes.get(id);
  }

  @Get(":id/backlinks")
  backlinks(@Param("id") id: string) {
    return this.notes.backlinks(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteInput,
  ) {
    return this.notes.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.notes.remove(id);
    return { ok: true };
  }
}
