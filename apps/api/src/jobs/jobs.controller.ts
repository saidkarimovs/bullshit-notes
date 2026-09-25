import { Controller, Get, UseGuards } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { JobsService } from "./jobs.service";

@Controller("jobs")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // GET /api/jobs/status -> per-queue counts (ADMIN only)
  @Get("status")
  async status() {
    return { queues: await this.jobs.status() };
  }
}
