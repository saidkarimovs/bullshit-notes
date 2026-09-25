import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Redis } from "ioredis";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CryptoService } from "../../infra/crypto/crypto.service";
import { REDIS } from "../../infra/redis/redis.module";
import { UpstreamError } from "../../lib/http";
import { enforceRateLimit, RateLimitExceeded } from "../../lib/rate-limit";
import { createProvider } from "./providers/factory";
import type { AiChunk, AiProvider } from "./providers/types";
import { SYSTEM_PROMPTS, type AiAction } from "./prompts";
import type {
  CompleteInput,
  SaveSettingsInput,
  TestSettingsInput,
} from "./dto/ai.dto";

const RATE_LIMIT = 20; // AI requests
const RATE_WINDOW_SEC = 3600; // per hour

// A redacted logger config for this module: never let secrets reach the log.
export const AI_LOG_REDACT = [
  "apiKey",
  "secret",
  "encryptedKey",
  "encryptedSecret",
  "password",
  "*.apiKey",
  "*.encryptedKey",
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // --- settings -------------------------------------------------------------

  async getSettings(userId: string) {
    const s = await this.prisma.aiSettings.findUnique({ where: { userId } });
    if (!s) return null;
    return this.publicView(s.provider, s.model, s.encryptedKey, s);
  }

  async saveSettings(userId: string, input: SaveSettingsInput) {
    // Make one cheap test call before persisting anything.
    await this.runTest({
      provider: input.provider,
      apiKey: input.apiKey,
      model: input.model,
      baseUrl: input.baseUrl,
    });

    const encryptedKey = this.crypto.encrypt(input.apiKey);
    const data = {
      provider: input.provider,
      model: input.model,
      baseUrl: input.baseUrl ?? null,
      encryptedKey,
      maxTokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.7,
      monthlyTokenBudget: input.monthlyTokenBudget ?? null,
    };
    const s = await this.prisma.aiSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.publicView(s.provider, s.model, s.encryptedKey, s);
  }

  async deleteSettings(userId: string): Promise<void> {
    await this.prisma.aiSettings
      .delete({ where: { userId } })
      .catch(() => undefined);
  }

  async test(input: TestSettingsInput): Promise<{ ok: boolean; latencyMs: number }> {
    const started = Date.now();
    await this.runTest(input);
    return { ok: true, latencyMs: Date.now() - started };
  }

  private async runTest(input: TestSettingsInput): Promise<void> {
    const provider = createProvider({
      provider: input.provider,
      apiKey: input.apiKey,
      model: input.model,
      baseUrl: input.baseUrl,
      maxTokens: 16,
      temperature: 0,
    });
    await provider.test();
  }

  // --- completion (SSE) -----------------------------------------------------

  /**
   * Pre-flight the request before any SSE headers are written: enforce the
   * per-user hourly rate limit, load settings, check the monthly token budget,
   * and build the provider + messages. Throws HttpException (mapped to JSON)
   * on any failure so the client gets a real status code, not an SSE stream.
   */
  async prepare(
    userId: string,
    input: CompleteInput,
  ): Promise<{ provider: AiProvider; system: string; prompt: string }> {
    await enforceRateLimit(
      this.redis,
      `ai:rl:${userId}`,
      RATE_LIMIT,
      RATE_WINDOW_SEC,
      "AI request limit reached: 20 per hour",
    );

    const settings = await this.prisma.aiSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      throw new NotFoundException("No AI settings configured");
    }

    if (
      settings.monthlyTokenBudget != null &&
      settings.tokensUsedThisMonth >= settings.monthlyTokenBudget
    ) {
      throw new RateLimitExceeded("Monthly AI token budget exceeded");
    }

    const provider = this.buildProvider(settings);
    const { system, prompt } = this.buildMessages(input);
    return { provider, system, prompt };
  }

  /**
   * Stream AiChunk events. Provider failures surface as an { type: "error" }
   * chunk (the caller relays it as an SSE error event) rather than throwing,
   * because response headers are already sent by this point.
   */
  async *stream(
    userId: string,
    provider: AiProvider,
    system: string,
    prompt: string,
  ): AsyncGenerator<AiChunk> {
    let usage = { input: 0, output: 0 };
    try {
      for await (const chunk of provider.stream({ system, prompt })) {
        if (chunk.type === "done") usage = chunk.usage;
        yield chunk;
      }
    } catch (err) {
      yield { type: "error", message: (err as Error).message };
      return;
    }

    const total = usage.input + usage.output;
    if (total > 0) {
      await this.prisma.aiSettings
        .update({
          where: { userId },
          data: { tokensUsedThisMonth: { increment: total } },
        })
        .catch((e) =>
          this.logger.warn(`token accounting failed: ${(e as Error).message}`),
        );
    }
  }

  private buildProvider(settings: {
    provider: string;
    model: string;
    baseUrl: string | null;
    encryptedKey: string;
    maxTokens: number;
    temperature: number;
  }): AiProvider {
    let apiKey: string;
    try {
      apiKey = this.crypto.decrypt(settings.encryptedKey);
    } catch {
      throw new UpstreamError("Stored API key could not be decrypted");
    }
    return createProvider({
      provider: settings.provider as SaveSettingsInput["provider"],
      apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl ?? undefined,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
    });
  }

  private buildMessages(input: CompleteInput): {
    system: string;
    prompt: string;
  } {
    const action = input.action as AiAction;
    let system = SYSTEM_PROMPTS[action];
    if (action === "custom") {
      const instruction = (input.instruction ?? "").trim();
      system = `${SYSTEM_PROMPTS.custom}\n\nUser instruction: ${instruction}`;
    }
    const parts: string[] = [];
    if (input.selection) {
      parts.push(`Selection:\n${input.selection}`);
      if (input.content) parts.push(`Full context:\n${input.content}`);
    } else {
      parts.push(input.content);
    }
    return { system, prompt: parts.join("\n\n").trim() || input.content };
  }

  // --- helpers --------------------------------------------------------------

  private publicView(
    provider: string,
    model: string,
    encryptedKey: string,
    s: { baseUrl: string | null; maxTokens: number; temperature: number; monthlyTokenBudget: number | null; tokensUsedThisMonth: number },
  ) {
    let keyPreview = "configured";
    try {
      keyPreview = this.previewKey(this.crypto.decrypt(encryptedKey));
    } catch {
      /* leave placeholder */
    }
    return {
      provider,
      model,
      keyPreview,
      configured: true,
      baseUrl: s.baseUrl ?? undefined,
      maxTokens: s.maxTokens,
      temperature: s.temperature,
      monthlyTokenBudget: s.monthlyTokenBudget ?? undefined,
      tokensUsedThisMonth: s.tokensUsedThisMonth,
    };
  }

  private previewKey(key: string): string {
    if (key.length <= 8) return `${key.slice(0, 2)}...`;
    return `${key.slice(0, 3)}...${key.slice(-4)}`;
  }
}
