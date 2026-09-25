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
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ProjectQuery,
  type UpdateProjectInput,
} from "@bn/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(projectQuerySchema)) query: ProjectQuery,
  ) {
    return this.projects.list(query);
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
  ) {
    return this.projects.create(userId, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }

  @Get(":id/overview")
  overview(@Param("id") id: string) {
    return this.projects.overview(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
  ) {
    return this.projects.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.projects.remove(id);
    return { ok: true };
  }
}
