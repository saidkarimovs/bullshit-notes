import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ImportService } from "./import.service";
import {
  importNucleiSchema,
  importReconSchema,
  type ImportNucleiInput,
  type ImportReconInput,
} from "./dto/import.dto";

const MAX_BYTES = 25 * 1024 * 1024;

// @fastify/multipart request extensions we rely on.
interface MultipartRequest extends FastifyRequest {
  file(): Promise<
    | {
        filename: string;
        mimetype: string;
        toBuffer(): Promise<Buffer>;
      }
    | undefined
  >;
}

@Controller("import")
export class ImportController {
  constructor(private readonly importer: ImportService) {}

  @Post("pdf")
  async importPdf(@Req() req: FastifyRequest) {
    const buffer = await this.readUpload(req, MAX_BYTES);
    return this.importer.importPdf(buffer);
  }

  @Post("markdown")
  async importMarkdown(@Req() req: FastifyRequest) {
    const mp = req as MultipartRequest;
    const file = await mp.file();
    if (!file) throw new BadRequestException("No file uploaded");
    const buffer = await file.toBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      throw new BadRequestException("File exceeds 25 MB limit");
    }

    if (/\.zip$/i.test(file.filename) || file.mimetype === "application/zip") {
      const files = await this.extractMarkdownZip(buffer);
      return this.importer.importMarkdown(files);
    }
    return this.importer.importMarkdown([
      { name: file.filename, content: buffer.toString("utf8") },
    ]);
  }

  @Post("nuclei")
  importNuclei(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(importNucleiSchema)) body: ImportNucleiInput,
  ) {
    return this.importer.importNuclei(userId, body);
  }

  @Post("recon")
  importRecon(
    @Body(new ZodValidationPipe(importReconSchema)) body: ImportReconInput,
  ) {
    return this.importer.importRecon(body);
  }

  private async readUpload(
    req: FastifyRequest,
    maxBytes: number,
  ): Promise<Buffer> {
    const mp = req as MultipartRequest;
    const file = await mp.file();
    if (!file) throw new BadRequestException("No file uploaded");
    const buffer = await file.toBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new BadRequestException("File exceeds 25 MB limit");
    }
    return buffer;
  }

  private async extractMarkdownZip(
    buffer: Buffer,
  ): Promise<{ name: string; content: string }[]> {
    const JSZipMod = await import("jszip");
    const JSZip = JSZipMod.default ?? (JSZipMod as unknown as typeof import("jszip"));
    const zip = await JSZip.loadAsync(buffer);
    const out: { name: string; content: string }[] = [];
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir || !/\.md$/i.test(entry.name)) continue;
      out.push({ name: entry.name, content: await entry.async("string") });
    }
    if (out.length === 0) {
      throw new BadRequestException("Zip contained no .md files");
    }
    return out;
  }
}
