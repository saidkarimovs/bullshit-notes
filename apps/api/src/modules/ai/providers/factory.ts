import { AnthropicProvider } from "./anthropic.provider";
import { OpenAiProvider } from "./openai.provider";
import { OllamaProvider } from "./ollama.provider";
import type { AiProvider, AiProviderConfig } from "./types";

export function createProvider(cfg: AiProviderConfig): AiProvider {
  switch (cfg.provider) {
    case "anthropic":
      return new AnthropicProvider(cfg);
    case "openai":
    case "openai-compatible":
      return new OpenAiProvider(cfg);
    case "ollama":
      return new OllamaProvider(cfg);
    default:
      throw new Error(`Unknown AI provider: ${(cfg as { provider: string }).provider}`);
  }
}
