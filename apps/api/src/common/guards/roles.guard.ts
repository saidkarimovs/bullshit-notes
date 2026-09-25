import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthUser } from "../decorators/current-user.decorator";

// OWNER outranks ADMIN outranks MEMBER outranks READONLY.
const RANK: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  READONLY: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException("No authenticated user");

    const have = RANK[user.role] ?? 0;
    const min = Math.min(...required.map((r) => RANK[r] ?? Number.MAX_SAFE_INTEGER));
    if (have < min) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
