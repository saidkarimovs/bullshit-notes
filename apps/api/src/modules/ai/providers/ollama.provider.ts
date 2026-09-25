import { fetchWithTimeout, UpstreamError } from "../../../lib/http";
import { parseOllamaObject } from "./parsers";
import { readNdjson } from "./stream-reader";
import {
  AI_STREAM_TIMEOUT_MS,
  AI_TEST_TIMEOUT_MS,
  estimateTokens,
  type AiChunk,
  type AiProvider,
  type AiProviderConfig,
  type AiStreamRequest,
} from "./types";

// Ollama streams newline-delimited JSON (not SSE) from /api/chat.
export class OllamaProvider implements AiProvider {
  constructor(private readonly cfg: AiProviderConfig) {}

  private base(): string {
    return (this.cfg.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  }

  async *stream(req: AiStreamRequest): AsyncIterable<AiChunk> {
    const res = await fetchWithTimeout(`${this.base()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      timeoutMs: AI_STREAM_TIMEOUT_MS,
      body: JSON.stringify({
        model: this.cfg.model,
        stream: true,
        options: {
          temperature: this.cfg.temperature,
          num_predict: this.cfg.maxTokens,
        },
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new UpstreamError(
        `Ollama responded ${res.status}: ${await safe(res)}`,
      );
    }

    let input = 0;
    let output = 0;
    let produced = "";
    for await (const line of readNdjson(res.body)) {
      let obj: unknown;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const parsed = parseOllamaObject(obj);
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
    const res = await fetchWithTimeout(`${this.base()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      timeoutMs: AI_TEST_TIMEOUT_MS,
      body: JSON.stringify({
        model: this.cfg.model,
        stream: false,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) {
      throw new UpstreamError(
        `Ollama test call failed (${res.status}): ${await safe(res)}`,
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
