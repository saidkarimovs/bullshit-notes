import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import type { Redis } from "ioredis";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CryptoService } from "../../infra/crypto/crypto.service";
import { REDIS } from "../../infra/redis/redis.module";
import { enforceRateLimit } from "../../lib/rate-limit";
import type {
  CreateVaultInput,
  RevealInput,
  UpdateVaultInput,
} from "./dto/vault.dto";

const REVEAL_LIMIT = 10; // reveals
const REVEAL_WINDOW_SEC = 3600; // per hour
const REVEAL_TTL_SEC = 30;

@Injectable()
export class VaultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // List never includes the secret.
  list(userId: string, projectId?: string) {
    return this.prisma.vaultEntry.findMany({
      where: { ownerId: userId, ...(projectId ? { projectId } : {}) },
      select: {
        id: true,
        projectId: true,
        label: true,
        username: true,
        kind: true,
        url: true,
        notes: true,
        lastAccessedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, input: CreateVaultInput) {
    const entry = await this.prisma.vaultEntry.create({
      data: {
        projectId: input.projectId,
        label: input.label,
        username: input.username ?? null,
        encryptedSecret: this.crypto.encrypt(input.secret),
        kind: input.kind,
        url: input.url ?? null,
        notes: input.notes ?? "",
        ownerId: userId,
      },
      select: this.safeSelect(),
    });
    return entry;
  }

  async update(userId: string, id: string, input: UpdateVaultInput) {
    await this.requireOwned(userId, id);
    return this.prisma.vaultEntry.update({
      where: { id },
      data: {
        label: input.label,
        username: input.username,
        kind: input.kind,
        url: input.url,
        notes: input.notes,
        encryptedSecret: input.secret
          ? this.crypto.encrypt(input.secret)
          : undefined,
      },
      select: this.safeSelect(),
    });
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.vaultEntry.delete({ where: { id } });
    return { ok: true };
  }

  async reveal(
    userId: string,
    id: string,
    input: RevealInput,
    ip?: string,
    userAgent?: string,
  ): Promise<{ secret: string; expiresInSec: number }> {
    // Rate limit reveals per user.
    await enforceRateLimit(
      this.redis,
      `vault:reveal:${userId}`,
      REVEAL_LIMIT,
      REVEAL_WINDOW_SEC,
      "Vault reveal limit reached: 10 per hour",
    );

    const entry = await this.requireOwned(userId, id);

    // Re-verify the user's login password with argon2 before decrypting.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException("User not found");
    const ok = await argon2.verify(user.passwordHash, input.password).catch(
      () => false,
    );
    if (!ok) throw new UnauthorizedException("Password verification failed");

    const secret = this.crypto.decrypt(entry.encryptedSecret);

    await this.prisma.$transaction([
      this.prisma.vaultEntry.update({
        where: { id },
        data: { lastAccessedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          action: "vault.reveal",
          entityType: "VaultEntry",
          entityId: id,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        },
      }),
    ]);

    return { secret, expiresInSec: REVEAL_TTL_SEC };
  }

  private async requireOwned(userId: string, id: string) {
    const entry = await this.prisma.vaultEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException("Vault entry not found");
    if (entry.ownerId !== userId) throw new ForbiddenException("Not your entry");
    return entry;
  }

  private safeSelect() {
    return {
      id: true,
      projectId: true,
      label: true,
      username: true,
      kind: true,
      url: true,
      notes: true,
      lastAccessedAt: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
