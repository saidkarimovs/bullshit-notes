import { Injectable } from "@nestjs/common";
import type { AssetKind, Prisma } from "@prisma/client";
import type {
  AssetQuery,
  BulkAssetInput,
  BulkAssetResult,
  CreateAssetInput,
  UpdateAssetInput,
} from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    projectId: string,
    query: AssetQuery,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.AssetWhereInput = { projectId };
    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { value: { contains: query.q, mode: "insensitive" } },
        { title: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({ where, skip, take, orderBy }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }

  create(projectId: string, input: CreateAssetInput) {
    return this.prisma.asset.create({
      data: {
        projectId,
        kind: input.kind,
        value: input.value,
        status: input.status ?? "UNVERIFIED",
        tech: input.tech ?? [],
        httpStatus: input.httpStatus ?? null,
        title: input.title ?? null,
        ipAddress: input.ipAddress ?? null,
        port: input.port ?? null,
        notesMd: input.notesMd ?? "",
      },
    });
  }

  update(id: string, input: UpdateAssetInput) {
    const data: Prisma.AssetUpdateInput = { lastSeenAt: new Date() };
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.value !== undefined) data.value = input.value;
    if (input.status !== undefined) data.status = input.status;
    if (input.tech !== undefined) data.tech = input.tech;
    if (input.httpStatus !== undefined) data.httpStatus = input.httpStatus;
    if (input.title !== undefined) data.title = input.title;
    if (input.ipAddress !== undefined) data.ipAddress = input.ipAddress;
    if (input.port !== undefined) data.port = input.port;
    if (input.notesMd !== undefined) data.notesMd = input.notesMd;
    return this.prisma.asset.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.asset.delete({ where: { id } });
  }

  // Bulk upsert on [projectId, value]. Returns created/updated/skipped counts.
  // "skipped" counts blank/duplicate input values within the same request.
  async bulk(
    projectId: string,
    input: BulkAssetInput,
  ): Promise<BulkAssetResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const seen = new Set<string>();

    for (const raw of input.values) {
      const value = raw.trim();
      if (!value || seen.has(value)) {
        skipped += 1;
        continue;
      }
      seen.add(value);

      // eslint-disable-next-line no-await-in-loop
      const existing = await this.prisma.asset.findUnique({
        where: { projectId_value: { projectId, value } },
        select: { id: true },
      });
      if (existing) {
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.asset.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date(), kind: input.kind as AssetKind },
        });
        updated += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        await this.prisma.asset.create({
          data: { projectId, value, kind: input.kind as AssetKind },
        });
        created += 1;
      }
    }

    return { created, updated, skipped };
  }
}
