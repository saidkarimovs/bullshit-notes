import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuditService } from "./audit.service";
import { auditQuerySchema, type AuditQuery } from "./dto/audit.dto";

@Controller("audit")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQuery) {
    return this.audit.list(query);
  }
}
