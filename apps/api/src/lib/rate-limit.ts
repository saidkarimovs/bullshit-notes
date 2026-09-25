import { HttpException } from "@nestjs/common";
import type { Redis } from "ioredis";

// Fixed-window rate limiter backed by Redis. INCR + EXPIRE on first hit.
// Throws HttpException(429) -> mapped to RATE_LIMITED by the global filter.

export class RateLimitExceeded extends HttpException {
  constructor(message = "Rate limit exceeded") {
    super(message, 429);
  }
}

export interface RateLimitResult {
  count: number;
  remaining: number;
  limit: number;
}

/**
 * Increment a fixed-window counter and throw when the limit is exceeded.
 * @param redis   ioredis client
 * @param key     unique bucket key (already namespaced by caller)
 * @param limit   max requests permitted within the window
 * @param windowSec window length in seconds
 */
export async function enforceRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
  message?: string,
): Promise<RateLimitResult> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  if (count > limit) {
    throw new RateLimitExceeded(
      message ?? `Rate limit exceeded: ${limit} requests per ${windowSec}s`,
    );
  }
  return { count, remaining: Math.max(0, limit - count), limit };
}

/** Non-throwing check used where the caller wants to branch on the result. */
export async function peekRateLimit(
  redis: Redis,
  key: string,
): Promise<number> {
  const v = await redis.get(key);
  return v ? parseInt(v, 10) : 0;
}
