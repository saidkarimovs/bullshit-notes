import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ChecklistsService } from "./checklists.service";
import {
  checklistQuerySchema,
  createChecklistSchema,
  createTemplateSchema,
  updateItemSchema,
  type ChecklistQuery,
  type CreateChecklistInput,
  type CreateTemplateInput,
  type UpdateItemInput,
} from "./dto/checklists.dto";

@Controller("checklists")
export class ChecklistsController {
  constructor(private readonly checklists: ChecklistsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(checklistQuerySchema)) q: ChecklistQuery) {
    return this.checklists.listChecklists(q.projectId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createChecklistSchema)) body: CreateChecklistInput,
  ) {
    return this.checklists.createChecklist(body);
  }

  @Patch(":id/items/:itemId")
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(updateItemSchema)) body: UpdateItemInput,
  ) {
    return this.checklists.updateItem(id, itemId, body);
  }

  @Get(":id/progress")
  progress(@Param("id") id: string) {
    return this.checklists.progress(id);
  }
}

@Controller("checklist-templates")
export class ChecklistTemplatesController {
  constructor(private readonly checklists: ChecklistsService) {}

  @Get()
  list() {
    return this.checklists.listTemplates();
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createTemplateSchema)) body: CreateTemplateInput,
  ) {
    return this.checklists.createTemplate(userId, body);
  }
}
