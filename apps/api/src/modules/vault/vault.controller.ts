import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { VaultService } from "./vault.service";
import {
  createVaultSchema,
  revealSchema,
  updateVaultSchema,
  vaultQuerySchema,
  type CreateVaultInput,
  type RevealInput,
  type UpdateVaultInput,
  type VaultQuery,
} from "./dto/vault.dto";

@Controller("vault")
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Get()
  list(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(vaultQuerySchema)) q: VaultQuery,
  ) {
    return this.vault.list(userId, q.projectId);
  }

  @Post()
  create(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(createVaultSchema)) body: CreateVaultInput,
  ) {
    return this.vault.create(userId, body);
  }

  @Post(":id/reveal")
  reveal(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(revealSchema)) body: RevealInput,
    @Req() req: FastifyRequest,
  ) {
    return this.vault.reveal(userId, id, body, req.ip, req.headers["user-agent"]);
  }

  @Patch(":id")
  update(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVaultSchema)) body: UpdateVaultInput,
  ) {
    return this.vault.update(userId, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.vault.remove(userId, id);
  }
}
