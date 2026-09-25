import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import type { Prisma, Report, ReportStatus, Severity } from "@prisma/client";
import type {
  CreateReportInput,
  ReportQuery,
  ReportStatusChangeInput,
  UpdateReportInput,
} from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";
import { uniqueSlug } from "../../common/utils/slug";
import { connectTags } from "../../common/utils/tags";
import { computeCvss } from "../../common/utils/cvss";
import {
  canTransition,
  timestampField,
} from "./report-state-machine";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ReportQuery): Promise<Paginated<unknown>> {
    const where: Prisma.ReportWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.projectId) where.projectId = query.projectId;
    if (query.tags && query.tags.length > 0) {
      where.tags = { some: { name: { in: query.tags } } };
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = query.from;
      if (query.to) where.createdAt.lte = query.to;
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { bodyMd: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { tags: true },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }

  async get(id: string) {
    return this.prisma.report.findUniqueOrThrow({
      where: { id },
      include: {
        tags: true,
        events: { orderBy: { createdAt: "desc" } },
        attachments: true,
      },
    });
  }

  async create(authorId: string, input: CreateReportInput) {
    const slug = await uniqueSlug(input.title, (s) =>
      this.prisma.report
        .findUnique({ where: { slug: s } })
        .then((r) => r != null),
    );
    const { severity, cvssScore, cvssVector } = this.deriveSeverity(
      input.cvssVector,
      input.severity,
    );
    const tags = await connectTags(this.prisma, input.tags);
    return this.prisma.report.create({
      data: {
        title: input.title,
        slug,
        type: input.type,
        severity,
        cvssVector: cvssVector ?? null,
        cvssScore: cvssScore ?? null,
        cweId: input.cweId ?? null,
        cveId: input.cveId ?? null,
        bodyMd: input.bodyMd ?? "",
        projectId: input.projectId ?? null,
        authorId,
        bountyAmount:
          input.bountyAmount != null
            ? new Prisma.Decimal(input.bountyAmount)
            : null,
        bountyCurrency: input.bountyCurrency ?? null,
        platformRef: input.platformRef ?? null,
        disclosureDeadline: input.disclosureDeadline ?? null,
        ...(tags ? { tags: { connect: tags } } : {}),
      },
      include: { tags: true },
    });
  }

  async update(id: string, input: UpdateReportInput) {
    const existing = await this.prisma.report.findUniqueOrThrow({
      where: { id },
    });
    const data: Prisma.ReportUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.type !== undefined) data.type = input.type;
    if (input.cweId !== undefined) data.cweId = input.cweId;
    if (input.cveId !== undefined) data.cveId = input.cveId;
    if (input.bodyMd !== undefined) data.bodyMd = input.bodyMd;
    if (input.projectId !== undefined) {
      data.project =
        input.projectId === null
          ? { disconnect: true }
          : { connect: { id: input.projectId } };
    }
    if (input.platformRef !== undefined) data.platformRef = input.platformRef;
    if (input.disclosureDeadline !== undefined)
      data.disclosureDeadline = input.disclosureDeadline;
    if (input.bountyAmount !== undefined)
      data.bountyAmount =
        input.bountyAmount == null
          ? null
          : new Prisma.Decimal(input.bountyAmount);
    if (input.bountyCurrency !== undefined)
      data.bountyCurrency = input.bountyCurrency;

    // Severity / CVSS handling. A supplied vector wins over client severity.
    if (input.cvssVector !== undefined) {
      const derived = this.deriveSeverity(
        input.cvssVector ?? undefined,
        input.severity,
      );
      data.severity = derived.severity;
      data.cvssVector = derived.cvssVector ?? null;
      data.cvssScore = derived.cvssScore ?? null;
    } else if (input.severity !== undefined && !existing.cvssVector) {
      // No vector on record and none supplied: trust the client severity.
      data.severity = input.severity;
    }

    if (input.tags !== undefined) {
      const tags = await connectTags(this.prisma, input.tags);
      data.tags = { set: tags ?? [] };
    }

    return this.prisma.report.update({
      where: { id },
      data,
      include: { tags: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.report.delete({ where: { id } });
  }

  // ----------------------------------------------------------------
  // Status transition (state machine + ReportEvent in one transaction)
  // ----------------------------------------------------------------
  async changeStatus(
    id: string,
    actorId: string,
    input: ReportStatusChangeInput,
  ) {
    const report = await this.prisma.report.findUniqueOrThrow({
      where: { id },
    });
    const from = report.status;
    const to = input.toStatus;

    if (!canTransition(from, to)) {
      throw new ConflictException(
        `Illegal status transition ${from} -> ${to}`,
      );
    }
    if (to === "DUPLICATE" && !input.duplicateOfId) {
      throw new BadRequestException(
        "duplicateOfId is required when marking a report as DUPLICATE",
      );
    }

    const data: Prisma.ReportUpdateInput = { status: to };
    const stampField = timestampField(to);
    if (stampField) {
      (data as Record<string, unknown>)[stampField] = new Date();
    }
    if (to === "DUPLICATE" && input.duplicateOfId) {
      data.duplicateOf = { connect: { id: input.duplicateOfId } };
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id },
        data,
        include: { tags: true },
      }),
      this.prisma.reportEvent.create({
        data: {
          reportId: id,
          fromStatus: from,
          toStatus: to,
          note: input.note ?? null,
          actorId,
        },
      }),
    ]);
    return updated;
  }

  // ----------------------------------------------------------------
  // CVSS -> severity derivation.
  // When a vector is present it is authoritative; client severity is ignored.
  // ----------------------------------------------------------------
  private deriveSeverity(
    vector: string | null | undefined,
    clientSeverity: Severity | undefined,
  ): { severity: Severity; cvssScore?: number; cvssVector?: string } {
    if (vector && vector.trim().length > 0) {
      const result = computeCvss(vector);
      return {
        severity: result.severity,
        cvssScore: result.score,
        cvssVector: result.vector,
      };
    }
    return { severity: clientSeverity ?? "INFO" };
  }
}
