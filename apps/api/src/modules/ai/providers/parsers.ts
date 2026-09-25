// Pure, provider-specific stream-event parsers. Each takes one already-parsed
// JSON event/object and reports the text delta and/or usage it carries. Kept
// free of any I/O so they can be unit-tested against recorded fixtures.

export interface ParsedEvent {
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  done?: boolean;
}

// --- Anthropic Messages API SSE ---------------------------------------------
// Events: message_start (usage.input_tokens), content_block_delta
// (delta.text), message_delta (usage.output_tokens), message_stop.
export function parseAnthropicEvent(evt: unknown): ParsedEvent {
  const e = evt as Record<string, any>;
  if (!e || typeof e !== "object") return {};
  switch (e.type) {
    case "message_start":
      return { inputTokens: e.message?.usage?.input_tokens };
    case "content_block_delta": {
      const d = e.delta;
      if (d?.type === "text_delta" || typeof d?.text === "string") {
        return { text: d.text ?? "" };
      }
      return {};
    }
    case "message_delta":
      return { outputTokens: e.usage?.output_tokens };
    case "message_stop":
      return { done: true };
    default:
      return {};
  }
}

// --- OpenAI / openai-compatible chat.completions SSE ------------------------
// Chunks: choices[0].delta.content; final chunk may carry usage; the literal
// "[DONE]" terminator is handled by the SSE reader, not here.
export function parseOpenAiChunk(chunk: unknown): ParsedEvent {
  const c = chunk as Record<string, any>;
  if (!c || typeof c !== "object") return {};
  const out: ParsedEvent = {};
  const delta = c.choices?.[0]?.delta;
  if (delta && typeof delta.content === "string") {
    out.text = delta.content;
  }
  if (c.choices?.[0]?.finish_reason) {
    out.done = true;
  }
  if (c.usage) {
    out.inputTokens = c.usage.prompt_tokens;
    out.outputTokens = c.usage.completion_tokens;
  }
  return out;
}

// --- Ollama /api/chat newline-delimited JSON --------------------------------
// Each line: { message: { content }, done, prompt_eval_count, eval_count }.
export function parseOllamaObject(obj: unknown): ParsedEvent {
  const o = obj as Record<string, any>;
  if (!o || typeof o !== "object") return {};
  const out: ParsedEvent = {};
  if (o.message && typeof o.message.content === "string") {
    out.text = o.message.content;
  }
  if (o.done === true) {
    out.done = true;
    out.inputTokens = o.prompt_eval_count;
    out.outputTokens = o.eval_count;
  }
  return out;
}
