export type AiProviderName =
  | "anthropic"
  | "openai"
  | "openai-compatible"
  | "ollama";

export interface AiProviderConfig {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
}

export interface AiStreamRequest {
  system: string;
  prompt: string;
}

export type AiChunk =
  | { type: "delta"; text: string }
  | { type: "done"; usage: { input: number; output: number } }
  | { type: "error"; message: string };

export interface AiProvider {
  stream(req: AiStreamRequest): AsyncIterable<AiChunk>;
  test(): Promise<void>;
}

// AI streams get a longer timeout than ordinary upstream calls. Overridable
// via AI_REQUEST_TIMEOUT_MS.
export const AI_STREAM_TIMEOUT_MS = Number(
  process.env.AI_REQUEST_TIMEOUT_MS ?? 120_000,
);
export const AI_TEST_TIMEOUT_MS = 15_000;

// Roughly estimate token counts when a provider does not report usage.
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
