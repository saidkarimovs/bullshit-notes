import { fetchWithTimeout, UpstreamError } from "../../../lib/http";
import { parseAnthropicEvent } from "./parsers";
import { readSseData } from "./stream-reader";
import {
  AI_STREAM_TIMEOUT_MS,
  AI_TEST_TIMEOUT_MS,
  estimateTokens,
  type AiChunk,
  type AiProvider,
  type AiProviderConfig,
  type AiStreamRequest,
} from "./types";

export class AnthropicProvider implements AiProvider {
  constructor(private readonly cfg: AiProviderConfig) {}

  private base(): string {
    return (this.cfg.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.cfg.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  async *stream(req: AiStreamRequest): AsyncIterable<AiChunk> {
    const res = await fetchWithTimeout(`${this.base()}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      timeoutMs: AI_STREAM_TIMEOUT_MS,
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: this.cfg.maxTokens,
        temperature: this.cfg.temperature,
        system: req.system,
        stream: true,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    if (!res.ok) {
      throw new UpstreamError(
        `Anthropic responded ${res.status}: ${await safe(res)}`,
      );
    }

    let input = 0;
    let output = 0;
    let produced = "";
    for await (const data of readSseData(res.body)) {
      if (!data || data === "[DONE]") continue;
      let evt: unknown;
      try {
        evt = JSON.parse(data);
      } catch {
        continue;
      }
      const parsed = parseAnthropicEvent(evt);
      if (parsed.inputTokens != null) input = parsed.inputTokens;
      if (parsed.outputTokens != null) output = parsed.outputTokens;
      if (parsed.text) {
        produced += parsed.text;
        yield { type: "delta", text: parsed.text };
      }
    }
    yield {
      type: "done",
      usage: {
        input: input || estimateTokens(req.system + req.prompt),
        output: output || estimateTokens(produced),
      },
    };
  }

  async test(): Promise<void> {
    const res = await fetchWithTimeout(`${this.base()}/v1/messages`, {
      method: "POST",
      headers: this.headers(),
      timeoutMs: AI_TEST_TIMEOUT_MS,
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) {
      throw new UpstreamError(
        `Anthropic test call failed (${res.status}): ${await safe(res)}`,
      );
    }
  }
}

async function safe(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
