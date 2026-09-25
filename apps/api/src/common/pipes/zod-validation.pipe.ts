import { PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

// A per-parameter Zod validation pipe. Throws ZodError, which the global
// AllExceptionsFilter maps to VALIDATION_ERROR (422).
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}

// Convenience factory for use in @Body(new ZodBody(schema)) style call sites.
export function zodPipe<T>(schema: ZodSchema<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
