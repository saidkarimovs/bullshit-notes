import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  CreateProjectInput,
  ProjectQuery,
  UpdateProjectInput,
} from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";
import { slugify, uniqueSlug } from "../../common/utils/slug";
import { connectTags } from "../../common/utils/tags";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProjectQuery): Promise<Paginated<unknown>> {
    const where: Prisma.ProjectWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.platform) where.platform = query.platform;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { tags: true },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }

  async get(id: string) {
    return this.prisma.project.findUniqueOrThrow({
      where: { id },
      include: { tags: true },
    });
  }

  async create(ownerId: string, input: CreateProjectInput) {
    const slug = await uniqueSlug(input.name, (s) =>
      this.prisma.project
        .findUnique({ where: { slug: s } })
        .then((r) => r != null),
    );
    const tags = await connectTags(this.prisma, input.tags);
    return this.prisma.project.create({
      data: {
        name: input.name,
        slug,
        type: input.type,
        status: input.status ?? "ACTIVE",
        platform: input.platform ?? null,
        programUrl: input.programUrl ?? null,
        scopeNotesMd: input.scopeNotesMd ?? "",
        payoutMin: input.payoutMin ?? null,
        payoutMax: input.payoutMax ?? null,
        currency: input.currency ?? "USD",
        nda: input.nda ?? false,
        startedAt: input.startedAt ?? null,
        ownerId,
        ...(tags ? { tags: { connect: tags } } : {}),
      },
      include: { tags: true },
    });
  }

  async update(id: string, input: UpdateProjectInput) {
    const tags =
      input.tags !== undefined
        ? await connectTags(this.prisma, input.tags)
        : undefined;
    const data: Prisma.ProjectUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.platform !== undefined) data.platform = input.platform;
    if (input.programUrl !== undefined) data.programUrl = input.programUrl;
    if (input.scopeNotesMd !== undefined) data.scopeNotesMd = input.scopeNotesMd;
    if (input.payoutMin !== undefined) data.payoutMin = input.payoutMin;
    if (input.payoutMax !== undefined) data.payoutMax = input.payoutMax;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.nda !== undefined) data.nda = input.nda;
    if (input.startedAt !== undefined) data.startedAt = input.startedAt;
    if (input.closedAt !== undefined) data.closedAt = input.closedAt;
    if (tags !== undefined) data.tags = { set: tags ?? [] };
    return this.prisma.project.update({
      where: { id },
      data,
      include: { tags: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  // Project dashboard: counts of reports by severity, assets by status,
  // and 10 most recent activity rows (report events for this project).
  async overview(id: string) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id },
      include: { tags: true },
    });

    const [severityGroups, statusGroups, recentEvents] = await Promise.all([
      this.prisma.report.groupBy({
        by: ["severity"],
        where: { projectId: id },
        _count: { _all: true },
      }),
      this.prisma.asset.groupBy({
        by: ["status"],
        where: { projectId: id },
        _count: { _all: true },
      }),
      this.prisma.reportEvent.findMany({
        where: { report: { projectId: id } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { report: { select: { id: true, title: true, slug: true } } },
      }),
    ]);

    const reportsBySeverity: Record<string, number> = {
      INFO: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const g of severityGroups) {
      reportsBySeverity[g.severity] = g._count._all;
    }

    const assetsByStatus: Record<string, number> = {
      IN_SCOPE: 0,
      OUT_OF_SCOPE: 0,
      UNVERIFIED: 0,
    };
    for (const g of statusGroups) {
      assetsByStatus[g.status] = g._count._all;
    }

    return {
      project,
      reportsBySeverity,
      assetsByStatus,
      recentActivity: recentEvents.map((e) => ({
        id: e.id,
        reportId: e.reportId,
        reportTitle: e.report.title,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}
