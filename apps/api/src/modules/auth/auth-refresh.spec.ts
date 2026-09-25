import { beforeEach, describe, expect, it } from "vitest";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

// In-memory session/user store for AuthService.refresh.
interface FakeSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

function makeFake(user: { id: string; email: string; role: string; name: string }) {
  const sessions: FakeSession[] = [];
  let seq = 0;

  const session = {
    findUnique: async ({ where }: any) =>
      sessions.find((s) => s.refreshTokenHash === where.refreshTokenHash) ??
      null,
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const s of sessions) {
        const userMatch = where.userId ? s.userId === where.userId : true;
        const revokedMatch =
          where.revokedAt === null ? s.revokedAt === null : true;
        if (userMatch && revokedMatch) {
          if (data.revokedAt !== undefined) s.revokedAt = data.revokedAt;
          count++;
        }
      }
      return { count };
    },
    update: async ({ where, data }: any) => {
      const s = sessions.find((x) => x.id === where.id);
      if (!s) throw new Error("session not found");
      Object.assign(s, data);
      return s;
    },
    create: async ({ data }: any) => {
      const s: FakeSession = {
        id: `s${++seq}`,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      sessions.push(s);
      return s;
    },
  };

  const prisma: any = {
    session,
    user: { findUnique: async () => user },
    $transaction: async (arg: any) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg),
  };

  return { prisma, sessions };
}

describe("refresh token rotation and reuse detection", () => {
  const user = { id: "u1", email: "a@b.c", role: "MEMBER", name: "A" };
  const env: any = {
    JWT_SECRET: "test-secret-value-1234567890",
    JWT_ACCESS_TTL: "15m",
    REFRESH_TTL_DAYS: 30,
  };

  let fake: ReturnType<typeof makeFake>;
  let tokens: TokenService;
  let auth: AuthService;

  beforeEach(() => {
    fake = makeFake(user);
    tokens = new TokenService(new JwtService({}), env);
    auth = new AuthService(fake.prisma, tokens, {} as any, env);
  });

  function seedSession(): string {
    const raw = tokens.createRefreshToken();
    fake.sessions.push({
      id: "s0",
      userId: user.id,
      refreshTokenHash: raw.hash,
      userAgent: null,
      ip: null,
      expiresAt: tokens.refreshExpiry(),
      revokedAt: null,
      createdAt: new Date(),
    });
    return raw.token;
  }

  it("rotates: revokes the old session and issues a new refresh token", async () => {
    const oldToken = seedSession();
    const result = await auth.refresh(oldToken, {});

    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(oldToken);
    expect(result.accessToken).toBeTruthy();

    const old = fake.sessions.find((s) => s.id === "s0");
    expect(old?.revokedAt).not.toBeNull();

    const active = fake.sessions.filter((s) => s.revokedAt === null);
    expect(active).toHaveLength(1);
    expect(active[0].refreshTokenHash).toBe(
      tokens.hashRefreshToken(result.refreshToken),
    );
  });

  it("rejects an unknown refresh token", async () => {
    await expect(auth.refresh("not-a-real-token", {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("detects reuse: presenting a revoked token revokes every session", async () => {
    const oldToken = seedSession();
    await auth.refresh(oldToken, {}); // rotates s0 -> s1

    // Present the already-rotated (revoked) token again.
    await expect(auth.refresh(oldToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    // Every session of the user is now revoked.
    const active = fake.sessions.filter((s) => s.revokedAt === null);
    expect(active).toHaveLength(0);
  });
});
