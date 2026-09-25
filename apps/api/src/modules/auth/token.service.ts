import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ENV_TOKEN, type Env } from "../../config/env";
import type { AuthUser } from "../../common/decorators/current-user.decorator";

export interface RawRefreshToken {
  token: string; // opaque, sent to client
  hash: string; // stored in DB
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  // ---- Access token (JWT HS256, short lived) ----
  async signAccessToken(user: {
    id: string;
    email: string;
    role: string;
    name: string;
  }): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      { secret: this.env.JWT_SECRET, expiresIn: this.env.JWT_ACCESS_TTL },
    );
    return { accessToken, expiresIn: this.accessTtlSeconds() };
  }

  accessTtlSeconds(): number {
    // Parse "15m" / "3600" / "1h" style.
    const ttl = this.env.JWT_ACCESS_TTL;
    const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
    if (!match) return 900;
    const n = Number(match[1]);
    switch (match[2]) {
      case "s":
        return n;
      case "m":
        return n * 60;
      case "h":
        return n * 3600;
      case "d":
        return n * 86400;
      default:
        return n;
    }
  }

  // ---- 2FA challenge token (5 min, aud "2fa") ----
  async signChallengeToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      { secret: this.env.JWT_SECRET, expiresIn: "5m", audience: "2fa" },
    );
  }

  async verifyChallengeToken(token: string): Promise<string> {
    const claims = await this.jwt.verifyAsync<{ sub: string; aud?: string }>(
      token,
      { secret: this.env.JWT_SECRET, audience: "2fa" },
    );
    return claims.sub;
  }

  // ---- Refresh token (opaque, SHA-256 hashed at rest) ----
  createRefreshToken(): RawRefreshToken {
    const token = randomBytes(48).toString("base64url");
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  refreshExpiry(): Date {
    return new Date(
      Date.now() + this.env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  toAuthUser(u: {
    id: string;
    email: string;
    role: string;
    name: string;
  }): AuthUser {
    return { id: u.id, email: u.email, role: u.role, name: u.name };
  }
}
