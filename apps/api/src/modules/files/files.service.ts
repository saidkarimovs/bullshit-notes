import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Redis } from "ioredis";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type ConfirmUploadInput,
  type PresignInput,
  type PresignResult,
} from "@bn/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { StorageService } from "../../infra/storage/storage.service";
import { REDIS } from "../../infra/redis/redis.module";

interface PendingUpload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

const PENDING_TTL_SECONDS = 900;
const PRESIGN_EXPIRES = 900;
const DOWNLOAD_EXPIRES = 300;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async presign(
    userId: string,
    input: PresignInput,
  ): Promise<PresignResult> {
    // Defense in depth: the Zod schema already enforces these, but never
    // trust that the pipe ran.
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new BadRequestException("Unsupported mime type");
    }
    if (input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("File exceeds the 50 MB limit");
    }

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
    const storageKey = `uploads/${userId}/${randomUUID()}/${safeName}`;

    const uploadUrl = await this.storage.presignPut(
      storageKey,
      input.mimeType,
      PRESIGN_EXPIRES,
    );

    const pending: PendingUpload = {
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedById: userId,
    };
    await this.redis.set(
      this.pendingKey(storageKey),
      JSON.stringify(pending),
      "EX",
      PENDING_TTL_SECONDS,
    );

    return { uploadUrl, storageKey, expiresIn: PRESIGN_EXPIRES };
  }

  async confirm(userId: string, input: ConfirmUploadInput) {
    const rawPending = await this.redis.get(this.pendingKey(input.storageKey));
    if (!rawPending) {
      throw new BadRequestException(
        "Unknown or expired storageKey. Re-request a presigned URL.",
      );
    }
    const pending = JSON.parse(rawPending) as PendingUpload;
    if (pending.uploadedById !== userId) {
      throw new BadRequestException("storageKey belongs to another user");
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        filename: pending.filename,
        mimeType: pending.mimeType,
        sizeBytes: pending.sizeBytes,
        storageKey: input.storageKey,
        sha256: input.sha256.toLowerCase(),
        reportId: input.reportId ?? null,
        noteId: input.noteId ?? null,
        uploadedById: userId,
      },
    });
    await this.redis.del(this.pendingKey(input.storageKey));
    return attachment;
  }

  // Returns a short-lived presigned GET URL to redirect the client to.
  async downloadUrl(id: string): Promise<string> {
    const attachment = await this.prisma.attachment.findUniqueOrThrow({
      where: { id },
    });
    return this.storage.presignGet(attachment.storageKey, DOWNLOAD_EXPIRES);
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.prisma.attachment.findUniqueOrThrow({
      where: { id },
    });
    await this.storage.deleteObject(attachment.storageKey).catch(() => undefined);
    await this.prisma.attachment.delete({ where: { id } });
  }

  private pendingKey(storageKey: string): string {
    return `upload:pending:${storageKey}`;
  }
}
