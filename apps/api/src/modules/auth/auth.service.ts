import { randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import type {
  Disable2faInput,
  Enable2faInput,
  Login2faInput,
  LoginInput,
  SignupInput,
} from "@bn/shared";
import { ENV_TOKEN, type Env } from "../../config/env";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CryptoService } from "../../infra/crypto/crypto.service";
import { TokenService } from "./token.service";

export interface SessionContext {
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  kind: "tokens";
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}
export interface TwoFactorRequired {
  kind: "2fa";
  challengeToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly crypto: CryptoService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  // ----------------------------------------------------------------
  // Signup
  // ----------------------------------------------------------------
  async signup(input: SignupInput, ctx: SessionContext): Promise<LoginResult> {
    const userCount = await this.prisma.user.count();
    if (userCount > 0 && !this.env.ALLOW_SIGNUP) {
      throw new ForbiddenException("Signups are disabled");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const role = userCount === 0 ? "OWNER" : "MEMBER";

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role,
      },
    });

    return this.issueSession(user, ctx);
  }

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  async login(
    input: LoginInput,
    ctx: SessionContext,
  ): Promise<LoginResult | TwoFactorRequired> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    // Uniform failure to avoid user enumeration.
    if (!user) {
      await argon2
        .verify(
          "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG",
          input.password,
        )
        .catch(() => false);
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.totpEnabled) {
      const challengeToken = await this.tokens.signChallengeToken(user.id);
      return { kind: "2fa", challengeToken };
    }

    return this.issueSession(user, ctx);
  }

  // ----------------------------------------------------------------
  // Login with 2FA (TOTP or recovery code)
  // ----------------------------------------------------------------
  async login2fa(
    input: Login2faInput,
    ctx: SessionContext,
  ): Promise<LoginResult> {
    let userId: string;
    try {
      userId = await this.tokens.verifyChallengeToken(input.challengeToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired challenge token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException("2FA not enabled for this user");
    }

    const code = input.code.trim();
    const secret = this.crypto.decrypt(user.totpSecret);

    // A 6-digit numeric code is treated as TOTP first.
    const isTotpShape = /^\d{6}$/.test(code);
    if (isTotpShape && authenticator.check(code, secret)) {
      return this.issueSession(user, ctx);
    }

    // Otherwise try recovery codes.
    if (user.recoveryCodes.includes(code)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          recoveryCodes: user.recoveryCodes.filter((c) => c !== code),
        },
      });
      return this.issueSession(user, ctx);
    }

    throw new UnauthorizedException("Invalid 2FA code");
  }

  // ----------------------------------------------------------------
  // Refresh with rotation + reuse detection
  // ----------------------------------------------------------------
  async refresh(rawToken: string, ctx: SessionContext): Promise<LoginResult> {
    if (!rawToken) throw new UnauthorizedException("Missing refresh token");
    const hash = this.tokens.hashRefreshToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Reuse detection: a presented-but-revoked token means the token was
    // already rotated. Revoke EVERY session of that user and reject.
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) throw new UnauthorizedException("User no longer exists");

    // Rotate: revoke the old session and mint a fresh one in one transaction.
    const next = this.tokens.createRefreshToken();
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: next.hash,
          userAgent: ctx.userAgent ?? null,
          ip: ctx.ip ?? null,
          expiresAt: this.tokens.refreshExpiry(),
        },
      }),
    ]);

    const access = await this.tokens.signAccessToken(user);
    return {
      kind: "tokens",
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      refreshToken: next.token,
    };
  }

  // ----------------------------------------------------------------
  // Logout: revoke the presented session (if any).
  // ----------------------------------------------------------------
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = this.tokens.hashRefreshToken(rawToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ----------------------------------------------------------------
  // me
  // ----------------------------------------------------------------
  async me(userId: string): Promise<Omit<User, "passwordHash" | "totpSecret" | "recoveryCodes">> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.sanitize(user);
  }

  // ----------------------------------------------------------------
  // 2FA setup / enable / disable
  // ----------------------------------------------------------------
  async setup2fa(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const secret = authenticator.generateSecret();
    // Stash the encrypted secret; it only becomes active on enable().
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: this.crypto.encrypt(secret), totpEnabled: false },
    });
    const otpauthUrl = authenticator.keyuri(
      user.email,
      "bullshit-notes",
      secret,
    );
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  }

  async enable2fa(
    userId: string,
    input: Enable2faInput,
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.totpSecret) {
      throw new ConflictException("Run 2FA setup first");
    }
    const secret = this.crypto.decrypt(user.totpSecret);
    if (!authenticator.check(input.code, secret)) {
      throw new UnauthorizedException("Invalid TOTP code");
    }
    const recoveryCodes = Array.from({ length: 10 }, () =>
      randomBytes(5).toString("hex"),
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, recoveryCodes },
    });
    return { recoveryCodes };
  }

  async disable2fa(userId: string, input: Disable2faInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid password");
    if (!user.totpEnabled || !user.totpSecret) {
      throw new ConflictException("2FA is not enabled");
    }
    const secret = this.crypto.decrypt(user.totpSecret);
    const isTotp = /^\d{6}$/.test(input.code) &&
      authenticator.check(input.code, secret);
    const isRecovery = user.recoveryCodes.includes(input.code);
    if (!isTotp && !isRecovery) {
      throw new UnauthorizedException("Invalid 2FA code");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null, recoveryCodes: [] },
    });
  }

  // ----------------------------------------------------------------
  // Sessions
  // ----------------------------------------------------------------
  async listSessions(userId: string, currentRawToken?: string) {
    const currentHash = currentRawToken
      ? this.tokens.hashRefreshToken(currentRawToken)
      : null;
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      current: currentHash != null && s.refreshTokenHash === currentHash,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException("Session not found");
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  private async issueSession(
    user: User,
    ctx: SessionContext,
  ): Promise<LoginResult> {
    const refresh = this.tokens.createRefreshToken();
    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: refresh.hash,
          userAgent: ctx.userAgent ?? null,
          ip: ctx.ip ?? null,
          expiresAt: this.tokens.refreshExpiry(),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);
    const access = await this.tokens.signAccessToken(user);
    return {
      kind: "tokens",
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
    };
  }

  private sanitize(user: User) {
    const { passwordHash: _p, totpSecret: _t, recoveryCodes: _r, ...rest } = user;
    void _p;
    void _t;
    void _r;
    return rest;
  }
}
