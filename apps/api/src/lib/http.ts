import { HttpException } from "@nestjs/common";

// Every outbound HTTP call gets an explicit timeout. A network / non-2xx
// failure becomes an UPSTREAM_ERROR (HTTP 502) which the global
// AllExceptionsFilter maps to code "UPSTREAM_ERROR" — never a bare 500.

export const DEFAULT_HTTP_TIMEOUT_MS = 10_000;

export class UpstreamError extends HttpException {
  constructor(message: string) {
    super(message, 502);
  }
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_HTTP_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new UpstreamError(`Request to ${hostOf(url)} timed out after ${timeoutMs}ms`);
    }
    throw new UpstreamError(`Request to ${hostOf(url)} failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    const text = await safeText(res);
    throw new UpstreamError(
      `${hostOf(url)} responded ${res.status}${text ? `: ${truncate(text, 300)}` : ""}`,
    );
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new UpstreamError(`${hostOf(url)} returned a non-JSON body`);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
