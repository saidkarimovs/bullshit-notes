import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  disable2faSchema,
  enable2faSchema,
  login2faSchema,
  loginSchema,
  signupSchema,
  type Disable2faInput,
  type Enable2faInput,
  type Login2faInput,
  type LoginInput,
  type SignupInput,
} from "@bn/shared";
import { Public } from "../../common/decorators/public.decorator";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService, type SessionContext } from "./auth.service";

const REFRESH_COOKIE = "bn_rt";
const REFRESH_PATH = "/api/auth";

// Rate limit: 5 requests / 60s on all /auth/* routes, keyed by IP.
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ---------------- Signup ----------------
  @Public()
  @Post("signup")
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) body: SignupInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.signup(body, this.ctx(req));
    this.setRefreshCookie(reply, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // ---------------- Login ----------------
  @Public()
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login(body, this.ctx(req));
    if (result.kind === "2fa") {
      return { requires2fa: true as const, challengeToken: result.challengeToken };
    }
    this.setRefreshCookie(reply, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // ---------------- Login 2FA ----------------
  @Public()
  @Post("login/2fa")
  async login2fa(
    @Body(new ZodValidationPipe(login2faSchema)) body: Login2faInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login2fa(body, this.ctx(req));
    this.setRefreshCookie(reply, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // ---------------- Refresh (cookie only) ----------------
  @Public()
  @Post("refresh")
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const raw = this.readRefreshCookie(req);
    const result = await this.auth.refresh(raw ?? "", this.ctx(req));
    this.setRefreshCookie(reply, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  // ---------------- Logout ----------------
  @Public()
  @Post("logout")
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.auth.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(reply);
    return { ok: true };
  }

  // ---------------- Me ----------------
  @Get("me")
  async me(@CurrentUser("id") userId: string) {
    return this.auth.me(userId);
  }

  // ---------------- 2FA setup ----------------
  @Post("2fa/setup")
  async setup2fa(@CurrentUser("id") userId: string) {
    return this.auth.setup2fa(userId);
  }

  @Post("2fa/enable")
  async enable2fa(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(enable2faSchema)) body: Enable2faInput,
  ) {
    return this.auth.enable2fa(userId, body);
  }

  @Post("2fa/disable")
  async disable2fa(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(disable2faSchema)) body: Disable2faInput,
  ) {
    await this.auth.disable2fa(userId, body);
    return { ok: true };
  }

  // ---------------- Sessions ----------------
  @Get("sessions")
  async sessions(
    @CurrentUser("id") userId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.auth.listSessions(userId, this.readRefreshCookie(req));
  }

  @Delete("sessions/:id")
  async revokeSession(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.auth.revokeSession(userId, id);
    return { ok: true };
  }

  // ---------------- cookie / context helpers ----------------
  private ctx(req: FastifyRequest): SessionContext {
    const ua = req.headers["user-agent"];
    return {
      ip: req.ip,
      userAgent: Array.isArray(ua) ? ua[0] : ua,
    };
  }

  private readRefreshCookie(req: FastifyRequest): string | undefined {
    const cookies = (req as FastifyRequest & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_COOKIE];
  }

  private setRefreshCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: REFRESH_PATH,
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  }
}
