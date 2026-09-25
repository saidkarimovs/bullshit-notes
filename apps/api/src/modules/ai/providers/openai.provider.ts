import { fetchWithTimeout, UpstreamError } from "../../../lib/http";
import { parseOpenAiChunk } from "./parsers";
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

// Handles both "openai" and "openai-compatible" providers. The only difference
// is the default base URL; openai-compatible always requires an explicit one.
export class OpenAiProvider implements AiProvider {
  constructor(private readonly cfg: AiProviderConfig) {}

  private base(): string {
    const fallback =
      this.cfg.provider === "openai" ? "https://api.openai.com" : undefined;
    const b = this.cfg.baseUrl ?? fallback;
    if (!b) {
      throw new UpstreamError("openai-compatible provider requires a baseUrl");
    }
    return b.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.cfg.apiKey}`,
    };
  }

  async *stream(req: AiStreamRequest): AsyncIterable<AiChunk> {
    const res = await fetchWithTimeout(`${this.base()}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      timeoutMs: AI_STREAM_TIMEOUT_MS,
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: this.cfg.maxTokens,
        temperature: this.cfg.temperature,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new UpstreamError(
        `OpenAI responded ${res.status}: ${await safe(res)}`,
      );
    }

    let input = 0;
    let output = 0;
    let produced = "";
    for await (const data of readSseData(res.body)) {
      if (!data || data === "[DONE]") continue;
      let obj: unknown;
      try {
        obj = JSON.parse(data);
      } catch {
        continue;
      }
      const parsed = parseOpenAiChunk(obj);
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
    const res = await fetchWithTimeout(`${this.base()}/v1/chat/completions`, {
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
        `OpenAI test call failed (${res.status}): ${await safe(res)}`,
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
