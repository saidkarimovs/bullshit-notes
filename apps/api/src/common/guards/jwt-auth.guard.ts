import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import { ENV_TOKEN, type Env } from "../../config/env";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthUser } from "../decorators/current-user.decorator";

interface AccessTokenClaims {
  sub: string;
  email: string;
  role: string;
  name: string;
  aud?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthUser }>();
    const header = req.headers["authorization"];
    if (!header || Array.isArray(header) || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.env.JWT_SECRET,
      });
      // Reject non-access tokens (e.g. the 2fa challenge token).
      if (claims.aud === "2fa") {
        throw new UnauthorizedException("Challenge token cannot access API");
      }
      req.user = {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
        name: claims.name,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
