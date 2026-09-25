export type ApiErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR"
  | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[] | string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { data: T; meta?: Record<string, unknown> };
type ErrorEnvelope = { error?: { code?: ApiErrorCode; message?: string; details?: Record<string, string[] | string> } };
type RequestOptions = { signal?: AbortSignal; headers?: HeadersInit };
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function setAccessToken(token: string | null) { accessToken = token; }

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(base + "/api/auth/refresh", { method: "POST", credentials: "include" });
      if (!response.ok) return null;
      const payload = await response.json() as Envelope<{ accessToken: string }>;
      accessToken = payload.data.accessToken;
      return accessToken;
    })().catch(() => null).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function requestEnvelope<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}, retried = false): Promise<Envelope<T>> {
  const tokenAtStart = accessToken;
  const headers = new Headers(options.headers);
  if (body !== undefined && !(body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (tokenAtStart) headers.set("Authorization", "Bearer " + tokenAtStart);
  const response = await fetch(base + path, {
    method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    credentials: "include", signal: options.signal, cache: "no-store",
  });
  if (!response.ok) {
    let failure: ErrorEnvelope = {};
    try { failure = await response.json() as ErrorEnvelope; } catch { /* empty response */ }
    const code = failure.error?.code ?? "INTERNAL_ERROR";
    const shouldRefresh = response.status === 401 && code === "UNAUTHENTICATED" && !retried && !path.startsWith("/api/auth/");
    if (shouldRefresh) {
      if (accessToken && accessToken !== tokenAtStart) return requestEnvelope<T>(method, path, body, options, true);
      const token = await refreshAccessToken();
      if (token) return requestEnvelope<T>(method, path, body, options, true);
      accessToken = null;
      if (typeof window !== "undefined") window.location.assign("/login");
    }
    throw new ApiError(code, failure.error?.message ?? "Request failed", response.status, failure.error?.details);
  }
  if (response.status === 204) return { data: undefined as T };
  return response.json() as Promise<Envelope<T>>;
}

async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}) {
  const payload = await requestEnvelope<T>(method, path, body, options);
  return payload.data;
}

type ListResult<T> = { items: T[]; meta: Record<string, unknown> };
async function list<T>(path: string, options?: RequestOptions): Promise<ListResult<T>> {
  const payload = await requestEnvelope<T[] | { items: T[] }>("GET", path, undefined, options);
  return { items: Array.isArray(payload.data) ? payload.data : payload.data.items, meta: payload.meta ?? {} };
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; usage?: { input: number; output: number } }
  | { type: "error"; message: string };

export function parseSseChunk(buffer: string): { events: StreamEvent[]; remaining: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const frames = normalized.split("\n\n");
  const remaining = frames.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const frame of frames) {
    const data = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") continue;
    try { events.push(JSON.parse(data) as StreamEvent); } catch { /* malformed event */ }
  }
  return { events, remaining };
}

async function* stream(path: string, body: unknown, options: RequestOptions = {}): AsyncGenerator<StreamEvent> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
  const response = await fetch(base + path, {
    method: "POST", headers, body: JSON.stringify(body), credentials: "include", signal: options.signal,
  });
  if (!response.ok || !response.body) {
    let failure: ErrorEnvelope = {};
    try { failure = await response.json() as ErrorEnvelope; } catch { /* empty response */ }
    throw new ApiError(failure.error?.code ?? "INTERNAL_ERROR", failure.error?.message ?? "Stream failed", response.status, failure.error?.details);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remaining;
      for (const event of parsed.events) yield event;
    }
    buffer += decoder.decode();
    for (const event of parseSseChunk(buffer + "\n\n").events) yield event;
  } finally { reader.releaseLock(); }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
  list,
  stream,
};
