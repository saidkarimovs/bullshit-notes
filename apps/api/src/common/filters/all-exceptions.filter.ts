import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ApiError, ErrorCode } from "@bn/shared";
import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

interface Mapped {
  status: number;
  code: ErrorCode;
  message: string;
  details?: { field: string; issue: string }[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      this.logger.error(
        `${mapped.code}: ${mapped.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiError = {
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
      },
    };
    void reply.status(mapped.status).send(body);
  }

  private map(exception: unknown): Mapped {
    // Zod validation errors
    if (exception instanceof ZodError) {
      return {
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: exception.issues.map((i) => ({
          field: i.path.join(".") || "(root)",
          issue: i.message,
        })),
      };
    }

    // Prisma known request errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        const target =
          (exception.meta?.target as string[] | string | undefined) ?? "field";
        return {
          status: 409,
          code: "CONFLICT",
          message: `Unique constraint violation on ${
            Array.isArray(target) ? target.join(", ") : target
          }`,
        };
      }
      if (exception.code === "P2025") {
        return {
          status: 404,
          code: "NOT_FOUND",
          message: "Record not found",
        };
      }
    }

    // Nest auth exceptions
    if (exception instanceof UnauthorizedException) {
      return {
        status: 401,
        code: "UNAUTHENTICATED",
        message: exception.message || "Unauthenticated",
      };
    }
    if (exception instanceof ForbiddenException) {
      return {
        status: 403,
        code: "FORBIDDEN",
        message: exception.message || "Forbidden",
      };
    }

    // Generic HttpException: map by status
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === "string"
          ? res
          : ((res as Record<string, unknown>)?.message as string) ??
            exception.message;
      const code = this.codeForStatus(status);
      return { status, code, message: Array.isArray(message) ? message.join("; ") : message };
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case 400:
      case 422:
        return "VALIDATION_ERROR";
      case 401:
        return "UNAUTHENTICATED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 409:
        return "CONFLICT";
      case 429:
        return "RATE_LIMITED";
      case 502:
      case 503:
      case 504:
        return "UPSTREAM_ERROR";
      default:
        return status >= 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR";
    }
  }
}
