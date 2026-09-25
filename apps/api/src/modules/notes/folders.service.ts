import { Injectable } from "@nestjs/common";
import type { CreateFolderInput, UpdateFolderInput } from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.folder.findMany({
      where: { ownerId },
      orderBy: { name: "asc" },
    });
  }

  create(ownerId: string, input: CreateFolderInput) {
    return this.prisma.folder.create({
      data: {
        name: input.name,
        parentId: input.parentId ?? null,
        ownerId,
      },
    });
  }

  async update(ownerId: string, id: string, input: UpdateFolderInput) {
    // Ensure ownership (throws NOT_FOUND via P2025 when missing/foreign).
    await this.prisma.folder.findFirstOrThrow({ where: { id, ownerId } });
    return this.prisma.folder.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.parentId !== undefined
          ? { parentId: input.parentId }
          : {}),
      },
    });
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.prisma.folder.findFirstOrThrow({ where: { id, ownerId } });
    await this.prisma.folder.delete({ where: { id } });
  }
}
