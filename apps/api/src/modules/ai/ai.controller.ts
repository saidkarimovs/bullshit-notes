import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";
import {
  completeSchema,
  saveSettingsSchema,
  testSettingsSchema,
  type CompleteInput,
  type SaveSettingsInput,
  type TestSettingsInput,
} from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("settings")
  getSettings(@CurrentUser("id") userId: string) {
    return this.ai.getSettings(userId);
  }

  @Post("settings")
  saveSettings(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(saveSettingsSchema)) body: SaveSettingsInput,
  ) {
    return this.ai.saveSettings(userId, body);
  }

  @Delete("settings")
  async deleteSettings(@CurrentUser("id") userId: string) {
    await this.ai.deleteSettings(userId);
    return { ok: true };
  }

  @Post("test")
  test(
    @Body(new ZodValidationPipe(testSettingsSchema)) body: TestSettingsInput,
  ) {
    return this.ai.test(body);
  }

  // POST /api/ai/complete -> Server-Sent Events.
  @Post("complete")
  async complete(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(completeSchema)) body: CompleteInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Pre-flight throws HttpException BEFORE we write any SSE headers, so the
    // global filter can still emit a proper JSON error + status code.
    const { provider, system, prompt } = await this.ai.prepare(userId, body);

    // Take over the socket so Fastify does not also try to respond.
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const write = (obj: unknown) =>
      reply.raw.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
      for await (const chunk of this.ai.stream(userId, provider, system, prompt)) {
        write(chunk);
      }
    } catch (err) {
      write({ type: "error", message: (err as Error).message });
    } finally {
      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    }
  }
}
