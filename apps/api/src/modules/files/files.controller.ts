import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import {
  confirmUploadSchema,
  presignSchema,
  type ConfirmUploadInput,
  type PresignInput,
} from "@bn/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("presign")
  presign(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(presignSchema)) body: PresignInput,
  ) {
    return this.files.presign(userId, body);
  }

  @Post("confirm")
  confirm(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(confirmUploadSchema)) body: ConfirmUploadInput,
  ) {
    return this.files.confirm(userId, body);
  }

  // 302 redirect to a presigned GET URL. Files never stream through the API.
  @Get(":id/download")
  async download(
    @Param("id") id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const url = await this.files.downloadUrl(id);
    void reply.status(302).redirect(url);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.files.remove(id);
    return { ok: true };
  }
}
