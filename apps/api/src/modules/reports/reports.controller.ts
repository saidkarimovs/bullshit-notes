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
  createReportSchema,
  reportQuerySchema,
  reportStatusChangeSchema,
  updateReportSchema,
  type CreateReportInput,
  type ReportQuery,
  type ReportStatusChangeInput,
  type UpdateReportInput,
} from "@bn/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery) {
    return this.reports.list(query);
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportInput,
  ) {
    return this.reports.create(userId, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.reports.get(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateReportSchema)) body: UpdateReportInput,
  ) {
    return this.reports.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.reports.remove(id);
    return { ok: true };
  }

  @Post(":id/status")
  changeStatus(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(reportStatusChangeSchema))
    body: ReportStatusChangeInput,
  ) {
    return this.reports.changeStatus(id, userId, body);
  }
}
