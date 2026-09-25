import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { extractVariables, renderPayload } from "./render";
import { SEED_PAYLOADS } from "./payloads.seed";
import type {
  CreatePayloadInput,
  PayloadQuery,
  RenderPayloadInput,
  UpdatePayloadInput,
} from "./dto/payloads.dto";

@Injectable()
export class PayloadsService implements OnModuleInit {
  private readonly logger = new Logger(PayloadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Seed the 40 built-in payloads once, only if the table is empty.
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.payload.count();
      if (count > 0) return;
      const owner = await this.prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!owner) return; // no users yet; seed on a later boot
      await this.prisma.payload.createMany({
        data: SEED_PAYLOADS.map((p) => ({
          title: p.title,
          category: p.category,
          body: p.body,
          language: p.language,
          description: p.description,
          variables: extractVariables(p.body),
          source: p.source ?? "built-in",
          ownerId: owner.id,
        })),
      });
      this.logger.log(`Seeded ${SEED_PAYLOADS.length} built-in payloads`);
    } catch (err) {
      this.logger.warn(`Payload seed skipped: ${(err as Error).message}`);
    }
  }

  list(query: PayloadQuery) {
    const where: Prisma.PayloadWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { body: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }
    return this.prisma.payload.findMany({
      where,
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
  }

  async get(id: string) {
    const p = await this.prisma.payload.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Payload not found");
    return p;
  }

  create(userId: string, input: CreatePayloadInput) {
    return this.prisma.payload.create({
      data: {
        title: input.title,
        category: input.category,
        body: input.body,
        language: input.language ?? "text",
        description: input.description ?? "",
        source: input.source ?? null,
        variables: extractVariables(input.body),
        ownerId: userId,
      },
    });
  }

  async update(userId: string, id: string, input: UpdatePayloadInput) {
    const existing = await this.get(id);
    if (existing.ownerId !== userId) {
      throw new ForbiddenException("Not your payload");
    }
    const body = input.body ?? existing.body;
    return this.prisma.payload.update({
      where: { id },
      data: {
        title: input.title,
        category: input.category,
        body: input.body,
        language: input.language,
        description: input.description,
        source: input.source,
        variables: input.body ? extractVariables(body) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.get(id);
    if (existing.ownerId !== userId) {
      throw new ForbiddenException("Not your payload");
    }
    await this.prisma.payload.delete({ where: { id } });
    return { ok: true };
  }

  async render(id: string, input: RenderPayloadInput) {
    const p = await this.get(id);
    return renderPayload(p.body, input.vars);
  }

  async markUsed(id: string) {
    await this.get(id);
    return this.prisma.payload.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
      select: { id: true, usageCount: true },
    });
  }
}
