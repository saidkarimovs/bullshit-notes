import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { buildMeta } from "../../common/utils/pagination";
import { QUEUE_TOKEN } from "../../jobs/queue.constants";
import type {
  CreateBookmarkInput,
  CreateWatchInput,
  CveQuery,
} from "./dto/cve.dto";

@Injectable()
export class CveService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_TOKEN.CVE_SYNC) private readonly cveSyncQueue: Queue,
  ) {}

  async list(query: CveQuery) {
    const where: Prisma.CveWhereInput = {};
    if (query.severity) where.severity = query.severity;
    if (query.isKev !== undefined) where.isKev = query.isKev;
    if (query.from || query.to) {
      where.published = {};
      if (query.from) where.published.gte = new Date(query.from);
      if (query.to) where.published.lte = new Date(query.to);
    }
    if (query.q) {
      where.OR = [
        { cveId: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.cve.findMany({
        where,
        orderBy: { published: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.cve.count({ where }),
    ]);
    return {
      items,
      meta: buildMeta(
        { page: query.page, perPage: query.perPage, sort: "published", order: "desc" },
        total,
      ),
    };
  }

  async get(cveId: string) {
    const cve = await this.prisma.cve.findUnique({ where: { cveId } });
    if (!cve) throw new NotFoundException("CVE not found");
    return cve;
  }

  async stats() {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [total, kevCount, last7Days, bySeverityRaw] = await Promise.all([
      this.prisma.cve.count(),
      this.prisma.cve.count({ where: { isKev: true } }),
      this.prisma.cve.count({ where: { published: { gte: since } } }),
      this.prisma.cve.groupBy({
        by: ["severity"],
        _count: { _all: true },
      }),
    ]);
    const bySeverity: Record<string, number> = {};
    for (const g of bySeverityRaw) {
      bySeverity[g.severity ?? "UNKNOWN"] = g._count._all;
    }
    return { total, kevCount, last7Days, bySeverity };
  }

  async triggerSync() {
    const job = await this.cveSyncQueue.add("manual-sync", { reason: "manual" });
    return { enqueued: true, jobId: job.id };
  }

  // --- watches --------------------------------------------------------------

  listWatches(userId: string) {
    return this.prisma.cveWatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  createWatch(userId: string, input: CreateWatchInput) {
    return this.prisma.cveWatch.create({
      data: { userId, keyword: input.keyword, kind: input.kind },
    });
  }

  async deleteWatch(userId: string, id: string) {
    const watch = await this.prisma.cveWatch.findUnique({ where: { id } });
    if (!watch || watch.userId !== userId) {
      throw new NotFoundException("Watch not found");
    }
    await this.prisma.cveWatch.delete({ where: { id } });
    return { ok: true };
  }

  // --- bookmarks ------------------------------------------------------------

  listBookmarks(userId: string) {
    return this.prisma.cveBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  createBookmark(userId: string, input: CreateBookmarkInput) {
    return this.prisma.cveBookmark.create({
      data: { userId, cveId: input.cveId, notes: input.notes ?? "" },
    });
  }

  async deleteBookmark(userId: string, id: string) {
    const bm = await this.prisma.cveBookmark.findUnique({ where: { id } });
    if (!bm || bm.userId !== userId) {
      throw new NotFoundException("Bookmark not found");
    }
    await this.prisma.cveBookmark.delete({ where: { id } });
    return { ok: true };
  }
}
