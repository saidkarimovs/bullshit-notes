import { NextResponse } from "next/server";

/**
 * Response envelope helpers shared by every route handler.
 *
 * The frontend `api-client` expects successful responses as
 * `{ data: <payload> }` and errors as `{ error: { code, message, details? } }`.
 * These helpers are the single source of truth for that shape.
 */

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string[] | string>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: STATUS[code] },
  );
}

/** A typed error a handler can throw; `handle()` converts it to an envelope. */
export class HttpError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, string[] | string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Wrap a route handler body so any thrown error becomes a proper envelope
 * instead of a raw 500. Never leaks a stack trace to the client.
 */
export async function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.code, error.message, error.details);
    }
    console.error("[api] unhandled error:", error);
    return fail("INTERNAL_ERROR", "Something went wrong.");
  }
}
