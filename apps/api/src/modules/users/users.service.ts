import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  buildMeta,
  paginationArgs,
  type Paginated,
} from "../../common/utils/pagination";
import type { UpdateMeInput, UpdateUserInput, UserQuery } from "./dto/user.dto";

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  totpEnabled: true,
  avatarUrl: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserQuery): Promise<Paginated<unknown>> {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const { skip, take, orderBy } = paginationArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy, select: SAFE_SELECT }),
      this.prisma.user.count({ where }),
    ]);
    return { items, meta: buildMeta(query, total) };
  }

  async get(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: SAFE_SELECT,
    });
  }

  async updateByAdmin(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async updateMe(id: string, input: UpdateMeInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
