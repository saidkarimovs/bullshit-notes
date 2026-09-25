// Low-level readers over a fetch Response body. One yields SSE `data:` payload
// strings; the other yields newline-delimited JSON lines.

async function* iterateChunks(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

// Yields the string after each "data:" line in an SSE stream.
export async function* readSseData(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
  let buffer = "";
  for await (const chunk of iterateChunks(body)) {
    buffer += chunk;
    let idx: number;
    // SSE events are separated by a blank line; process complete lines.
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      if (line.startsWith("data:")) {
        yield line.slice(5).trim();
      }
    }
  }
  const tail = buffer.trim();
  if (tail.startsWith("data:")) yield tail.slice(5).trim();
}

// Yields each complete newline-delimited JSON line.
export async function* readNdjson(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<string> {
  let buffer = "";
  for await (const chunk of iterateChunks(body)) {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "").trim();
      buffer = buffer.slice(idx + 1);
      if (line) yield line;
    }
  }
  const tail = buffer.trim();
  if (tail) yield tail;
}
