import { describe, expect, it } from "vitest";
import {
  parseAnthropicEvent,
  parseOpenAiChunk,
  parseOllamaObject,
  type ParsedEvent,
} from "./parsers";

// Fold a list of parsed events into reconstructed text + usage, the way each
// provider stream loop does.
function fold(events: ParsedEvent[]): {
  text: string;
  input: number;
  output: number;
  done: boolean;
} {
  let text = "";
  let input = 0;
  let output = 0;
  let done = false;
  for (const e of events) {
    if (e.text) text += e.text;
    if (e.inputTokens != null) input = e.inputTokens;
    if (e.outputTokens != null) output = e.outputTokens;
    if (e.done) done = true;
  }
  return { text, input, output, done };
}

describe("Anthropic stream parser", () => {
  // Recorded /v1/messages SSE event objects.
  const fixture = [
    { type: "message_start", message: { usage: { input_tokens: 25 } } },
    { type: "content_block_start", index: 0 },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: ", world" } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 7 } },
    { type: "message_stop" },
  ];

  it("reconstructs text and usage from content_block_delta events", () => {
    const r = fold(fixture.map(parseAnthropicEvent));
    expect(r.text).toBe("Hello, world");
    expect(r.input).toBe(25);
    expect(r.output).toBe(7);
    expect(r.done).toBe(true);
  });
});

describe("OpenAI stream parser", () => {
  // Recorded chat.completions SSE chunk objects (the [DONE] sentinel is handled
  // by the reader, not the parser).
  const fixture = [
    { choices: [{ delta: { role: "assistant" }, finish_reason: null }] },
    { choices: [{ delta: { content: "Hel" }, finish_reason: null }] },
    { choices: [{ delta: { content: "lo!" }, finish_reason: null }] },
    { choices: [{ delta: {}, finish_reason: "stop" }] },
    { choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } },
  ];

  it("reconstructs text from choices[0].delta.content and reads usage", () => {
    const r = fold(fixture.map(parseOpenAiChunk));
    expect(r.text).toBe("Hello!");
    expect(r.input).toBe(12);
    expect(r.output).toBe(3);
    expect(r.done).toBe(true);
  });
});

describe("Ollama stream parser", () => {
  // Recorded /api/chat newline-delimited JSON objects.
  const fixture = [
    { message: { role: "assistant", content: "Hi" }, done: false },
    { message: { role: "assistant", content: " there" }, done: false },
    { message: { role: "assistant", content: "" }, done: true, prompt_eval_count: 9, eval_count: 4 },
  ];

  it("reconstructs text and reads eval counts on the done line", () => {
    const r = fold(fixture.map(parseOllamaObject));
    expect(r.text).toBe("Hi there");
    expect(r.input).toBe(9);
    expect(r.output).toBe(4);
    expect(r.done).toBe(true);
  });
});
