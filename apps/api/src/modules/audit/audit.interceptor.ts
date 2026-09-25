import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../infra/prisma/prisma.service";

// Records every non-GET request that succeeds as an append-only AuditLog row.
// action is derived as "<entityType>.<verb>" from method + first path segment.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx
      .switchToHttp()
      .getRequest<
        FastifyRequest & { user?: AuthUser; params?: Record<string, string> }
      >();
    const method = req.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return next.handle();
    }

    const { entityType, entityId, action } = this.describe(req, method);
    const ua = req.headers["user-agent"];
    const userAgent = Array.isArray(ua) ? ua[0] : ua;

    return next.handle().pipe(
      tap((result) => {
        // Only log on success (errors bypass tap's next callback).
        const resolvedId =
          entityId ??
          (result && typeof result === "object" && "id" in result
            ? String((result as Record<string, unknown>).id)
            : null);
        void this.prisma.auditLog
          .create({
            data: {
              actorId: req.user?.id ?? null,
              action,
              entityType,
              entityId: resolvedId,
              ip: req.ip ?? null,
              userAgent: userAgent ?? null,
              metadata: {},
            },
          })
          .catch(() => undefined);
      }),
    );
  }

  private describe(
    req: FastifyRequest & { params?: Record<string, string> },
    method: string,
  ): { entityType: string; entityId: string | null; action: string } {
    // urlPath like /api/reports/:id/status
    const path = req.url.split("?")[0];
    const segments = path.split("/").filter(Boolean);
    // Drop the "api" prefix if present.
    if (segments[0] === "api") segments.shift();
    const entityType = segments[0] ?? "unknown";
    const params = req.params ?? {};
    const entityId = params.id ?? params.projectId ?? null;

    const verb =
      method === "POST"
        ? path.endsWith("/status")
          ? "status"
          : "create"
        : method === "PATCH" || method === "PUT"
          ? "update"
          : method === "DELETE"
            ? "delete"
            : method.toLowerCase();

    return { entityType, entityId, action: `${entityType}.${verb}` };
  }
}
