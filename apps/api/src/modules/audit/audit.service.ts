import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";
import type { AuditQuery } from "./dto/audit.dto";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Read-only. AuditLog rows are append-only; there is no update or delete.
  async list(query: AuditQuery): Promise<Paginated<unknown>> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorId) where.actorId = query.actorId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, skip, take, orderBy }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }
}
